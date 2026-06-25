import assert from "node:assert/strict";
import test from "node:test";

import type { hyperliquid_market_context } from "../hyperliquid/adapter.ts";
import type { redacted_receipt_bundle } from "../receipts/portable-receipt-bundle.ts";
import { buildRedactedMarketContext } from "./redacted-market-context.ts";

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
      funding_8h_bps_user_perspective: 2.5,
      open_interest_bucket_usd: "$250k-$1m",
    },
    {
      market: "BTC-PERP",
      side: "short",
      notional_bucket_usd: "$50k-$100k",
      liquidation_distance_bps: 1_500,
      funding_8h_bps_user_perspective: -1.2,
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

const currentMarkets: hyperliquid_market_context[] = [
  {
    market: "ETH-PERP",
    coin: "ETH",
    found: true,
    mark_price_usd: 3_600,
    mid_price_usd: 3_598,
    oracle_price_usd: 3_590,
    previous_day_price_usd: 3_500,
    funding_8h_bps: 4.1,
    premium_bps: 1.2,
    open_interest_base: 100,
    open_interest_usd: 360_000,
    day_base_volume: 10_000,
    day_notional_volume_usd: 36_000_000,
  },
  {
    market: "BTC-PERP",
    coin: "BTC",
    found: true,
    mark_price_usd: 70_000,
    mid_price_usd: 70_005,
    oracle_price_usd: 69_980,
    previous_day_price_usd: 69_000,
    funding_8h_bps: 0.5,
    premium_bps: 0.4,
    open_interest_base: 10,
    open_interest_usd: 700_000,
    day_base_volume: 500,
    day_notional_volume_usd: 35_000_000,
  },
];

test("builds current market context without requiring the hidden full snapshot", () => {
  const context = buildRedactedMarketContext({
    bundle: redactedBundle,
    currentMarkets,
    fetchedAtIso: "2026-06-25T12:01:00.000Z",
  });

  assert.equal(context.label, "funding_more_expensive");
  assert.equal(context.matched_market_count, 2);
  assert.equal(context.rows[0]?.market, "ETH-PERP");
  assert.equal(context.rows[0]?.current_mark_price_usd, 3_600);
  assert.equal(context.rows[0]?.funding_delta_bps_user_perspective, 1.6);
  assert.equal(context.rows[1]?.current_funding_8h_bps_user_perspective, -0.5);
  assert.equal(context.rows[1]?.funding_delta_bps_user_perspective, 0.7);
  assert.match(context.summary, /raw account/);
});

test("marks unavailable context when none of the disclosed markets match", () => {
  const context = buildRedactedMarketContext({
    bundle: redactedBundle,
    currentMarkets: [
      {
        ...currentMarkets[0],
        market: "SOL-PERP",
        coin: "SOL",
      },
    ],
    fetchedAtIso: "2026-06-25T12:01:00.000Z",
  });

  assert.equal(context.label, "current_market_unavailable");
  assert.equal(context.matched_market_count, 0);
  assert.equal(context.rows[0]?.found_current_market, false);
  assert.match(context.rows[0]?.summary ?? "", /No current Hyperliquid/);
});

test("reports favorable funding when current side-adjusted funding is lower", () => {
  const context = buildRedactedMarketContext({
    bundle: redactedBundle,
    currentMarkets: [
      {
        ...currentMarkets[0],
        funding_8h_bps: 0.8,
      },
      currentMarkets[1],
    ],
    fetchedAtIso: "2026-06-25T12:01:00.000Z",
  });

  assert.equal(context.label, "funding_more_favorable");
  assert.equal(context.rows[0]?.funding_delta_bps_user_perspective, -1.7);
});
