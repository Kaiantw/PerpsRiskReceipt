import assert from "node:assert/strict";
import test from "node:test";

import type { hyperliquid_market_history } from "../hyperliquid/adapter.ts";
import { buildMarketContext } from "../market/market-context.ts";
import { loadFixtureAccount } from "../perps/fixtures.ts";
import type {
  account_snapshot_input,
  normalized_account_snapshot,
} from "../perps/types.ts";
import { normalizeAccountSnapshot } from "../risk/risk-engine.ts";
import { buildReceiptMarketRegime } from "./receipt-market-regime.ts";
import { buildReceiptMarketRegimeDrilldown } from "./receipt-market-regime-drilldown.ts";
import { compareReceiptRiskDrivers } from "./receipt-risk-driver-comparison.ts";
import {
  buildReceiptRecheckHistorySummary,
  createReceiptRecheckHistoryEntry,
  parseReceiptRecheckHistory,
  parseStoredReceiptRecheckHistory,
  upsertReceiptRecheckHistoryEntry,
} from "./receipt-recheck-history.ts";
import { buildReceiptRecheckWatchlist } from "./receipt-recheck-watchlist.ts";
import { buildReceiptVolatilityBuffer } from "./receipt-volatility-buffer.ts";
import { compareSnapshots } from "./snapshot-comparison.ts";

function toSnapshotInput(
  snapshot: normalized_account_snapshot,
): account_snapshot_input {
  return {
    account: snapshot.account,
    protocol: snapshot.protocol,
    source: snapshot.source,
    created_at_iso: snapshot.created_at_iso,
    data_time_iso: snapshot.data_time_iso,
    freshness: snapshot.freshness,
    stale_reason: snapshot.stale_reason,
    account_value_usd: snapshot.account_value_usd,
    margin_used_usd: snapshot.margin_used_usd,
    withdrawable_usd: snapshot.withdrawable_usd,
    positions: snapshot.positions.map((position) => ({
      market: position.market,
      side: position.side,
      size: position.size,
      entry_price_usd: position.entry_price_usd,
      mark_price_usd: position.mark_price_usd,
      liquidation_price_usd: position.liquidation_price_usd,
      funding_8h_bps_user_perspective:
        position.funding_8h_bps_user_perspective,
      open_interest_usd: position.open_interest_usd,
    })),
  };
}

function buildEthHistory(): hyperliquid_market_history {
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
        volume_base: 140,
        trade_count: 12,
      },
    ],
    funding: [],
  };
}

