import assert from "node:assert/strict";
import test from "node:test";

import type { redacted_receipt_bundle } from "../receipts/portable-receipt-bundle.ts";
import type { redacted_market_context } from "./redacted-market-context.ts";
import type { redacted_market_trend } from "./redacted-market-trend.ts";
import { getRedactedReviewThresholdProfile } from "./redacted-review-thresholds.ts";
import { buildRedactedMarketWatchlist } from "./redacted-market-watchlist.ts";

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

const marketContext: redacted_market_context = {
  label: "funding_more_expensive",
  headline: "Current funding is more expensive.",
  summary: "Public context only.",
  fetched_at_iso: "2026-06-25T12:01:00.000Z",
  matched_market_count: 2,
  rows: [
    {
      market: "ETH-PERP",
      side: "long",
      notional_bucket_usd: "$10k-$50k",
      receipt_liquidation_distance_bps: 900,
      receipt_funding_8h_bps_user_perspective: 1.2,
      current_mark_price_usd: 2_900,
      current_oracle_price_usd: 2_895,
      current_funding_8h_bps_user_perspective: 2.7,
      funding_delta_bps_user_perspective: 1.5,
      current_open_interest_usd: 360_000,
      current_day_notional_volume_usd: 36_000_000,
      found_current_market: true,
      summary: "Current funding is more expensive.",
    },
    {
      market: "BTC-PERP",
      side: "short",
      notional_bucket_usd: "$50k-$100k",
      receipt_liquidation_distance_bps: 1_500,
      receipt_funding_8h_bps_user_perspective: -0.5,
      current_mark_price_usd: 70_000,
      current_oracle_price_usd: 69_980,
      current_funding_8h_bps_user_perspective: -0.4,
      funding_delta_bps_user_perspective: 0.1,
      current_open_interest_usd: 700_000,
      current_day_notional_volume_usd: 35_000_000,
      found_current_market: true,
      summary: "Current funding is close.",
    },
  ],
};

const marketTrend: redacted_market_trend = {
  label: "adverse_price_trend",
  headline: "At least one disclosed side has an adverse trend.",
  summary: "Public trend only.",
  fetched_at_iso: "2026-06-25T12:02:00.000Z",
  window_hours: 24,
  interval: "1h",
  matched_market_count: 2,
  rows: [
    {
      market: "ETH-PERP",
      side: "long",
      receipt_liquidation_distance_bps: 900,
      receipt_funding_8h_bps_user_perspective: 1.2,
      candle_count: 2,
      funding_point_count: 2,
      first_close_price_usd: 3_000,
      latest_close_price_usd: 2_900,
      high_price_usd: 3_040,
      low_price_usd: 2_880,
      price_change_percent: -3.33,
      high_low_range_percent: 5.52,
      latest_funding_8h_bps_user_perspective: 2.2,
      average_funding_8h_bps_user_perspective: 2,
      average_funding_delta_from_receipt_bps: 0.8,
      close_prices_usd: [3_000, 2_900],
      has_history: true,
      summary: "Adverse trend.",
    },
    {
      market: "BTC-PERP",
      side: "short",
      receipt_liquidation_distance_bps: 1_500,
      receipt_funding_8h_bps_user_perspective: -0.5,
      candle_count: 2,
      funding_point_count: 1,
      first_close_price_usd: 70_000,
      latest_close_price_usd: 70_500,
      high_price_usd: 71_000,
      low_price_usd: 69_500,
      price_change_percent: 0.71,
      high_low_range_percent: 2.13,
      latest_funding_8h_bps_user_perspective: -0.4,
      average_funding_8h_bps_user_perspective: -0.4,
      average_funding_delta_from_receipt_bps: 0.1,
      close_prices_usd: [70_000, 70_500],
      has_history: true,
      summary: "Loaded.",
    },
  ],
};

test("builds high-attention cues when adverse trend overlaps tight buffer", () => {
  const watchlist = buildRedactedMarketWatchlist({
    bundle: redactedBundle,
    marketContext,
    marketTrend,
  });

  assert.equal(watchlist.label, "high_attention");
  assert.equal(watchlist.high_count, 3);
  assert.equal(watchlist.items[0]?.severity, "high");
  assert.equal(watchlist.items[0]?.market, "ETH-PERP");
  assert.ok(
    watchlist.items.some(
      (item) =>
        item.category === "adverse_trend" &&
        item.title === "Adverse trend near disclosed buffer",
    ),
  );
  assert.ok(
    watchlist.items.every((item) => !item.detail.includes("0x")),
  );
});

test("combines persistent and more expensive funding into one high cue", () => {
  const watchlist = buildRedactedMarketWatchlist({
    bundle: redactedBundle,
    marketContext,
    marketTrend,
  });
  const fundingItems = watchlist.items.filter(
    (item) => item.category === "funding_cost",
  );

  assert.equal(fundingItems.length, 1);
  assert.equal(fundingItems[0]?.severity, "high");
  assert.equal(
    fundingItems[0]?.title,
    "Funding cost is persistent and more expensive now",
  );
});

test("uses relaxed thresholds to reduce public review sensitivity", () => {
  const watchlist = buildRedactedMarketWatchlist({
    bundle: redactedBundle,
    marketContext,
    marketTrend,
    thresholds: getRedactedReviewThresholdProfile("relaxed").thresholds,
  });

  assert.equal(watchlist.label, "watch_items_loaded");
  assert.equal(watchlist.high_count, 0);
  assert.ok(watchlist.watch_count > 0);
  assert.equal(watchlist.thresholds.tight_liquidation_distance_bps, 700);
});

test("reports missing public context without exposing hidden snapshot fields", () => {
  const watchlist = buildRedactedMarketWatchlist({
    bundle: redactedBundle,
    marketContext: {
      ...marketContext,
      matched_market_count: 0,
      rows: marketContext.rows.map((row) => ({
        ...row,
        current_mark_price_usd: null,
        current_oracle_price_usd: null,
        current_funding_8h_bps_user_perspective: null,
        funding_delta_bps_user_perspective: null,
        current_open_interest_usd: null,
        current_day_notional_volume_usd: null,
        found_current_market: false,
      })),
    },
    marketTrend: {
      ...marketTrend,
      matched_market_count: 0,
      rows: marketTrend.rows.map((row) => ({
        ...row,
        candle_count: 0,
        funding_point_count: 0,
        first_close_price_usd: null,
        latest_close_price_usd: null,
        high_price_usd: null,
        low_price_usd: null,
        price_change_percent: null,
        high_low_range_percent: null,
        latest_funding_8h_bps_user_perspective: null,
        average_funding_8h_bps_user_perspective: null,
        average_funding_delta_from_receipt_bps: null,
        close_prices_usd: [],
        has_history: false,
      })),
    },
  });

  assert.equal(
    watchlist.items.filter((item) => item.category === "missing_market_context")
      .length,
    2,
  );
  assert.equal(
    watchlist.items.filter((item) => item.category === "missing_history").length,
    2,
  );
  assert.match(watchlist.summary, /not a trading recommendation/i);
});

test("prompts for loaded context before building review cues", () => {
  const watchlist = buildRedactedMarketWatchlist({
    bundle: redactedBundle,
  });

  assert.equal(watchlist.label, "no_loaded_context");
  assert.equal(watchlist.item_count, 0);
  assert.match(watchlist.headline, /Load market context/);
});
