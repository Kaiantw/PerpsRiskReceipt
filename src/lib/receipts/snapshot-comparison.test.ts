import assert from "node:assert/strict";
import test from "node:test";

import { loadFixtureAccount } from "../perps/fixtures.ts";
import type {
  account_snapshot_input,
  normalized_account_snapshot,
} from "../perps/types.ts";
import { normalizeAccountSnapshot } from "../risk/risk-engine.ts";
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

test("unchanged snapshots compare as little changed", () => {
  const snapshot = loadFixtureAccount("demo-safe-eth-long");
  const comparison = compareSnapshots({
    receiptSnapshot: snapshot,
    currentSnapshot: snapshot,
  });

  assert.equal(comparison.account_matches, true);
  assert.equal(comparison.status, "little_changed");
  assert.equal(comparison.changed_position_count, 0);
  assert.equal(comparison.metrics.risk_score.delta, 0);
  assert.equal(comparison.positions[0].status, "same_position");
});

test("same position with worse liquidation distance reports risk worsened", () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = normalizeAccountSnapshot({
    ...toSnapshotInput(receiptSnapshot),
    data_time_iso: "2026-06-24T12:04:00.000Z",
    positions: toSnapshotInput(receiptSnapshot).positions.map((position) => ({
      ...position,
      mark_price_usd: 2_400,
    })),
  });
  const comparison = compareSnapshots({
    receiptSnapshot,
    currentSnapshot,
  });

  assert.equal(comparison.status, "risk_worsened");
  assert.equal(comparison.changed_position_count, 0);
  assert.equal(comparison.positions[0].status, "same_position");
  assert.equal(comparison.positions[0].mark_price_change_percent, -25);
  assert.ok(
    (comparison.metrics.min_liquidation_distance_bps.delta ?? 0) <= -500,
  );
});

test("position size changes take priority over market movement", () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = normalizeAccountSnapshot({
    ...toSnapshotInput(receiptSnapshot),
    positions: toSnapshotInput(receiptSnapshot).positions.map((position) => ({
      ...position,
      size: position.size + 1,
      mark_price_usd: position.mark_price_usd * 1.1,
    })),
  });
  const comparison = compareSnapshots({
    receiptSnapshot,
    currentSnapshot,
  });

  assert.equal(comparison.status, "position_state_changed");
  assert.equal(comparison.changed_position_count, 1);
  assert.equal(comparison.positions[0].status, "position_changed");
  assert.equal(comparison.positions[0].size.delta, 1);
});

test("closed and new positions are both reported", () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = normalizeAccountSnapshot({
    ...toSnapshotInput(receiptSnapshot),
    positions: [
      {
        market: "BTC-PERP",
        side: "short",
        size: 0.1,
        entry_price_usd: 70_000,
        mark_price_usd: 69_000,
        liquidation_price_usd: 75_000,
        funding_8h_bps_user_perspective: -1,
      },
    ],
  });
  const comparison = compareSnapshots({
    receiptSnapshot,
    currentSnapshot,
  });

  assert.equal(comparison.status, "position_state_changed");
  assert.deepEqual(
    comparison.positions.map((position) => [
      position.market,
      position.status,
    ]),
    [
      ["BTC-PERP", "new"],
      ["ETH-PERP", "closed"],
    ],
  );
});

test("different accounts are not treated as comparable", () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = normalizeAccountSnapshot({
    ...toSnapshotInput(receiptSnapshot),
    account: "0x0000000000000000000000000000000000000000",
  });
  const comparison = compareSnapshots({
    receiptSnapshot,
    currentSnapshot,
  });

  assert.equal(comparison.account_matches, false);
  assert.equal(comparison.status, "account_mismatch");
});
