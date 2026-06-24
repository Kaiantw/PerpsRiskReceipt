import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateAggregate,
  calculateDailyFundingUsd,
  calculateLiquidationDistanceBps,
  calculateMarginUsageBps,
  calculateNotionalUsd,
  calculateRiskScore,
  calculateThirtyDayFundingUsd,
  calculateUnrealizedPnlUsd,
  normalizeAccountSnapshot,
  normalizePosition,
  runPriceScenario,
} from "./risk-engine.ts";
import {
  fixtureAccounts,
  listFixtureAccounts,
  loadFixtureAccount,
} from "../perps/fixtures.ts";

test("fixture loader exposes exactly three normalized demo accounts", () => {
  assert.equal(listFixtureAccounts().length, 3);
  assert.deepEqual(
    fixtureAccounts.map((fixture) => fixture.account),
    [
      "demo-safe-eth-long",
      "demo-near-liquidation-btc-short",
      "demo-mixed-book",
    ],
  );

  for (const fixture of fixtureAccounts) {
    assert.equal(fixture.protocol, "fixture");
    assert.equal(fixture.source, "fixture");
    assert.equal(fixture.freshness, "fixture");
    assert.equal(typeof fixture.aggregate.risk_score, "number");
  }
});

test("safe eth long computes notional, pnl, liquidation distance, funding, and low risk", () => {
  const snapshot = loadFixtureAccount("demo-safe-eth-long");
  const position = snapshot.positions[0];

  assert.equal(position.notional_usd, 16_000);
  assert.equal(position.unrealized_pnl_usd, 1_000);
  assert.equal(calculateLiquidationDistanceBps(position), 3_438);
  assert.equal(snapshot.aggregate.margin_usage_bps, 1_000);
  assert.equal(snapshot.aggregate.daily_funding_usd, 12);
  assert.equal(snapshot.aggregate.thirty_day_funding_usd, 360);
  assert.equal(snapshot.aggregate.risk_label, "low");
});

test("near-liquidation btc short is flagged critical and calculates short pnl", () => {
  const snapshot = loadFixtureAccount("demo-near-liquidation-btc-short");
  const position = snapshot.positions[0];

  assert.equal(position.notional_usd, 56_000);
  assert.equal(position.unrealized_pnl_usd, -4_000);
  assert.equal(calculateLiquidationDistanceBps(position), 357);
  assert.equal(snapshot.aggregate.margin_usage_bps, 7_200);
  assert.equal(snapshot.aggregate.daily_funding_usd, -20.16);
  assert.equal(snapshot.aggregate.risk_label, "critical");
  assert.ok(snapshot.aggregate.risk_score >= 75);
});

test("mixed multi-position book aggregates long, short, and missing liquidation positions", () => {
  const snapshot = loadFixtureAccount("demo-mixed-book");

  assert.equal(snapshot.positions.length, 3);
  assert.equal(snapshot.aggregate.total_notional_usd, 75_000);
  assert.equal(snapshot.aggregate.margin_usage_bps, 3_333);
  assert.equal(snapshot.aggregate.min_liquidation_distance_bps, 2_258);
  assert.equal(snapshot.aggregate.daily_funding_usd, -4.35);
  assert.equal(snapshot.aggregate.risk_label, "high");
});

test("missing liquidation price returns null and does not break aggregate distance", () => {
  const position = normalizePosition({
    market: "ETH-PERP",
    side: "long",
    size: 1,
    entry_price_usd: 2_800,
    mark_price_usd: 2_900,
    liquidation_price_usd: null,
    funding_8h_bps_user_perspective: 0,
  });

  assert.equal(calculateLiquidationDistanceBps(position), null);

  const aggregate = calculateAggregate({
    account_value_usd: 10_000,
    margin_used_usd: 1_000,
    positions: [position],
  });

  assert.equal(aggregate.min_liquidation_distance_bps, null);
});

