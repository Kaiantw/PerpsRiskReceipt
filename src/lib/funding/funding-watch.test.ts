import assert from "node:assert/strict";
import test from "node:test";

import { loadFixtureAccount } from "../perps/fixtures.ts";
import { normalizeAccountSnapshot } from "../risk/risk-engine.ts";
import { calculateFundingCarryWatch } from "./funding-watch.ts";

test("safe long is labeled as low funding cost", () => {
  const snapshot = loadFixtureAccount("demo-safe-eth-long");
  const watch = calculateFundingCarryWatch(snapshot);

  assert.equal(watch.label, "low_cost");
  assert.equal(watch.daily_net_funding_usd, 12);
  assert.equal(watch.thirty_day_net_funding_usd, 360);
  assert.equal(watch.daily_funding_bps_of_account_value, 2.4);
  assert.equal(watch.top_cost_position?.market, "ETH-PERP");
  assert.equal(watch.top_earning_position, null);
});

test("mixed book identifies net earning plus cost and earning drivers", () => {
  const snapshot = loadFixtureAccount("demo-mixed-book");
  const watch = calculateFundingCarryWatch(snapshot);

  assert.equal(watch.label, "earning");
  assert.equal(watch.daily_net_funding_usd, -4.35);
  assert.equal(watch.daily_funding_bps_of_account_value, -0.58);
  assert.equal(watch.top_cost_position?.market, "BTC-PERP");
  assert.equal(watch.top_cost_position?.daily_funding_usd, 9.3);
  assert.equal(watch.top_earning_position?.market, "SOL-PERP");
  assert.equal(watch.top_earning_position?.daily_funding_usd, -18);
});

test("no open positions returns no carry exposure", () => {
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
  const watch = calculateFundingCarryWatch(snapshot);

  assert.equal(watch.label, "no_positions");
  assert.equal(watch.daily_net_funding_usd, 0);
  assert.equal(watch.daily_funding_bps_of_account_value, 0);
  assert.equal(watch.top_cost_position, null);
  assert.equal(watch.top_earning_position, null);
});

test("large daily funding burden is labeled heavy cost", () => {
  const snapshot = normalizeAccountSnapshot({
    account: "demo-heavy-funding",
    protocol: "fixture",
    source: "fixture",
    created_at_iso: "2026-06-25T12:00:00.000Z",
    data_time_iso: "2026-06-25T12:00:00.000Z",
    freshness: "fixture",
    account_value_usd: 1_000,
    margin_used_usd: 100,
    positions: [
      {
        market: "BTC-PERP",
        side: "long",
        size: 1,
        entry_price_usd: 100_000,
        mark_price_usd: 100_000,
        liquidation_price_usd: 90_000,
        funding_8h_bps_user_perspective: 10,
      },
    ],
  });
  const watch = calculateFundingCarryWatch(snapshot);

  assert.equal(watch.label, "heavy_cost");
  assert.equal(watch.daily_net_funding_usd, 300);
  assert.equal(watch.daily_funding_bps_of_account_value, 3_000);
  assert.match(watch.summary, /heavy holding cost/);
});
