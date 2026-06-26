import assert from "node:assert/strict";
import test from "node:test";

import { answerReceiptRiskQuestion } from "../assistant/receipt-risk-assistant.ts";
import type { hyperliquid_market_history } from "../hyperliquid/adapter.ts";
import { buildMarketContext } from "../market/market-context.ts";
import { loadFixtureAccount } from "../perps/fixtures.ts";
import type { normalized_account_snapshot } from "../perps/types.ts";
import { createRiskReceipt } from "./receipt.ts";
import { buildReceiptChangeSummary } from "./receipt-change-summary.ts";
import { compareReceiptRiskDrivers } from "./receipt-risk-driver-comparison.ts";
import { buildReceiptRecheckWatchlist } from "./receipt-recheck-watchlist.ts";
import { buildReceiptReviewPacket } from "./receipt-review-packet.ts";
import { buildReceiptVolatilityBuffer } from "./receipt-volatility-buffer.ts";
import { compareSnapshots } from "./snapshot-comparison.ts";

const ethHistory = {
  market: "ETH-PERP",
  coin: "ETH",
  interval: "1h",
  start_time_ms: Date.parse("2026-06-25T00:00:00.000Z"),
  end_time_ms: Date.parse("2026-06-26T00:00:00.000Z"),
  candles: [
    {
      open_time_ms: Date.parse("2026-06-25T00:00:00.000Z"),
      close_time_ms: Date.parse("2026-06-25T00:59:59.999Z"),
      market: "ETH-PERP",
      interval: "1h",
      open_price_usd: 2_500,
      high_price_usd: 2_650,
      low_price_usd: 2_100,
      close_price_usd: 2_500,
      volume_base: 100,
      trade_count: 10,
    },
    {
      open_time_ms: Date.parse("2026-06-25T23:00:00.000Z"),
      close_time_ms: Date.parse("2026-06-25T23:59:59.999Z"),
      market: "ETH-PERP",
      interval: "1h",
      open_price_usd: 2_500,
      high_price_usd: 2_650,
      low_price_usd: 2_100,
      close_price_usd: 2_400,
      volume_base: 130,
      trade_count: 12,
    },
  ],
  funding: [],
} satisfies hyperliquid_market_history;

async function buildPacket(input?: {
  currentSnapshot?: normalized_account_snapshot;
  receiptSnapshot?: normalized_account_snapshot;
  withVolatilityBuffer?: boolean;
}) {
  const receiptSnapshot =
    input?.receiptSnapshot ?? loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = input?.currentSnapshot ?? receiptSnapshot;
  const receipt = await createRiskReceipt(receiptSnapshot);
  const comparison = compareSnapshots({ receiptSnapshot, currentSnapshot });
  const marketContext = buildMarketContext(comparison);
  const riskDriverComparison = compareReceiptRiskDrivers({
    savedSnapshot: receiptSnapshot,
    currentSnapshot,
  });
  const watchlist = buildReceiptRecheckWatchlist({
    marketContext,
    riskDriverComparison,
  });
  const volatilityBuffer = input?.withVolatilityBuffer
    ? buildReceiptVolatilityBuffer({
        marketContext,
        histories: [ethHistory],
        fetchedAtIso: "2026-06-26T00:00:00.000Z",
        windowHours: 24,
        interval: "1h",
      })
    : null;
  const changeSummary = buildReceiptChangeSummary({
    comparison,
    marketContext,
    accountValueContext: null,
  });
  const watchlistAssistantResponse = answerReceiptRiskQuestion({
    context: {
      receipt,
      comparison,
      marketContext,
      changeSummary,
      riskDriverComparison,
      recheckWatchlist: watchlist,
      hashVerified: true,
    },
    question: "What should I inspect first in the recheck watchlist?",
  });

  return buildReceiptReviewPacket({
    receipt,
    comparison,
    marketContext,
    changeSummary,
    riskDriverComparison,
    volatilityBuffer,
    watchlist,
    watchlistAssistantResponse,
    hashVerified: true,
  });
}

test("builds a copyable markdown packet with receipt, watchlist, assistant, and market context", async () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = {
    ...receiptSnapshot,
    positions: receiptSnapshot.positions.map((position) => ({
      ...position,
      mark_price_usd: 2_200,
      funding_8h_bps_user_perspective:
        position.funding_8h_bps_user_perspective + 8,
      open_interest_usd: (position.open_interest_usd ?? 0) + 100_000_000,
    })),
  } satisfies normalized_account_snapshot;
  const packet = await buildPacket({
    receiptSnapshot,
    currentSnapshot,
    withVolatilityBuffer: true,
  });

  assert.match(packet.title, /Review packet/);
  assert.match(packet.summary, /receipt recheck cues/i);
  assert.match(packet.markdown, /## receipt/);
  assert.match(packet.markdown, /snapshot hash: 0x/);
  assert.match(packet.markdown, /hash verification: verified on this page/);
  assert.match(packet.markdown, /## risk drivers since receipt/);
  assert.match(packet.markdown, /## volatility buffer/);
  assert.match(packet.markdown, /24h range:/);
  assert.match(packet.markdown, /## recheck watchlist/);
  assert.match(packet.markdown, /\[high\] ETH-PERP/);
  assert.match(packet.markdown, /## review thresholds/);
  assert.match(packet.markdown, /thin listed buffer: 5\.00%/);
  assert.match(packet.markdown, /open-interest delta: \$50,000,000\.00/);
  assert.match(packet.markdown, /## assistant read/);
  assert.match(packet.markdown, /receipt_recheck_watchlist.high_count/);
  assert.match(packet.markdown, /## market context/);
  assert.match(packet.markdown, /mark:/);
});

test("keeps the packet descriptive and points to full bundles for hash recomputation", async () => {
  const packet = await buildPacket();

  assert.match(packet.markdown, /No trading, order placement/);
  assert.match(packet.markdown, /not Hyperliquid official risk calculations/);
  assert.match(packet.markdown, /Use a full portable receipt bundle/);
  assert.doesNotMatch(packet.markdown, /should close/i);
  assert.doesNotMatch(packet.markdown, /should increase/i);
});
