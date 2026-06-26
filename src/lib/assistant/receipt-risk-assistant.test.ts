import assert from "node:assert/strict";
import test from "node:test";

import type { hyperliquid_market_history } from "../hyperliquid/adapter.ts";
import { buildAccountValueTimeline } from "../history/account-value-timeline.ts";
import { buildReceiptAccountValueContext } from "../history/receipt-account-value-context.ts";
import { buildMarketContext } from "../market/market-context.ts";
import { loadFixtureAccount } from "../perps/fixtures.ts";
import type { normalized_account_snapshot } from "../perps/types.ts";
import { createRiskReceipt } from "../receipts/receipt.ts";
import { buildReceiptChangeSummary } from "../receipts/receipt-change-summary.ts";
import { buildReceiptMarketRegime } from "../receipts/receipt-market-regime.ts";
import { buildReceiptMarketRegimeDrilldown } from "../receipts/receipt-market-regime-drilldown.ts";
import { compareReceiptRiskDrivers } from "../receipts/receipt-risk-driver-comparison.ts";
import { buildReceiptRecheckWatchlist } from "../receipts/receipt-recheck-watchlist.ts";
import { buildReceiptVolatilityBuffer } from "../receipts/receipt-volatility-buffer.ts";
import { compareSnapshots } from "../receipts/snapshot-comparison.ts";
import {
  answerReceiptRiskQuestion,
  getReceiptRiskAssistantSuggestions,
  type receipt_risk_assistant_context,
} from "./receipt-risk-assistant.ts";

async function buildAssistantContext(input?: {
  receiptSnapshot?: normalized_account_snapshot;
  currentSnapshot?: normalized_account_snapshot;
  includeAccountHistory?: boolean;
  includeVolatilityBuffer?: boolean;
  hashVerified?: boolean;
}): Promise<receipt_risk_assistant_context> {
  const receiptSnapshot =
    input?.receiptSnapshot ?? loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = input?.currentSnapshot ?? receiptSnapshot;
  const comparison = compareSnapshots({ receiptSnapshot, currentSnapshot });
  const marketContext = buildMarketContext(comparison);
  const riskDriverComparison = compareReceiptRiskDrivers({
    savedSnapshot: receiptSnapshot,
    currentSnapshot,
  });
  const volatilityBuffer = input?.includeVolatilityBuffer
    ? buildReceiptVolatilityBuffer({
        marketContext,
        histories: [buildEthHistory()],
        fetchedAtIso: "2026-06-26T00:00:00.000Z",
        windowHours: 24,
        interval: "1h",
      })
    : null;
  const accountValueContext = input?.includeAccountHistory
    ? buildReceiptAccountValueContext({
        receipt_data_time_iso: receiptSnapshot.data_time_iso,
        receipt_account_value_usd: receiptSnapshot.account_value_usd,
        timelines: [
          buildAccountValueTimeline({
            window_id: "perpWeek",
            points: [
              {
                time_ms: Date.parse(receiptSnapshot.data_time_iso),
                account_value_usd: receiptSnapshot.account_value_usd,
              },
              {
                time_ms: Date.parse(receiptSnapshot.data_time_iso) + 60_000,
                account_value_usd: receiptSnapshot.account_value_usd * 1.03,
              },
            ],
          }),
        ],
      })
    : null;
  const recheckWatchlist = buildReceiptRecheckWatchlist({
    marketContext,
    riskDriverComparison,
    volatilityBuffer,
  });
  const marketRegime = buildReceiptMarketRegime({
    accountValueContext,
    comparison,
    marketContext,
    riskDriverComparison,
    volatilityBuffer,
    watchlist: recheckWatchlist,
  });
  const marketRegimeDrilldown = buildReceiptMarketRegimeDrilldown({
    comparison,
    marketContext,
    riskDriverComparison,
    volatilityBuffer,
    watchlist: recheckWatchlist,
  });

  return {
    receipt: await createRiskReceipt(receiptSnapshot),
    comparison,
    marketContext,
    accountValueContext,
    hashVerified: input?.hashVerified ?? true,
    riskDriverComparison,
    recheckWatchlist,
    marketRegime,
    marketRegimeDrilldown,
    volatilityBuffer,
    changeSummary: buildReceiptChangeSummary({
      comparison,
      marketContext,
      accountValueContext,
    }),
  };
}

