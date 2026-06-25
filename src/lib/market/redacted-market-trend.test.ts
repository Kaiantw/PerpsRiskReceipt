import assert from "node:assert/strict";
import test from "node:test";

import type { hyperliquid_market_history } from "../hyperliquid/adapter.ts";
import type { redacted_receipt_bundle } from "../receipts/portable-receipt-bundle.ts";
import { buildRedactedMarketTrend } from "./redacted-market-trend.ts";

const redactedBundle: redacted_receipt_bundle = {
  kind: "perps-risk-receipt.redacted.v1",
  version: 1,
  privacy_level: "redacted_summary",
  exported_at_iso: "2026-06-25T12:00:00.000Z",
  receipt_id: "rr_demo",
  snapshot_hash:
    "0x0000000000000000000000000000000000000000000000000000000000000000",
  created_at_iso: "2026-06-25T12:00:00.000Z",
  data_time_iso: "2026-06-25T11:55:00.000Z",
  protocol: "hyperliquid",
  source: "live",
  freshness: "live",
  aggregate: {
    risk_score: 65,
    risk_label: "high",
    margin_usage_bps: 4_500,
    min_liquidation_distance_bps: 900,
    account_value_bucket_usd: "$50k-$100k",
    total_notional_bucket_usd: "$100k-$250k",
    daily_funding_bucket_usd: "cost $10-$50k",
    thirty_day_funding_bucket_usd: "cost $10k-$50k",
    position_count: 2,
  },
  markets: [
    {
      market: "ETH-PERP",
      side: "long",
      notional_bucket_usd: "$10k-$50k",
      liquidation_distance_bps: 900,
      funding_8h_bps_user_perspective: 1.2,
      open_interest_bucket_usd: "$250k-$1m",
    },
    {
      market: "BTC-PERP",
      side: "short",
      notional_bucket_usd: "$50k-$100k",
      liquidation_distance_bps: 1_500,
      funding_8h_bps_user_perspective: -0.5,
    },
  ],
  redacted_fields: [
    "account",
    "position sizes",
    "entry prices",
    "mark prices",
  ],
  verification_scope:
    "snapshot_hash_reference_only_full_snapshot_required_to_recompute",
};

const ethHistory: hyperliquid_market_history = {
  market: "ETH-PERP",
  coin: "ETH",
  interval: "1h",
  start_time_ms: Date.parse("2026-06-24T12:00:00.000Z"),
  end_time_ms: Date.parse("2026-06-25T12:00:00.000Z"),
  candles: [
    {
      open_time_ms: Date.parse("2026-06-24T12:00:00.000Z"),
      close_time_ms: Date.parse("2026-06-24T12:59:59.999Z"),
      market: "ETH-PERP",
      interval: "1h",
      open_price_usd: 3_000,
      high_price_usd: 3_040,
      low_price_usd: 2_960,
      close_price_usd: 3_000,
      volume_base: 120,
      trade_count: 20,
    },
    {
      open_time_ms: Date.parse("2026-06-25T11:00:00.000Z"),
      close_time_ms: Date.parse("2026-06-25T11:59:59.999Z"),
      market: "ETH-PERP",
      interval: "1h",
      open_price_usd: 2_930,
      high_price_usd: 2_950,
      low_price_usd: 2_880,
      close_price_usd: 2_900,
      volume_base: 160,
      trade_count: 24,
    },
  ],
  funding: [
    {
      time_ms: Date.parse("2026-06-24T13:00:00.000Z"),
      market: "ETH-PERP",
      funding_8h_bps: 1.8,
      premium_bps: 0.4,
    },
    {
      time_ms: Date.parse("2026-06-25T12:00:00.000Z"),
      market: "ETH-PERP",
      funding_8h_bps: 2.2,
      premium_bps: 0.6,
    },
  ],
};

