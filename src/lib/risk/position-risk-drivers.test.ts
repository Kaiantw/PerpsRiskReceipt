import assert from "node:assert/strict";
import test from "node:test";

import { loadFixtureAccount } from "../perps/fixtures.ts";
import { normalizeAccountSnapshot } from "./risk-engine.ts";
import { buildPositionRiskDrivers } from "./position-risk-drivers.ts";

test("ranks near-liquidation short as the largest driver", () => {
  const snapshot = loadFixtureAccount("demo-near-liquidation-btc-short");
  const drivers = buildPositionRiskDrivers(snapshot);

  assert.equal(drivers.label, "critical");
  assert.equal(drivers.top_driver_position?.market, "BTC-PERP");
  assert.equal(
    drivers.top_driver_position?.primary_driver,
    "liquidation_buffer",
  );
  assert.equal(drivers.top_driver_position?.driver_score, 77);
  assert.equal(drivers.top_liquidation_position?.market, "BTC-PERP");
  assert.equal(drivers.top_unrealized_loss_position?.market, "BTC-PERP");
  assert.equal(drivers.directional_bias, "net_short");
});

test("surfaces gross exposure and notional concentration", () => {
  const snapshot = normalizeAccountSnapshot({
    account: "driver-concentration",
    protocol: "fixture",
    source: "fixture",
    created_at_iso: "2026-06-25T12:00:00.000Z",
    data_time_iso: "2026-06-25T11:59:00.000Z",
    freshness: "fixture",
    account_value_usd: 10_000,
    margin_used_usd: 2_000,
    positions: [
      {
        market: "BTC-PERP",
        side: "long",
        size: 1,
        entry_price_usd: 90_000,
        mark_price_usd: 90_000,
        liquidation_price_usd: 45_000,
        funding_8h_bps_user_perspective: 0,
      },
      {
        market: "ETH-PERP",
        side: "short",
        size: 2,
        entry_price_usd: 5_000,
        mark_price_usd: 5_000,
        liquidation_price_usd: 8_000,
        funding_8h_bps_user_perspective: 0,
      },
    ],
  });
  const drivers = buildPositionRiskDrivers(snapshot);

  assert.equal(drivers.gross_notional_to_account_value_bps, 100_000);
  assert.equal(drivers.largest_notional_share_bps, 9_000);
  assert.equal(drivers.top_notional_position?.market, "BTC-PERP");
  assert.equal(
    drivers.top_driver_position?.primary_driver,
    "notional_concentration",
  );
  assert.match(drivers.top_driver_position?.summary ?? "", /90.00%/);
});

test("tracks the largest positive funding cost separately", () => {
  const snapshot = normalizeAccountSnapshot({
    account: "driver-funding",
    protocol: "fixture",
    source: "fixture",
    created_at_iso: "2026-06-25T12:00:00.000Z",
    data_time_iso: "2026-06-25T11:59:00.000Z",
    freshness: "fixture",
    account_value_usd: 100_000,
    margin_used_usd: 10_000,
    positions: [
      {
        market: "SOL-PERP",
        side: "long",
        size: 1_000,
        entry_price_usd: 50,
        mark_price_usd: 50,
        liquidation_price_usd: 20,
        funding_8h_bps_user_perspective: 35,
      },
      {
        market: "ETH-PERP",
        side: "short",
        size: 10,
        entry_price_usd: 3_000,
        mark_price_usd: 3_000,
        liquidation_price_usd: 5_000,
        funding_8h_bps_user_perspective: -2,
      },
    ],
  });
  const drivers = buildPositionRiskDrivers(snapshot);

  assert.equal(drivers.top_funding_cost_position?.market, "SOL-PERP");
  assert.equal(drivers.top_funding_cost_position?.daily_funding_usd, 525);
  assert.equal(
    drivers.top_funding_cost_position?.daily_funding_bps_of_account_value,
    52.5,
  );
  assert.equal(drivers.top_funding_cost_position?.funding_score, 20);
});

test("returns empty state when there are no open positions", () => {
  const snapshot = normalizeAccountSnapshot({
    account: "driver-empty",
    protocol: "fixture",
    source: "fixture",
    created_at_iso: "2026-06-25T12:00:00.000Z",
    data_time_iso: "2026-06-25T11:59:00.000Z",
    freshness: "fixture",
    account_value_usd: 20_000,
    margin_used_usd: 0,
    positions: [],
  });
  const drivers = buildPositionRiskDrivers(snapshot);

  assert.equal(drivers.label, "no_positions");
  assert.equal(drivers.positions.length, 0);
  assert.equal(drivers.directional_bias, "no_positions");
  assert.equal(drivers.top_driver_position, null);
  assert.equal(drivers.top_funding_cost_position, null);
});

test("keeps zero account value from producing infinite driver metrics", () => {
  const snapshot = normalizeAccountSnapshot({
    account: "driver-zero-account",
    protocol: "fixture",
    source: "fixture",
    created_at_iso: "2026-06-25T12:00:00.000Z",
    data_time_iso: "2026-06-25T11:59:00.000Z",
    freshness: "fixture",
    account_value_usd: 0,
    margin_used_usd: 1_000,
    positions: [
      {
        market: "BTC-PERP",
        side: "long",
        size: 0.1,
        entry_price_usd: 70_000,
        mark_price_usd: 70_000,
        liquidation_price_usd: null,
        funding_8h_bps_user_perspective: 5,
      },
    ],
  });
  const drivers = buildPositionRiskDrivers(snapshot);

  assert.equal(drivers.gross_notional_to_account_value_bps, null);
  assert.equal(drivers.top_driver_position?.notional_to_account_value_bps, null);
  assert.equal(
    drivers.top_driver_position?.daily_funding_bps_of_account_value,
    null,
  );
  assert.equal(
    drivers.top_driver_position?.primary_driver,
    "notional_concentration",
  );
});