test("zero and negative account value force critical risk without Infinity values", () => {
  assert.equal(calculateMarginUsageBps(0, 1_000), 10_000);
  assert.equal(calculateMarginUsageBps(-100, 1_000), 10_000);

  assert.equal(
    calculateRiskScore({
      account_value_usd: 0,
      margin_usage_bps: 10_000,
      min_liquidation_distance_bps: 100,
      daily_funding_usd: 10,
    }),
    100,
  );
  assert.equal(
    normalizeAccountSnapshot({
      account: "demo-zero-equity",
      protocol: "fixture",
      source: "fixture",
      created_at_iso: "2026-06-24T12:00:00.000Z",
      data_time_iso: "2026-06-24T12:00:00.000Z",
      freshness: "fixture",
      account_value_usd: -1,
      margin_used_usd: 1_000,
      positions: [],
    }).aggregate.risk_label,
    "critical",
  );
});

test("negative funding means user earns and positive funding means user pays", () => {
  const positiveFunding = normalizePosition({
    market: "ETH-PERP",
    side: "long",
    size: 10,
    entry_price_usd: 3_000,
    mark_price_usd: 3_000,
    liquidation_price_usd: 2_000,
    funding_8h_bps_user_perspective: 5,
  });
  const negativeFunding = {
    ...positiveFunding,
    funding_8h_bps_user_perspective: -5,
  };

  assert.equal(calculateDailyFundingUsd(positiveFunding), 45);
  assert.equal(calculateThirtyDayFundingUsd(45), 1_350);
  assert.equal(calculateDailyFundingUsd(negativeFunding), -45);
  assert.equal(calculateThirtyDayFundingUsd(-45), -1_350);
});

test("core formulas calculate notional and long/short unrealized pnl", () => {
  assert.equal(calculateNotionalUsd(-2, 100), 200);
  assert.equal(calculateUnrealizedPnlUsd("long", 2, 100, 125), 50);
  assert.equal(calculateUnrealizedPnlUsd("short", 2, 100, 125), -50);
});

test("long scenario crosses liquidation and updates account value", () => {
  const snapshot = normalizeAccountSnapshot({
    account: "long-cross",
    protocol: "fixture",
    source: "fixture",
    created_at_iso: "2026-06-24T12:00:00.000Z",
    data_time_iso: "2026-06-24T12:00:00.000Z",
    freshness: "fixture",
    account_value_usd: 10_000,
    margin_used_usd: 5_000,
    positions: [
      {
        market: "ETH-PERP",
        side: "long",
        size: 10,
        entry_price_usd: 1_000,
        mark_price_usd: 1_000,
        liquidation_price_usd: 925,
        funding_8h_bps_user_perspective: 0,
      },
    ],
  });

  const scenario = runPriceScenario(snapshot, -10);

  assert.deepEqual(scenario.positions_at_or_through_liquidation, ["ETH-PERP"]);
  assert.equal(scenario.estimated_pnl_change_usd, -1_000);
  assert.equal(scenario.estimated_account_value_usd, 9_000);
  assert.equal(scenario.risk_label_after_move, "critical");
});

test("short scenario crosses liquidation and updates account value", () => {
  const snapshot = normalizeAccountSnapshot({
    account: "short-cross",
    protocol: "fixture",
    source: "fixture",
    created_at_iso: "2026-06-24T12:00:00.000Z",
    data_time_iso: "2026-06-24T12:00:00.000Z",
    freshness: "fixture",
    account_value_usd: 10_000,
    margin_used_usd: 5_000,
    positions: [
      {
        market: "BTC-PERP",
        side: "short",
        size: 1,
        entry_price_usd: 100,
        mark_price_usd: 100,
        liquidation_price_usd: 104,
        funding_8h_bps_user_perspective: 0,
      },
    ],
  });

  const scenario = runPriceScenario(snapshot, 5);

  assert.deepEqual(scenario.positions_at_or_through_liquidation, ["BTC-PERP"]);
  assert.equal(scenario.estimated_pnl_change_usd, -5);
  assert.equal(scenario.estimated_account_value_usd, 9_995);
  assert.equal(scenario.risk_label_after_move, "critical");
});