function buildEthHistory(input?: {
  closePrices?: [number, number];
  highPriceUsd?: number;
  lowPriceUsd?: number;
}): hyperliquid_market_history {
  const closePrices = input?.closePrices ?? [2_500, 2_400];

  return {
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
        open_price_usd: closePrices[0],
        high_price_usd: input?.highPriceUsd ?? 2_650,
        low_price_usd: input?.lowPriceUsd ?? 2_100,
        close_price_usd: closePrices[0],
        volume_base: 100,
        trade_count: 10,
      },
      {
        open_time_ms: Date.parse("2026-06-25T23:00:00.000Z"),
        close_time_ms: Date.parse("2026-06-25T23:59:59.999Z"),
        market: "ETH-PERP",
        interval: "1h",
        open_price_usd: closePrices[0],
        high_price_usd: input?.highPriceUsd ?? 2_650,
        low_price_usd: input?.lowPriceUsd ?? 2_100,
        close_price_usd: closePrices[1],
        volume_base: 140,
        trade_count: 12,
      },
    ],
    funding: [],
  };
}

test("summarizes receipt recheck with receipt-specific citations", async () => {
  const context = await buildAssistantContext();
  const response = answerReceiptRiskQuestion({
    context,
    question: "summarize this receipt",
  });

  assert.match(response.answer, /receipt/i);
  assert.match(response.answer, /live recheck/i);
  assert.ok(response.citations.includes("receipt_change_summary.headline"));
  assert.ok(response.citations.includes("receipt.snapshot_hash"));
});

test("refuses trade recommendations while explaining receipt signals", async () => {
  const context = await buildAssistantContext();
  const response = answerReceiptRiskQuestion({
    context,
    question: "Should I increase leverage?",
  });

  assert.match(response.answer, /cannot recommend trades/i);
  assert.match(response.answer, /Saved risk score/i);
  assert.ok(response.citations.includes("market_context.headline"));
});

test("answers review questions without treating them as trade advice", async () => {
  const context = await buildAssistantContext();
  const response = answerReceiptRiskQuestion({
    context,
    question: "What should I review in this receipt?",
  });

  assert.match(response.answer, /Review this receipt as/);
  assert.match(response.answer, /Risk-driver read:/);
  assert.doesNotMatch(response.answer, /cannot recommend trades/i);
  assert.ok(response.citations.includes("receipt_change_summary.review_points"));
  assert.ok(
    response.citations.includes("receipt_risk_driver_comparison.headline"),
  );
});

test("does not confuse market review words with trade intent", async () => {
  const context = await buildAssistantContext();
  const openInterestResponse = answerReceiptRiskQuestion({
    context,
    question: "What changed in open interest?",
  });
  const liquidationResponse = answerReceiptRiskQuestion({
    context,
    question: "Is anything close to liquidation?",
  });

  assert.match(openInterestResponse.answer, /descriptive market context/i);
  assert.match(liquidationResponse.answer, /liquidation/i);
  assert.doesNotMatch(openInterestResponse.answer, /cannot recommend trades/i);
  assert.doesNotMatch(liquidationResponse.answer, /cannot recommend trades/i);
});

test("explains hash verification scope", async () => {
  const context = await buildAssistantContext({ hashVerified: true });
  const response = answerReceiptRiskQuestion({
    context,
    question: "What does the snapshot hash prove?",
  });

  assert.match(response.answer, /Hash verification is passing/);
  assert.match(response.answer, /does not prove Hyperliquid's external data/);
  assert.ok(response.citations.includes("receipt_verification.matches"));
});

test("answers account history questions only from loaded context", async () => {
  const context = await buildAssistantContext({ includeAccountHistory: true });
  const response = answerReceiptRiskQuestion({
    context,
    question: "How does account value history change this?",
  });

  assert.match(response.answer, /Latest sampled account value/);
  assert.match(response.answer, /sampled context/);
  assert.ok(
    response.citations.includes(
      "receipt_account_value_context.latest_vs_receipt_percent",
    ),
  );
});

test("explains when account history is not loaded", async () => {
  const context = await buildAssistantContext();
  const response = answerReceiptRiskQuestion({
    context,
    question: "What does the portfolio sample say?",
  });

  assert.match(response.answer, /has not loaded/);
  assert.deepEqual(response.citations, ["receipt_account_value_context"]);
});

test("surfaces funding deltas from receipt and live recheck", async () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = {
    ...receiptSnapshot,
    positions: receiptSnapshot.positions.map((position) => ({
      ...position,
      funding_8h_bps_user_perspective:
        position.funding_8h_bps_user_perspective + 3,
    })),
  } satisfies normalized_account_snapshot;
  const context = await buildAssistantContext({
    receiptSnapshot,
    currentSnapshot,
  });
  const response = answerReceiptRiskQuestion({
    context,
    question: "What changed around funding carry?",
  });

  assert.match(response.answer, /Receipt daily funding/);
  assert.match(response.answer, /Market-context total daily funding delta/);
  assert.ok(
    response.citations.includes(
      "market_context.total_daily_funding_delta_usd",
    ),
  );
});