function buildHistoryEntry(input?: {
  recheckedAtIso?: string;
  volatilityLoaded?: boolean;
}) {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = normalizeAccountSnapshot({
    ...toSnapshotInput(receiptSnapshot),
    data_time_iso: "2026-06-26T00:00:00.000Z",
    positions: toSnapshotInput(receiptSnapshot).positions.map((position) => ({
      ...position,
      mark_price_usd: 2_400,
    })),
  });
  const comparison = compareSnapshots({
    receiptSnapshot,
    currentSnapshot,
  });
  const marketContext = buildMarketContext(comparison);
  const riskDriverComparison = compareReceiptRiskDrivers({
    savedSnapshot: receiptSnapshot,
    currentSnapshot,
  });
  const volatilityBuffer = input?.volatilityLoaded
    ? buildReceiptVolatilityBuffer({
        marketContext,
        histories: [buildEthHistory()],
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
  const marketRegime = buildReceiptMarketRegime({
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

  return createReceiptRecheckHistoryEntry({
    comparison,
    currentSnapshot,
    marketRegime,
    marketRegimeDrilldown,
    receiptId: "rr_history_test",
    recheckedAtIso:
      input?.recheckedAtIso ?? "2026-06-26T00:01:00.000Z",
    volatilityLoaded: input?.volatilityLoaded ?? false,
    watchlist,
  });
}

test("creates compact recheck history entries from live recheck context", () => {
  const entry = buildHistoryEntry({ volatilityLoaded: true });

  assert.equal(entry.receipt_id, "rr_history_test");
  assert.equal(entry.current_data_time_iso, "2026-06-26T00:00:00.000Z");
  assert.equal(entry.current_risk_score, 30);
  assert.equal(entry.market_regime_label, "stress");
  assert.equal(entry.market_regime_focus_market, "ETH-PERP");
  assert.equal(entry.watchlist_high_count > 0, true);
  assert.equal(entry.top_drilldown_market, "ETH-PERP");
  assert.equal(entry.top_drilldown_severity, "high");
  assert.match(
    entry.top_drilldown_primary_cue ?? "",
    /public 24h range exceeds current listed buffer/i,
  );
  assert.equal(entry.volatility_loaded, true);
});

test("upserts, dedupes, sorts newest first, and caps history entries", () => {
  const oldest = buildHistoryEntry({
    recheckedAtIso: "2026-06-26T00:01:00.000Z",
  });
  const middle = buildHistoryEntry({
    recheckedAtIso: "2026-06-26T00:02:00.000Z",
  });
  const newest = buildHistoryEntry({
    recheckedAtIso: "2026-06-26T00:03:00.000Z",
  });
  const updatedMiddle = {
    ...middle,
    comparison_headline: "Updated middle entry",
  };
  const entries = upsertReceiptRecheckHistoryEntry({
    entries: [oldest, middle],
    entry: updatedMiddle,
  });
  const cappedEntries = upsertReceiptRecheckHistoryEntry({
    entries,
    entry: newest,
    maxEntries: 2,
  });

  assert.equal(entries.length, 2);
  assert.equal(entries[0]?.comparison_headline, "Updated middle entry");
  assert.deepEqual(
    cappedEntries.map((entry) => entry.id),
    [newest.id, middle.id],
  );
});

test("parses stored history defensively and filters malformed rows", () => {
  const entry = buildHistoryEntry();
  const storedValue = JSON.stringify([
    entry,
    { ...entry, id: 42 },
  ]);

  assert.deepEqual(parseStoredReceiptRecheckHistory("not json"), []);
  assert.deepEqual(parseReceiptRecheckHistory({ rows: [entry] }), []);
  assert.deepEqual(parseStoredReceiptRecheckHistory(storedValue), [entry]);
});

test("summarizes empty and single-row recheck history", () => {
  const emptySummary = buildReceiptRecheckHistorySummary([]);
  const singleEntry = buildHistoryEntry({
    recheckedAtIso: "2026-06-26T00:01:00.000Z",
    volatilityLoaded: true,
  });
  const singleSummary = buildReceiptRecheckHistorySummary([singleEntry]);

  assert.equal(emptySummary.label, "no_history");
  assert.equal(emptySummary.entry_count, 0);
  assert.equal(emptySummary.latest_entry, null);
  assert.match(emptySummary.summary, /Run a live recheck/);

  assert.equal(singleSummary.label, "single_check");
  assert.equal(singleSummary.entry_count, 1);
  assert.equal(singleSummary.latest_entry?.id, singleEntry.id);
  assert.equal(singleSummary.risk_score_delta, null);
  assert.equal(singleSummary.latest_risk_score, 30);
  assert.equal(singleSummary.volatility_loaded_count, 1);
  assert.match(singleSummary.summary, /Run another live recheck/);
});

test("summarizes local recheck history trends newest to oldest", () => {
  const oldest = {
    ...buildHistoryEntry({
      recheckedAtIso: "2026-06-26T00:01:00.000Z",
    }),
    current_risk_score: 30,
    current_risk_label: "medium",
    market_regime_label: "active",
    market_regime_severity: "info",
    market_regime_focus_market: "ETH-PERP",
    watchlist_high_count: 0,
    top_drilldown_primary_cue: "Listed buffer stayed comfortable",
  } satisfies ReturnType<typeof buildHistoryEntry>;
  const newest = {
    ...buildHistoryEntry({
      recheckedAtIso: "2026-06-26T00:03:00.000Z",
      volatilityLoaded: true,
    }),
    current_risk_score: 76,
    current_risk_label: "high",
    market_regime_label: "stress",
    market_regime_severity: "high",
    market_regime_focus_market: "ETH-PERP",
    watchlist_high_count: 2,
    top_drilldown_primary_cue: "Public 24h range exceeds current buffer",
  } satisfies ReturnType<typeof buildHistoryEntry>;
  const middle = {
    ...buildHistoryEntry({
      recheckedAtIso: "2026-06-26T00:02:00.000Z",
    }),
    current_risk_score: 55,
    market_regime_focus_market: "BTC-PERP",
  } satisfies ReturnType<typeof buildHistoryEntry>;

  const summary = buildReceiptRecheckHistorySummary([
    middle,
    newest,
    oldest,
  ]);

  assert.equal(summary.label, "risk_higher");
  assert.equal(summary.entry_count, 3);
  assert.equal(summary.latest_entry?.id, newest.id);
  assert.equal(summary.oldest_entry?.id, oldest.id);
  assert.equal(summary.latest_risk_score, 76);
  assert.equal(summary.oldest_risk_score, 30);
  assert.equal(summary.risk_score_delta, 46);
  assert.equal(summary.latest_regime_label, "stress");
  assert.equal(summary.oldest_regime_label, "active");
  assert.equal(summary.most_repeated_focus_market, "ETH-PERP");
  assert.equal(summary.most_repeated_focus_market_count, 2);
  assert.equal(summary.volatility_loaded_count, 1);
  assert.equal(summary.latest_watchlist_high_count, 2);
  assert.match(summary.headline, /risk score is higher/i);
  assert.match(summary.summary, /Latest risk score is 76/);
  assert.match(summary.summary, /ETH-PERP appeared as focus market/);
  assert.match(
    summary.review_points.join(" "),
    /higher than the oldest local recheck/i,
  );
});
