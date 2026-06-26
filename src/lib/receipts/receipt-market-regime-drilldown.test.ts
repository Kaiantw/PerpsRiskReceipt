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
import { buildReceiptMarketRegimeDrilldown } from "./receipt-market-regime-drilldown.ts";
import { compareReceiptRiskDrivers } from "./receipt-risk-driver-comparison.ts";
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

function buildDrilldown(input: {
  currentSnapshot: normalized_account_snapshot;
  receiptSnapshot: normalized_account_snapshot;
  volatilityHistories?: hyperliquid_market_history[];
}) {
  const comparison = compareSnapshots({
    receiptSnapshot: input.receiptSnapshot,
    currentSnapshot: input.currentSnapshot,
  });
  const marketContext = buildMarketContext(comparison);
  const riskDriverComparison = compareReceiptRiskDrivers({
    savedSnapshot: input.receiptSnapshot,
    currentSnapshot: input.currentSnapshot,
  });
  const volatilityBuffer = input.volatilityHistories
    ? buildReceiptVolatilityBuffer({
        marketContext,
        histories: input.volatilityHistories,
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

  return buildReceiptMarketRegimeDrilldown({
    comparison,
    marketContext,
    riskDriverComparison,
    volatilityBuffer,
    watchlist,
  });
}

test("builds high-attention per-market rows from volatility and watchlist cues", () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = normalizeAccountSnapshot({
    ...toSnapshotInput(receiptSnapshot),
    positions: toSnapshotInput(receiptSnapshot).positions.map((position) => ({
      ...position,
      mark_price_usd: 2_400,
    })),
  });
  const drilldown = buildDrilldown({
    receiptSnapshot,
    currentSnapshot,
    volatilityHistories: [buildEthHistory()],
  });
  const ethRow = drilldown.rows[0];

  assert.equal(drilldown.focus_market, "ETH-PERP");
  assert.equal(drilldown.high_count, 1);
  assert.equal(ethRow?.market, "ETH-PERP");
  assert.equal(ethRow?.severity, "high");
  assert.equal(ethRow?.volatility_severity, "high");
  assert.ok(
    ethRow?.primary_cue.includes("Public 24h range exceeds current listed buffer"),
  );
  assert.ok((ethRow?.watchlist_high_count ?? 0) >= 1);
});

test("marks every market critical when the live account does not match", () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = {
    ...receiptSnapshot,
    account: "0x0000000000000000000000000000000000000001",
  } satisfies normalized_account_snapshot;
  const drilldown = buildDrilldown({ receiptSnapshot, currentSnapshot });
  const ethRow = drilldown.rows[0];

  assert.equal(drilldown.critical_count, 1);
  assert.equal(ethRow?.severity, "critical");
  assert.match(ethRow?.summary ?? "", /live account does not match/i);
});

test("surfaces elevated positive funding burden as a watch row", () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = normalizeAccountSnapshot({
    ...toSnapshotInput(receiptSnapshot),
    positions: toSnapshotInput(receiptSnapshot).positions.map((position) => ({
      ...position,
      funding_8h_bps_user_perspective: 20,
    })),
  });
  const drilldown = buildDrilldown({ receiptSnapshot, currentSnapshot });
  const ethRow = drilldown.rows[0];

  assert.equal(drilldown.watch_count, 1);
  assert.equal(ethRow?.severity, "watch");
  assert.equal(ethRow?.market, "ETH-PERP");
  assert.ok((ethRow?.current_funding_burden_bps ?? 0) >= 5);
  assert.match(ethRow?.summary ?? "", /funding/i);
});
