import assert from "node:assert/strict";
import test from "node:test";

import type { account_snapshot_input } from "../perps/types.ts";
import { normalizeAccountSnapshot } from "../risk/risk-engine.ts";
import { compareReceiptRiskDrivers } from "./receipt-risk-driver-comparison.ts";

function buildSnapshot(
  overrides: Partial<account_snapshot_input> = {},
): ReturnType<typeof normalizeAccountSnapshot> {
  return normalizeAccountSnapshot({
    account: "0x102a618b36c32b338c03526255dcf2a39eb1897f",
    protocol: "hyperliquid",
    source: "live",
    created_at_iso: "2026-06-25T12:00:00.000Z",
    data_time_iso: "2026-06-25T11:59:00.000Z",
    freshness: "live",
    account_value_usd: 50_000,
    margin_used_usd: 5_000,
    positions: [
      {
        market: "ETH-PERP",
        side: "long",
        size: 10,
        entry_price_usd: 2_000,
        mark_price_usd: 2_000,
        liquidation_price_usd: 1_000,
        funding_8h_bps_user_perspective: 0,
      },
    ],
    ...overrides,
  });
}

test("returns no-live state before a recheck snapshot exists", () => {
  const savedSnapshot = buildSnapshot();
  const comparison = compareReceiptRiskDrivers({ savedSnapshot });

  assert.equal(comparison.label, "no_live_snapshot");
  assert.equal(comparison.current_drivers, null);
  assert.equal(comparison.market_changes.length, 0);
  assert.match(comparison.review_points[0], /No live snapshot/);
});

test("labels tighter listed liquidation buffer as driver worsened", () => {
  const savedSnapshot = buildSnapshot();
  const currentSnapshot = buildSnapshot({
    data_time_iso: "2026-06-25T12:04:00.000Z",
    positions: [
      {
        market: "ETH-PERP",
        side: "long",
        size: 10,
        entry_price_usd: 2_000,
        mark_price_usd: 1_100,
        liquidation_price_usd: 1_000,
        funding_8h_bps_user_perspective: 0,
      },
    ],
  });
  const comparison = compareReceiptRiskDrivers({
    savedSnapshot,
    currentSnapshot,
  });

  assert.equal(comparison.label, "driver_worsened");
  assert.equal(comparison.changed_position_count, 0);
  assert.equal(comparison.current_top_driver_market, "ETH-PERP");
  assert.ok((comparison.top_driver_score_delta ?? 0) >= 10);
  assert.ok(
    (comparison.closest_liquidation_distance_delta_bps ?? 0) <= -500,
  );
  assert.equal(comparison.market_changes[0].status, "same_position");
});

test("labels wider listed liquidation buffer as driver improved", () => {
  const savedSnapshot = buildSnapshot({
    positions: [
      {
        market: "ETH-PERP",
        side: "long",
        size: 10,
        entry_price_usd: 2_000,
        mark_price_usd: 1_100,
        liquidation_price_usd: 1_000,
        funding_8h_bps_user_perspective: 0,
      },
    ],
  });
  const currentSnapshot = buildSnapshot();
  const comparison = compareReceiptRiskDrivers({
    savedSnapshot,
    currentSnapshot,
  });

  assert.equal(comparison.label, "driver_improved");
  assert.ok((comparison.top_driver_score_delta ?? 0) <= -10);
  assert.ok(
    (comparison.closest_liquidation_distance_delta_bps ?? 0) >= 500,
  );
});

test("position state changes take priority over driver deltas", () => {
  const savedSnapshot = buildSnapshot();
  const currentSnapshot = buildSnapshot({
    positions: [
      {
        market: "ETH-PERP",
        side: "long",
        size: 12,
        entry_price_usd: 2_000,
        mark_price_usd: 1_100,
        liquidation_price_usd: 1_000,
        funding_8h_bps_user_perspective: 0,
      },
    ],
  });
  const comparison = compareReceiptRiskDrivers({
    savedSnapshot,
    currentSnapshot,
  });

  assert.equal(comparison.label, "positions_changed");
  assert.equal(comparison.changed_position_count, 1);
  assert.equal(comparison.market_changes[0].status, "position_changed");
});

test("account mismatch is not treated as a comparable driver move", () => {
  const savedSnapshot = buildSnapshot();
  const currentSnapshot = buildSnapshot({
    account: "0x0000000000000000000000000000000000000000",
  });
  const comparison = compareReceiptRiskDrivers({
    savedSnapshot,
    currentSnapshot,
  });

  assert.equal(comparison.account_matches, false);
  assert.equal(comparison.label, "account_mismatch");
  assert.match(comparison.review_points[0], /Account mismatch/);
});

test("unchanged risk drivers avoid noisy zero-delta review points", () => {
  const savedSnapshot = buildSnapshot();
  const comparison = compareReceiptRiskDrivers({
    savedSnapshot,
    currentSnapshot: savedSnapshot,
  });

  assert.equal(comparison.label, "little_changed");
  assert.deepEqual(comparison.review_points, [
    "No material risk-driver changes crossed the current app thresholds.",
  ]);
});

test("same positions with a new lead market are labeled driver changed", () => {
  const savedSnapshot = buildSnapshot({
    account_value_usd: 100_000,
    positions: [
      {
        market: "BTC-PERP",
        side: "long",
        size: 1,
        entry_price_usd: 100_000,
        mark_price_usd: 100_000,
        liquidation_price_usd: 91_000,
        funding_8h_bps_user_perspective: 0,
      },
      {
        market: "ETH-PERP",
        side: "long",
        size: 100,
        entry_price_usd: 1_100,
        mark_price_usd: 1_000,
        liquidation_price_usd: 890,
        funding_8h_bps_user_perspective: 0,
      },
    ],
  });
  const currentSnapshot = buildSnapshot({
    account_value_usd: 100_000,
    positions: [
      {
        market: "BTC-PERP",
        side: "long",
        size: 1,
        entry_price_usd: 100_000,
        mark_price_usd: 102_247,
        liquidation_price_usd: 91_000,
        funding_8h_bps_user_perspective: 0,
      },
      {
        market: "ETH-PERP",
        side: "long",
        size: 100,
        entry_price_usd: 1_100,
        mark_price_usd: 978,
        liquidation_price_usd: 890,
        funding_8h_bps_user_perspective: 0,
      },
    ],
  });
  const comparison = compareReceiptRiskDrivers({
    savedSnapshot,
    currentSnapshot,
  });

  assert.equal(comparison.label, "driver_changed");
  assert.equal(comparison.top_driver_score_delta, 9);
  assert.equal(comparison.closest_liquidation_distance_delta_bps, 0);
  assert.notEqual(
    comparison.saved_top_driver_market,
    comparison.current_top_driver_market,
  );
  assert.equal(comparison.changed_position_count, 0);
});
