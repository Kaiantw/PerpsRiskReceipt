import assert from "node:assert/strict";
import test from "node:test";

import { answerReceiptRiskQuestion } from "../assistant/receipt-risk-assistant.ts";
import type { hyperliquid_market_history } from "../hyperliquid/adapter.ts";
import { buildMarketContext } from "../market/market-context.ts";
import { loadFixtureAccount } from "../perps/fixtures.ts";
import type { normalized_account_snapshot } from "../perps/types.ts";
import { createRiskReceipt } from "./receipt.ts";
import { buildReceiptChangeSummary } from "./receipt-change-summary.ts";
import { buildReceiptMarketRegime } from "./receipt-market-regime.ts";
import { buildReceiptMarketRegimeDrilldown } from "./receipt-market-regime-drilldown.ts";
import {
  buildReceiptRecheckHistorySummary,
  type receipt_recheck_history_entry,
  type receipt_recheck_history_summary,
} from "./receipt-recheck-history.ts";
import { compareReceiptRiskDrivers } from "./receipt-risk-driver-comparison.ts";
import { buildReceiptRecheckWatchlist } from "./receipt-recheck-watchlist.ts";
import { buildReceiptReviewPacket } from "./receipt-review-packet.ts";
import { buildReceiptSnapshotDrift } from "./receipt-snapshot-drift.ts";
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
  recheckHistorySummary?: receipt_recheck_history_summary;
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
  const volatilityBuffer = input?.withVolatilityBuffer
    ? buildReceiptVolatilityBuffer({
        marketContext,
        histories: [ethHistory],
        fetchedAtIso: "2026-06-26T00:00:00.000Z",
        windowHours: 24,
        interval: "1h",
      })
    : null;
  const watchlist = buildReceiptRecheckWatchlist({
    marketContext,
    riskDriverComparison,
    volatilityBuffer,
  });
  const snapshotDrift = buildReceiptSnapshotDrift({
    comparison,
    currentDataTimeIso: currentSnapshot.data_time_iso,
    marketContext,
    receiptDataTimeIso: receiptSnapshot.data_time_iso,
    watchlist,
  });
  const changeSummary = buildReceiptChangeSummary({
    comparison,
    marketContext,
    accountValueContext: null,
  });
  const marketRegime = buildReceiptMarketRegime({
    accountValueContext: null,
    comparison,
    marketContext,
    riskDriverComparison,
    volatilityBuffer,
    watchlist,
  });
  const marketRegimeDrilldown = buildReceiptMarketRegimeDrilldown({
    comparison,
    marketContext,
    riskDriverComparison,
    volatilityBuffer,
    watchlist,
  });
  const watchlistAssistantResponse = answerReceiptRiskQuestion({
    context: {
      receipt,
      comparison,
      marketContext,
      changeSummary,
      riskDriverComparison,
      recheckWatchlist: watchlist,
      marketRegime,
      marketRegimeDrilldown,
      volatilityBuffer,
      hashVerified: true,
    },
    question: "What should I inspect first in the recheck watchlist?",
  });

  return buildReceiptReviewPacket({
    receipt,
    comparison,
    marketContext,
    marketRegime,
    marketRegimeDrilldown,
    recheckHistorySummary: input?.recheckHistorySummary ?? null,
    changeSummary,
    snapshotDrift,
    riskDriverComparison,
    volatilityBuffer,
    watchlist,
    watchlistAssistantResponse,
    hashVerified: true,
  });
}