test("answers risk-driver questions from the receipt driver comparison", async () => {
  const context = await buildAssistantContext();
  const response = answerReceiptRiskQuestion({
    context,
    question: "Which risk drivers changed since the receipt?",
  });

  assert.match(response.answer, /Saved top driver/);
  assert.match(response.answer, /Current top driver/);
  assert.match(response.answer, /Top score delta/);
  assert.match(response.answer, /heuristic driver attribution/i);
  assert.ok(
    response.citations.includes(
      "receipt_risk_driver_comparison.top_driver_score_delta",
    ),
  );
  assert.ok(
    response.citations.includes("receipt_risk_driver_comparison.review_points"),
  );
});

test("answers inspect-first questions from the recheck watchlist", async () => {
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
  const context = await buildAssistantContext({
    receiptSnapshot,
    currentSnapshot,
  });
  const response = answerReceiptRiskQuestion({
    context,
    question: "What should I inspect first?",
  });

  assert.match(response.answer, /High-attention receipt recheck cues/i);
  assert.match(response.answer, /Counts:/);
  assert.match(response.answer, /ETH-PERP/);
  assert.match(response.answer, /Review:/);
  assert.match(response.answer, /not a trading recommendation/i);
  assert.ok(
    response.citations.includes("receipt_recheck_watchlist.high_count"),
  );
  assert.ok(
    response.citations.some((citation) =>
      citation.startsWith("receipt_recheck_watchlist.items."),
    ),
  );
});

test("answers volatility-buffer questions from loaded public history context", async () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = {
    ...receiptSnapshot,
    positions: receiptSnapshot.positions.map((position) => ({
      ...position,
      mark_price_usd: 2_400,
    })),
  } satisfies normalized_account_snapshot;
  const context = await buildAssistantContext({
    receiptSnapshot,
    currentSnapshot,
    includeVolatilityBuffer: true,
  });
  const response = answerReceiptRiskQuestion({
    context,
    question: "What does the volatility buffer say?",
  });

  assert.match(response.answer, /public 24h range/i);
  assert.match(response.answer, /Current listed buffer: 12\.50%/);
  assert.match(response.answer, /Public 24h range: 22\.92%/);
  assert.match(response.answer, /Hourly ATR:/);
  assert.match(response.answer, /not a liquidation alert/i);
  assert.ok(
    response.citations.includes("receipt_volatility_buffer.high_count"),
  );
  assert.ok(
    response.citations.includes(
      "receipt_volatility_buffer.rows.ETH-PERP.high_low_range_percent",
    ),
  );
});

test("answers market-regime questions from the synthesized regime context", async () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = {
    ...receiptSnapshot,
    positions: receiptSnapshot.positions.map((position) => ({
      ...position,
      mark_price_usd: 2_400,
    })),
  } satisfies normalized_account_snapshot;
  const context = await buildAssistantContext({
    receiptSnapshot,
    currentSnapshot,
    includeVolatilityBuffer: true,
  });
  const response = answerReceiptRiskQuestion({
    context,
    question: "What market regime is this receipt in?",
  });

  assert.match(response.answer, /market regime/i);
  assert.match(response.answer, /Regime label: stress/);
  assert.match(response.answer, /Focus market: ETH-PERP/);
  assert.match(response.answer, /Counts: 0 critical/);
  assert.match(response.answer, /not a forecast/i);
  assert.ok(response.citations.includes("receipt_market_regime.label"));
  assert.ok(
    response.citations.includes("receipt_market_regime.critical_count"),
  );
  assert.ok(
    response.citations.some((citation) =>
      citation.startsWith("receipt_market_regime.signals."),
    ),
  );
});

