import assert from "node:assert/strict";
import test from "node:test";

import { buildMarketContext } from "../market/market-context.ts";
import { loadFixtureAccount } from "../perps/fixtures.ts";
import type {
  account_snapshot_input,
  normalized_account_snapshot,
} from "../perps/types.ts";
import { normalizeAccountSnapshot } from "../risk/risk-engine.ts";
import { compareSnapshots } from "./snapshot-comparison.ts";
import { compareReceiptRiskDrivers } from "./receipt-risk-driver-comparison.ts";
import { buildReceiptRecheckWatchlist } from "./receipt-recheck-watchlist.ts";
import { buildReceiptSnapshotDrift } from "./receipt-snapshot-drift.ts";

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

function buildDrift(input: {
  currentDataTimeIso?: string;
  currentSnapshot: normalized_account_snapshot;
  receiptDataTimeIso?: string;
  receiptSnapshot: normalized_account_snapshot;
}) {
  const comparison = compareSnapshots(input);
  const marketContext = buildMarketContext(comparison);
  const watchlist = buildReceiptRecheckWatchlist({
    marketContext,
    riskDriverComparison: compareReceiptRiskDrivers({
      savedSnapshot: input.receiptSnapshot,
      currentSnapshot: input.currentSnapshot,
    }),
  });

  return buildReceiptSnapshotDrift({
    comparison,
    currentDataTimeIso:
      input.currentDataTimeIso ?? input.currentSnapshot.data_time_iso,
    marketContext,
    receiptDataTimeIso:
      input.receiptDataTimeIso ?? input.receiptSnapshot.data_time_iso,
    watchlist,
  });
}

test("labels unchanged recent snapshots as close", () => {
  const snapshot = loadFixtureAccount("demo-safe-eth-long");
  const drift = buildDrift({
    receiptSnapshot: snapshot,
    currentSnapshot: snapshot,
    receiptDataTimeIso: "2026-06-26T00:00:00.000Z",
    currentDataTimeIso: "2026-06-26T00:30:00.000Z",
  });

  assert.equal(drift.label, "close_snapshot");
  assert.equal(drift.severity, "neutral");
  assert.equal(drift.age_minutes, 30);
  assert.equal(drift.focus_market, "ETH-PERP");
  assert.ok(drift.drift_score < 35);
});

test("labels adverse mark movement and thin buffer as stale snapshot", () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = normalizeAccountSnapshot({
    ...toSnapshotInput(receiptSnapshot),
    data_time_iso: "2026-06-26T02:00:00.000Z",
    positions: toSnapshotInput(receiptSnapshot).positions.map((position) => ({
      ...position,
      mark_price_usd: 2_300,
      funding_8h_bps_user_perspective: 9,
    })),
  });
  const drift = buildDrift({
    receiptSnapshot,
    currentSnapshot,
    receiptDataTimeIso: "2026-06-26T00:00:00.000Z",
  });

  assert.equal(drift.label, "stale_snapshot");
  assert.equal(drift.severity, "critical");
  assert.equal(drift.focus_market, "ETH-PERP");
  assert.ok(drift.drift_score >= 70);
  assert.match(drift.summary, /max mark move/);
});

test("labels funding-only changes as drift watch", () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = normalizeAccountSnapshot({
    ...toSnapshotInput(receiptSnapshot),
    data_time_iso: "2026-06-26T01:00:00.000Z",
    positions: toSnapshotInput(receiptSnapshot).positions.map((position) => ({
      ...position,
      funding_8h_bps_user_perspective: 8,
    })),
  });
  const drift = buildDrift({
    receiptSnapshot,
    currentSnapshot,
    receiptDataTimeIso: "2026-06-26T00:00:00.000Z",
  });

  assert.equal(drift.label, "drift_watch");
  assert.equal(drift.severity, "watch");
  assert.equal(drift.metrics.total_daily_funding_delta_usd, 26.4);
  assert.match(drift.review_points.join(" "), /Daily funding estimate delta/);
});

test("labels changed positions as not comparable", () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = normalizeAccountSnapshot({
    ...toSnapshotInput(receiptSnapshot),
    positions: [],
  });
  const drift = buildDrift({
    receiptSnapshot,
    currentSnapshot,
    receiptDataTimeIso: "2026-06-26T00:00:00.000Z",
    currentDataTimeIso: "2026-06-26T00:15:00.000Z",
  });

  assert.equal(drift.label, "not_comparable");
  assert.equal(drift.severity, "critical");
  assert.equal(drift.drift_score, 100);
  assert.match(drift.summary, /historical context/);
});