const btcHistory: hyperliquid_market_history = {
  market: "BTC-PERP",
  coin: "BTC",
  interval: "1h",
  start_time_ms: Date.parse("2026-06-24T12:00:00.000Z"),
  end_time_ms: Date.parse("2026-06-25T12:00:00.000Z"),
  candles: [
    {
      open_time_ms: Date.parse("2026-06-24T12:00:00.000Z"),
      close_time_ms: Date.parse("2026-06-24T12:59:59.999Z"),
      market: "BTC-PERP",
      interval: "1h",
      open_price_usd: 70_000,
      high_price_usd: 70_500,
      low_price_usd: 69_500,
      close_price_usd: 70_000,
      volume_base: 20,
      trade_count: 12,
    },
  ],
  funding: [
    {
      time_ms: Date.parse("2026-06-25T12:00:00.000Z"),
      market: "BTC-PERP",
      funding_8h_bps: 0.4,
      premium_bps: 0.1,
    },
  ],
};

test("builds 24h trend context without hidden account fields", () => {
  const trend = buildRedactedMarketTrend({
    bundle: redactedBundle,
    histories: [ethHistory, btcHistory],
    fetchedAtIso: "2026-06-25T12:02:00.000Z",
    windowHours: 24,
    interval: "1h",
  });

  assert.equal(trend.label, "adverse_price_trend");
  assert.equal(trend.matched_market_count, 2);
  assert.equal(trend.rows[0]?.market, "ETH-PERP");
  assert.equal(trend.rows[0]?.price_change_percent, -3.33);
  assert.equal(trend.rows[0]?.high_low_range_percent, 5.52);
  assert.equal(trend.rows[0]?.average_funding_8h_bps_user_perspective, 2);
  assert.equal(trend.rows[0]?.average_funding_delta_from_receipt_bps, 0.8);
  assert.deepEqual(trend.rows[0]?.close_prices_usd, [3_000, 2_900]);
  assert.match(trend.summary, /public Hyperliquid candles/);
  assert.match(trend.rows[0]?.summary ?? "", /adverse/);
});

test("side-adjusts funding history for disclosed shorts", () => {
  const trend = buildRedactedMarketTrend({
    bundle: redactedBundle,
    histories: [btcHistory],
    fetchedAtIso: "2026-06-25T12:02:00.000Z",
    windowHours: 24,
    interval: "1h",
  });

  const btcRow = trend.rows.find((row) => row.market === "BTC-PERP");

  assert.equal(btcRow?.latest_funding_8h_bps_user_perspective, -0.4);
  assert.equal(btcRow?.average_funding_8h_bps_user_perspective, -0.4);
});

test("reports no history when public candles and funding are unavailable", () => {
  const trend = buildRedactedMarketTrend({
    bundle: redactedBundle,
    histories: [
      {
        ...ethHistory,
        candles: [],
        funding: [],
      },
      {
        ...btcHistory,
        candles: [],
        funding: [],
      },
    ],
    fetchedAtIso: "2026-06-25T12:02:00.000Z",
    windowHours: 24,
    interval: "1h",
  });

  assert.equal(trend.label, "no_history");
  assert.equal(trend.matched_market_count, 0);
  assert.equal(trend.rows[0]?.has_history, false);
  assert.match(trend.rows[0]?.summary ?? "", /No 24h public/);
});

test("labels persistent funding cost when price is not adverse", () => {
  const trend = buildRedactedMarketTrend({
    bundle: redactedBundle,
    histories: [
      {
        ...ethHistory,
        candles: ethHistory.candles.map((candle) => ({
          ...candle,
          close_price_usd: 3_000,
          high_price_usd: 3_020,
          low_price_usd: 2_980,
        })),
      },
    ],
    fetchedAtIso: "2026-06-25T12:02:00.000Z",
    windowHours: 24,
    interval: "1h",
  });

  assert.equal(trend.label, "persistent_funding_cost");
  assert.match(trend.rows[0]?.summary ?? "", /persistent cost/);
});