test("answers per-market regime drilldown questions from row context", async () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = {
    ...receiptSnapshot,
    positions: receiptSnapshot.positions.map((position) => ({
      ...position,
      mark_price_usd: 2_400,
    })),
  } satisfies normalized_account_snapshot;
  const context = await buildAssistantContext({
    receiptSnapshot,
    currentSnapshot,
    includeVolatilityBuffer: true,
  });
  const response = answerReceiptRiskQuestion({
    context,
    question: "Which markets caused this regime?",
  });

  assert.match(response.answer, /Per-market regime rows/i);
  assert.match(response.answer, /Focus market: ETH-PERP/);
  assert.match(response.answer, /Current listed buffer:/);
  assert.match(response.answer, /Funding burden:/);
  assert.match(response.answer, /not forecasts/i);
  assert.ok(
    response.citations.includes(
      "receipt_market_regime_drilldown.rows.ETH-PERP.severity",
    ),
  );
  assert.ok(
    response.citations.includes(
      "receipt_market_regime_drilldown.rows.ETH-PERP.current_funding_burden_bps",
    ),
  );
});

test("explains when the watchlist has no ranked items", async () => {
  const context = await buildAssistantContext();
  const response = answerReceiptRiskQuestion({
    context,
    question: "Show the recheck watchlist priority",
  });

  assert.match(response.answer, /No ranked watchlist items/);
  assert.match(response.answer, /not a trading recommendation/i);
  assert.ok(
    response.citations.includes("receipt_recheck_watchlist.summary"),
  );
});

test("answers market-specific driver drilldown questions", async () => {
  const context = await buildAssistantContext();
  const response = answerReceiptRiskQuestion({
    context,
    question: "Why is ETH-PERP the current risk driver?",
  });

  assert.match(response.answer, /ETH-PERP/);
  assert.match(response.answer, /Saved row: score/);
  assert.match(response.answer, /Current row: score/);
  assert.match(response.answer, /Market context row:/);
  assert.match(response.answer, /Mark move:/);
  assert.match(response.answer, /Open interest:/);
  assert.match(response.answer, /Score delta/);
  assert.match(response.answer, /per-market drilldown/i);
  assert.ok(
    response.citations.includes(
      "receipt_risk_driver_comparison.market_changes.ETH-PERP.driver_score_delta",
    ),
  );
  assert.ok(
    response.citations.includes(
      "market_context.positions.ETH-PERP.mark_price_usd",
    ),
  );
  assert.ok(
    response.citations.includes(
      "market_context.positions.ETH-PERP.open_interest_usd",
    ),
  );
});

test("explains when a named market changed position state", async () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = {
    ...receiptSnapshot,
    positions: receiptSnapshot.positions.map((position) => ({
      ...position,
      size: position.size * 2,
    })),
  } satisfies normalized_account_snapshot;
  const context = await buildAssistantContext({ receiptSnapshot, currentSnapshot });
  const response = answerReceiptRiskQuestion({
    context,
    question: "What changed for ETH?",
  });

  assert.match(response.answer, /ETH-PERP has a different side or size/);
  assert.match(
    response.answer,
    /historical rather than the same live risk object/,
  );
  assert.match(response.answer, /Market context row: Position state changed/);
  assert.match(response.answer, /Notional delta/);
  assert.ok(
    response.citations.includes(
      "receipt_risk_driver_comparison.market_changes.ETH-PERP.status",
    ),
  );
});

test("suggestions include account history only when context exists", async () => {
  const withoutHistory = getReceiptRiskAssistantSuggestions(
    await buildAssistantContext(),
  );
  const withHistory = getReceiptRiskAssistantSuggestions(
    await buildAssistantContext({ includeAccountHistory: true }),
  );

  assert.equal(
    withoutHistory.some((suggestion) => suggestion.id === "drivers"),
    true,
  );
  assert.equal(
    withoutHistory.some((suggestion) => suggestion.id === "watchlist"),
    true,
  );
  assert.equal(
    withoutHistory.some((suggestion) => suggestion.id === "regime"),
    true,
  );
  assert.equal(
    withoutHistory.some((suggestion) => suggestion.id === "regime-rows"),
    true,
  );
  assert.equal(
    withoutHistory.some((suggestion) => suggestion.id === "top-driver-market"),
    true,
  );
  assert.equal(
    withoutHistory.some((suggestion) => suggestion.id === "volatility"),
    false,
  );
  assert.equal(
    withoutHistory.some((suggestion) => suggestion.id === "history"),
    false,
  );
  assert.equal(
    getReceiptRiskAssistantSuggestions(
      await buildAssistantContext({ includeVolatilityBuffer: true }),
    ).some((suggestion) => suggestion.id === "volatility"),
    true,
  );
  assert.equal(
    withHistory.some((suggestion) => suggestion.id === "history"),
    true,
  );
});
