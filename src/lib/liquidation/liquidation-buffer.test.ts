import assert from "node:assert/strict";
import test from "node:test";

import { loadFixtureAccount } from "../perps/fixtures.ts";
import { normalizeAccountSnapshot } from "../risk/risk-engine.ts";
import { buildLiquidationBufferLadder } from "./liquidation-buffer.ts";

test("safe ETH long is wide and calculates adverse move to listed liquidation", () => {
  const snapshot = loadFixtureAccount("demo-safe-eth-long");
  const ladder = buildLiquidationBufferLadder(snapshot);
  const ethBuffer = ladder.positions[0];

  assert.equal(ladder.label, "wide");
  assert.equal(ladder.closest_position?.market, "ETH-PERP");
  assert.equal(ethBuffer.label, "wide");
  assert.equal(ethBuffer.liquidation_distance_bps, 3_438);
  assert.equal(ethBuffer.adverse_move_percent, 34.38);
  assert.equal(ethBuffer.adverse_move_usd, 1_100);
  assert.equal(ethBuffer.approximate_pnl_to_liquidation_usd, 5_500);
});

test("near-liquidation BTC short is thin and uses upward adverse move", () => {
  const snapshot = loadFixtureAccount("demo-near-liquidation-btc-short");
  const ladder = buildLiquidationBufferLadder(snapshot);
  const btcBuffer = ladder.positions[0];

  assert.equal(ladder.label, "thin");
  assert.equal(btcBuffer.market, "BTC-PERP");
  assert.equal(btcBuffer.side, "short");
  assert.equal(btcBuffer.liquidation_distance_bps, 357);
  assert.equal(btcBuffer.adverse_move_percent, 3.57);
  assert.equal(btcBuffer.adverse_move_usd, 2_500);
  assert.equal(btcBuffer.approximate_pnl_to_liquidation_usd, 2_000);
});

test("mixed book sorts listed buffers before missing liquidation prices", () => {
  const snapshot = loadFixtureAccount("demo-mixed-book");
  const ladder = buildLiquidationBufferLadder(snapshot);

  assert.deepEqual(
    ladder.positions.map((position) => [position.market, position.label]),
    [
      ["BTC-PERP", "moderate"],
      ["SOL-PERP", "wide"],
      ["ETH-PERP", "unavailable"],
    ],
  );
  assert.equal(ladder.closest_position?.market, "BTC-PERP");
  assert.equal(ladder.unavailable_position_count, 1);
});

test("position through listed liquidation clamps adverse move to zero", () => {
  const snapshot = normalizeAccountSnapshot({
    account: "demo-through-liquidation",
    protocol: "fixture",
    source: "fixture",
    created_at_iso: "2026-06-25T12:00:00.000Z",
    data_time_iso: "2026-06-25T12:00:00.000Z",
    freshness: "fixture",
    account_value_usd: 1_000,
    margin_used_usd: 1_000,
    positions: [
      {
        market: "ETH-PERP",
        side: "long",
        size: 2,
        entry_price_usd: 2_500,
        mark_price_usd: 2_000,
        liquidation_price_usd: 2_100,
        funding_8h_bps_user_perspective: 0,
      },
    ],
  });
  const ladder = buildLiquidationBufferLadder(snapshot);
  const buffer = ladder.positions[0];

  assert.equal(ladder.label, "at_or_through");
  assert.equal(buffer.liquidation_distance_bps, -500);
  assert.equal(buffer.adverse_move_percent, 0);
  assert.equal(buffer.adverse_move_usd, 0);
  assert.equal(buffer.approximate_pnl_to_liquidation_usd, 0);
});

test("no open positions returns no-position state", () => {
  const snapshot = normalizeAccountSnapshot({
    account: "demo-empty",
    protocol: "fixture",
    source: "fixture",
    created_at_iso: "2026-06-25T12:00:00.000Z",
    data_time_iso: "2026-06-25T12:00:00.000Z",
    freshness: "fixture",
    account_value_usd: 10_000,
    margin_used_usd: 0,
    positions: [],
  });
  const ladder = buildLiquidationBufferLadder(snapshot);

  assert.equal(ladder.label, "no_positions");
  assert.equal(ladder.closest_position, null);
  assert.equal(ladder.positions.length, 0);
});