function buildHistoryEntry(input: {
  currentRiskLabel?: receipt_recheck_history_entry["current_risk_label"];
  currentRiskScore: number;
  driftLabel?: receipt_recheck_history_entry["snapshot_drift_label"];
  driftScore?: number;
  focusMarket?: string;
  id: string;
  marketRegimeLabel?: receipt_recheck_history_entry["market_regime_label"];
  marketRegimeSeverity?: receipt_recheck_history_entry["market_regime_severity"];
  recheckedAtIso: string;
  topCue?: string;
  volatilityLoaded?: boolean;
  watchlistHighCount?: number;
}) {
  return {
    id: input.id,
    receipt_id: "rr_packet_history",
    rechecked_at_iso: input.recheckedAtIso,
    current_data_time_iso: input.recheckedAtIso,
    current_freshness: "live",
    comparison_status: "market_moved",
    comparison_headline: "Saved packet recheck row",
    changed_position_count: 0,
    max_abs_mark_price_change_percent: 4.2,
    current_risk_score: input.currentRiskScore,
    current_risk_label: input.currentRiskLabel ?? "medium",
    current_account_value_usd: 10_000,
    current_margin_usage_bps: 4_200,
    current_total_notional_usd: 25_000,
    current_min_liquidation_distance_bps: 850,
    current_daily_funding_usd: 18,
    market_regime_label: input.marketRegimeLabel ?? "active",
    market_regime_severity: input.marketRegimeSeverity ?? "watch",
    market_regime_focus_market: input.focusMarket ?? "ETH-PERP",
    market_regime_high_count: 1,
    market_regime_watch_count: 1,
    market_regime_info_count: 0,
    watchlist_label: "watch_items_loaded",
    watchlist_high_count: input.watchlistHighCount ?? 0,
    watchlist_watch_count: 1,
    watchlist_info_count: 0,
    watchlist_item_count: 1,
    top_drilldown_market: input.focusMarket ?? "ETH-PERP",
    top_drilldown_severity: input.marketRegimeSeverity ?? "watch",
    top_drilldown_primary_cue:
      input.topCue ?? "Listed buffer tightened on the latest recheck",
    top_drilldown_summary: "Compact row summary for packet test.",
    top_drilldown_current_liquidation_distance_bps: 850,
    top_drilldown_current_funding_burden_bps: 6,
    snapshot_drift_age_minutes: 120,
    snapshot_drift_focus_market: input.focusMarket ?? "ETH-PERP",
    snapshot_drift_label: input.driftLabel ?? "drift_watch",
    snapshot_drift_score: input.driftScore ?? 44,
    volatility_loaded: input.volatilityLoaded ?? false,
  } satisfies receipt_recheck_history_entry;
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
  assert.match(packet.markdown, /## snapshot drift/);
  assert.match(packet.markdown, /drift score:/);
  assert.match(packet.markdown, /current min listed buffer:/);
  assert.match(packet.markdown, /## market regime/);
  assert.match(packet.markdown, /label: stress/);
  assert.match(packet.markdown, /counts: 0 critical/);
  assert.match(packet.markdown, /Public volatility is large versus listed buffer/);
  assert.match(packet.markdown, /## regime by market/);
  assert.match(packet.markdown, /ETH-PERP: Public 24h range exceeds current listed buffer/);
  assert.match(packet.markdown, /funding burden:/);
  assert.match(packet.markdown, /## risk drivers since receipt/);
  assert.match(packet.markdown, /## volatility buffer/);
  assert.match(packet.markdown, /24h range:/);
  assert.match(packet.markdown, /## recheck watchlist/);
  assert.match(packet.markdown, /\[high\] ETH-PERP/);
  assert.match(packet.markdown, /Public 24h range exceeds current listed buffer/);
  assert.match(packet.markdown, /## review thresholds/);
  assert.match(packet.markdown, /thin listed buffer: 5\.00%/);
  assert.match(packet.markdown, /open-interest delta: \$50,000,000\.00/);
  assert.match(packet.markdown, /## assistant read/);
  assert.match(packet.markdown, /receipt_recheck_watchlist.high_count/);
  assert.match(packet.markdown, /## market context/);
  assert.match(packet.markdown, /mark:/);
});

test("includes compact local recheck history when a summary is provided", async () => {
  const recheckHistorySummary = buildReceiptRecheckHistorySummary([
    buildHistoryEntry({
      currentRiskScore: 34,
      currentRiskLabel: "medium",
      id: "older",
      marketRegimeLabel: "active",
      marketRegimeSeverity: "watch",
      driftLabel: "close_snapshot",
      driftScore: 22,
      recheckedAtIso: "2026-06-26T00:01:00.000Z",
    }),
    buildHistoryEntry({
      currentRiskScore: 72,
      currentRiskLabel: "high",
      id: "newer",
      marketRegimeLabel: "stress",
      marketRegimeSeverity: "high",
      driftLabel: "stale_snapshot",
      driftScore: 81,
      recheckedAtIso: "2026-06-26T00:03:00.000Z",
      topCue: "Public 24h range exceeds current buffer",
      volatilityLoaded: true,
      watchlistHighCount: 2,
    }),
  ]);
  const packet = await buildPacket({ recheckHistorySummary });

  assert.match(packet.markdown, /## local recheck history/);
  assert.match(packet.markdown, /trend: risk higher/);
  assert.match(packet.markdown, /saved checks: 2/);
  assert.match(packet.markdown, /latest risk: 72 \(high\)/);
  assert.match(packet.markdown, /oldest risk: 34 \(medium\)/);
  assert.match(packet.markdown, /risk-score delta: \+38/);
  assert.match(packet.markdown, /latest snapshot drift: 81\/100/);
  assert.match(packet.markdown, /oldest snapshot drift: 22\/100/);
  assert.match(packet.markdown, /snapshot-drift delta: \+59/);
  assert.match(packet.markdown, /regime: active -> stress/);
  assert.match(packet.markdown, /repeated focus market: ETH-PERP \(2\/2 saved checks\)/);
  assert.match(packet.markdown, /latest watchlist counts: 2 high, 1 watch, 0 info/);
  assert.match(packet.markdown, /volatility context: loaded in 1 of 2 saved rows/);
  assert.match(packet.markdown, /compact browser-local trend only/);
  assert.doesNotMatch(packet.markdown, /newer/);
  assert.doesNotMatch(packet.markdown, /older/);
});

test("keeps the packet descriptive and points to full bundles for hash recomputation", async () => {
  const packet = await buildPacket();

  assert.match(packet.markdown, /No trading, order placement/);
  assert.match(packet.markdown, /not Hyperliquid official risk calculations/);
  assert.match(packet.markdown, /Use a full portable receipt bundle/);
  assert.doesNotMatch(packet.markdown, /## local recheck history/);
  assert.doesNotMatch(packet.markdown, /should close/i);
  assert.doesNotMatch(packet.markdown, /should increase/i);
});
