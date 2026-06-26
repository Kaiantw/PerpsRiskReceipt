import assert from "node:assert/strict";
import test from "node:test";

import type { redacted_receipt_bundle } from "../receipts/portable-receipt-bundle.ts";
import type { redacted_market_context } from "./redacted-market-context.ts";
import type { redacted_market_trend } from "./redacted-market-trend.ts";
import { buildRedactedMarketWatchlist } from "./redacted-market-watchlist.ts";
import { buildRedactedReviewPacket } from "./redacted-review-packet.ts";

const redactedBundle: redacted_receipt_bundle = {
  kind: "perps-risk-receipt.redacted.v1",
  version: 1,
  privacy_level: "redacted_summary",
  exported_at_iso: "2026-06-25T12:00:00.000Z",
  receipt_id: "rr_redacted_packet",
  snapshot_hash:
    "0x1111111111111111111111111111111111111111111111111111111111111111",
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
    daily_funding_bucket_usd: "cost $0-$1k",
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

test("builds a copyable redacted markdown packet from disclosed and public context", () => {
  const watchlist = buildRedactedMarketWatchlist({
    bundle: redactedBundle,
    marketContext,
    marketTrend,
  });
  const packet = buildRedactedReviewPacket({
    bundle: redactedBundle,
    marketContext,
    marketTrend,
    watchlist,
  });

  assert.equal(packet.title, "Redacted review packet for rr_redacted_packet");
  assert.match(packet.summary, /high 65/);
  assert.match(packet.markdown, /## redacted receipt/);
  assert.match(packet.markdown, /snapshot hash reference/);
  assert.match(packet.markdown, /account value bucket: \$50k-\$100k/);
  assert.match(packet.markdown, /ETH-PERP long: notional \$10k-\$50k/);
  assert.match(packet.markdown, /## public current market context/);
  assert.match(packet.markdown, /funding delta \+1.50 bps/);
  assert.match(packet.markdown, /## public 24h trend/);
  assert.match(packet.markdown, /24h price -3.33%/);
  assert.match(packet.markdown, /## redacted review watchlist/);
  assert.match(packet.markdown, /Adverse trend near disclosed buffer/);
  assert.match(packet.markdown, /hidden full snapshot is required/);
  assert.doesNotMatch(packet.markdown, /account_value_usd/);
  assert.doesNotMatch(packet.markdown, /entry_price_usd/);
  assert.doesNotMatch(packet.markdown, /mark_price_usd/);
  assert.doesNotMatch(packet.markdown, /liquidation_price_usd/);
  assert.doesNotMatch(packet.markdown, /unrealized_pnl_usd/);
});

test("explains missing public context without claiming hash recomputation", () => {
  const watchlist = buildRedactedMarketWatchlist({
    bundle: redactedBundle,
  });
  const packet = buildRedactedReviewPacket({
    bundle: redactedBundle,
    watchlist,
  });

  assert.match(packet.markdown, /public current market context/);
  assert.match(packet.markdown, /status: not loaded/);
  assert.match(packet.markdown, /public 24h trend/);
  assert.match(packet.markdown, /Load market context or 24h trends/);
  assert.match(packet.markdown, /cannot recompute or verify it/);
  assert.match(packet.markdown, /not protocol-official risk calculations/);
  assert.doesNotMatch(packet.markdown, /should close/i);
  assert.doesNotMatch(packet.markdown, /should increase/i);
});
