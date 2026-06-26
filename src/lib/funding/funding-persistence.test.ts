import assert from "node:assert/strict";
import test from "node:test";

import type { hyperliquid_market_history } from "../hyperliquid/adapter.ts";
import type { normalized_account_snapshot } from "../perps/types.ts";
import { buildFundingPersistenceRead } from "./funding-persistence.ts";

const baseSnapshot: normalized_account_snapshot = {
  account: "0x0000000000000000000000000000000000000001",
  protocol: "hyperliquid",
  source: "live",
  created_at_iso: "2026-06-25T12:00:00.000Z",
  data_time_iso: "2026-06-25T11:59:00.000Z",
  freshness: "live",
  account_value_usd: 20_000,
  margin_used_usd: 5_000,
  positions: [
    {
      market: "ETH-PERP",
      side: "long",
      size: 10,
      entry_price_usd: 3_000,
      mark_price_usd: 3_100,
      liquidation_price_usd: 2_500,
      notional_usd: 31_000,
      unrealized_pnl_usd: 1_000,
      funding_8h_bps_user_perspective: 1.5,
    },
    {
      market: "BTC-PERP",
      side: "short",
      size: -1,
      entry_price_usd: 70_000,
      mark_price_usd: 69_000,
      liquidation_price_usd: 75_000,
      notional_usd: 69_000,
      unrealized_pnl_usd: 1_000,
      funding_8h_bps_user_perspective: -0.7,
    },
  ],
  aggregate: {
    total_notional_usd: 100_000,
    margin_usage_bps: 2_500,
    min_liquidation_distance_bps: 1_000,
    daily_funding_usd: 12,
    thirty_day_funding_usd: 360,
    risk_score: 50,
    risk_label: "medium",
  },
};

function marketHistory(input: {
  fundingBps: number[];
  market: string;
}): hyperliquid_market_history {
  return {
    market: input.market,
    coin: input.market.replace("-PERP", ""),
    interval: "1h",
    start_time_ms: Date.parse("2026-06-24T12:00:00.000Z"),
    end_time_ms: Date.parse("2026-06-25T12:00:00.000Z"),
    candles: [],
    funding: input.fundingBps.map((fundingBps, index) => ({
      time_ms: Date.parse("2026-06-24T12:00:00.000Z") + index * 60 * 60 * 1000,
      market: input.market,
      funding_8h_bps: fundingBps,
      premium_bps: null,
    })),
  };
}

function buildRead(input: {
  histories: hyperliquid_market_history[];
  snapshot?: normalized_account_snapshot;
}) {
  return buildFundingPersistenceRead({
    fetchedAtIso: "2026-06-25T12:01:00.000Z",
    histories: input.histories,
    interval: "1h",
    snapshot: input.snapshot ?? baseSnapshot,
    windowHours: 24,
  });
}

test("labels persistent cost for a long with repeated positive funding", () => {
  const read = buildRead({
    histories: [marketHistory({ market: "ETH-PERP", fundingBps: [1.3, 1.8, 2] })],
  });
  const eth = read.positions.find((position) => position.market === "ETH-PERP");

  assert.equal(read.label, "persistent_cost");
  assert.equal(read.focus_market, "ETH-PERP");
  assert.equal(eth?.label, "persistent_cost");
  assert.equal(eth?.cost_point_count, 3);
  assert.equal(eth?.cost_persistence_percent, 100);
  assert.equal(eth?.average_funding_8h_bps_user_perspective, 1.7);
  assert.equal(eth?.estimated_average_daily_funding_usd, 15.81);
  assert.match(eth?.summary ?? "", /persistent recent funding cost/);
});

test("side-adjusts short funding so positive public funding becomes credit", () => {
  const read = buildRead({
    histories: [marketHistory({ market: "BTC-PERP", fundingBps: [1.2, 1.3, 1.5] })],
  });
  const btc = read.positions.find((position) => position.market === "BTC-PERP");

  assert.equal(read.label, "persistent_credit");
  assert.equal(btc?.label, "persistent_credit");
  assert.equal(btc?.credit_point_count, 3);
  assert.equal(btc?.average_funding_8h_bps_user_perspective, -1.3333);
  assert.equal(btc?.estimated_average_daily_funding_usd, -27.6);
});

test("labels latest material cost as recent when the full window is mixed", () => {
  const read = buildRead({
    histories: [
      marketHistory({ market: "ETH-PERP", fundingBps: [-0.5, 0.2, 1.8] }),
    ],
  });
  const eth = read.positions.find((position) => position.market === "ETH-PERP");

  assert.equal(read.label, "recent_cost");
  assert.equal(eth?.label, "recent_cost");
  assert.equal(eth?.cost_point_count, 2);
  assert.equal(eth?.credit_point_count, 1);
  assert.equal(eth?.latest_funding_8h_bps_user_perspective, 1.8);
  assert.match(eth?.summary ?? "", /recent funding cost/);
});

test("reports no history without inventing funding persistence", () => {
  const read = buildRead({
    histories: [],
    snapshot: {
      ...baseSnapshot,
      positions: baseSnapshot.positions.slice(0, 1),
    },
  });

  assert.equal(read.label, "no_history");
  assert.equal(read.matched_market_count, 0);
  assert.equal(read.focus_market, null);
  assert.equal(read.positions[0]?.label, "no_history");
  assert.match(read.review_points[0] ?? "", /No loaded funding-history/);
});

test("labels no positions separately from missing market history", () => {
  const read = buildRead({
    histories: [],
    snapshot: {
      ...baseSnapshot,
      positions: [],
    },
  });

  assert.equal(read.label, "no_positions");
  assert.equal(read.positions.length, 0);
  assert.equal(
    read.summary,
    "The snapshot has no open positions, so funding persistence is not applicable.",
  );
});
