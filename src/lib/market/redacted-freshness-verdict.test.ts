import assert from "node:assert/strict";
import test from "node:test";

import type { redacted_receipt_bundle } from "../receipts/portable-receipt-bundle.ts";
import type { redacted_market_context } from "./redacted-market-context.ts";
import type { redacted_market_trend } from "./redacted-market-trend.ts";
import { buildRedactedFreshnessVerdict } from "./redacted-freshness-verdict.ts";
import { buildRedactedMarketWatchlist } from "./redacted-market-watchlist.ts";
import { getRedactedReviewThresholdProfile } from "./redacted-review-thresholds.ts";

const nowIso = "2026-06-26T12:10:00.000Z";

const redactedBundle: redacted_receipt_bundle = {
  kind: "perps-risk-receipt.redacted.v1",
  version: 1,
  privacy_level: "redacted_summary",
  exported_at_iso: "2026-06-26T12:00:00.000Z",
  receipt_id: "rr_redacted_freshness",
  snapshot_hash:
    "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  created_at_iso: "2026-06-26T11:59:00.000Z",
  data_time_iso: "2026-06-26T11:55:00.000Z",
  protocol: "hyperliquid",
  source: "live",
  freshness: "live",
  aggregate: {
    risk_score: 45,
    risk_label: "medium",
    margin_usage_bps: 3_000,
    min_liquidation_distance_bps: 2_500,
    account_value_bucket_usd: "$50k-$100k",
    total_notional_bucket_usd: "$100k-$250k",
    daily_funding_bucket_usd: "cost $0-$1k",
    thirty_day_funding_bucket_usd: "cost $1k-$10k",
    position_count: 2,
  },
  markets: [
    {
      market: "ETH-PERP",
      side: "long",
      notional_bucket_usd: "$10k-$50k",
      liquidation_distance_bps: 2_500,
      funding_8h_bps_user_perspective: 0.2,
      open_interest_bucket_usd: "$250k-$1m",
    },
    {
      market: "BTC-PERP",
      side: "short",
      notional_bucket_usd: "$50k-$100k",
      liquidation_distance_bps: 3_000,
      funding_8h_bps_user_perspective: -0.2,
    },
  ],
  redacted_fields: [
    "account",
    "position sizes",
    "entry prices",
    "mark prices",
    "liquidation prices",
    "unrealized pnl",
  ],
  verification_scope:
    "snapshot_hash_reference_only_full_snapshot_required_to_recompute",
};

const marketContext: redacted_market_context = {
  label: "current_market_loaded",
  headline: "Current public market context is loaded.",
  summary: "Public current context only.",
  fetched_at_iso: "2026-06-26T12:09:00.000Z",
  matched_market_count: 2,
  rows: [
    {
      market: "ETH-PERP",
      side: "long",
      notional_bucket_usd: "$10k-$50k",
      receipt_liquidation_distance_bps: 2_500,
      receipt_funding_8h_bps_user_perspective: 0.2,
      current_mark_price_usd: 2_990,
      current_oracle_price_usd: 2_988,
      current_funding_8h_bps_user_perspective: 0.3,
      funding_delta_bps_user_perspective: 0.1,
      current_open_interest_usd: 360_000,
      current_day_notional_volume_usd: 36_000_000,
      found_current_market: true,
      summary: "Current funding is close.",
    },
    {
      market: "BTC-PERP",
      side: "short",
      notional_bucket_usd: "$50k-$100k",
      receipt_liquidation_distance_bps: 3_000,
      receipt_funding_8h_bps_user_perspective: -0.2,
      current_mark_price_usd: 70_000,
      current_oracle_price_usd: 69_980,
      current_funding_8h_bps_user_perspective: -0.1,
      funding_delta_bps_user_perspective: 0.1,
      current_open_interest_usd: 700_000,
      current_day_notional_volume_usd: 35_000_000,
      found_current_market: true,
      summary: "Current funding is close.",
    },
  ],
};

const marketTrend: redacted_market_trend = {
  label: "market_history_loaded",
  headline: "24h public market history is loaded.",
  summary: "Public trend context only.",
  fetched_at_iso: "2026-06-26T12:09:00.000Z",
  window_hours: 24,
  interval: "1h",
  matched_market_count: 2,
  rows: [
    {
      market: "ETH-PERP",
      side: "long",
      receipt_liquidation_distance_bps: 2_500,
      receipt_funding_8h_bps_user_perspective: 0.2,
      candle_count: 2,
      funding_point_count: 2,
      first_close_price_usd: 3_000,
      latest_close_price_usd: 2_985,
      high_price_usd: 3_010,
      low_price_usd: 2_986,
      price_change_percent: -0.5,
      high_low_range_percent: 0.8,
      latest_funding_8h_bps_user_perspective: 0.3,
      average_funding_8h_bps_user_perspective: 0.25,
      average_funding_delta_from_receipt_bps: 0.05,
      close_prices_usd: [3_000, 2_985],
      has_history: true,
      summary: "Public 24h history is loaded.",
    },
    {
      market: "BTC-PERP",
      side: "short",
      receipt_liquidation_distance_bps: 3_000,
      receipt_funding_8h_bps_user_perspective: -0.2,
      candle_count: 2,
      funding_point_count: 1,
      first_close_price_usd: 70_000,
      latest_close_price_usd: 69_720,
      high_price_usd: 70_200,
      low_price_usd: 69_500,
      price_change_percent: -0.4,
      high_low_range_percent: 1,
      latest_funding_8h_bps_user_perspective: -0.1,
      average_funding_8h_bps_user_perspective: -0.1,
      average_funding_delta_from_receipt_bps: 0.1,
      close_prices_usd: [70_000, 69_720],
      has_history: true,
      summary: "Public 24h history is loaded.",
    },
  ],
};

function buildVerdict(input?: {
  bundle?: redacted_receipt_bundle;
  context?: redacted_market_context;
  trend?: redacted_market_trend;
  nowIso?: string;
}) {
  const bundle = input?.bundle ?? redactedBundle;
  const context = input?.context ?? marketContext;
  const trend = input?.trend ?? marketTrend;
  const watchlist = buildRedactedMarketWatchlist({
    bundle,
    marketContext: context,
    marketTrend: trend,
  });

  return buildRedactedFreshnessVerdict({
    bundle,
    marketContext: context,
    marketTrend: trend,
    watchlist,
    nowIso: input?.nowIso ?? nowIso,
  });
}

test("marks a recent redacted share reviewable when loaded public context is calm", () => {
  const verdict = buildVerdict();

  assert.equal(verdict.label, "reviewable");
  assert.equal(verdict.high_count, 0);
  assert.equal(verdict.watch_count, 0);
  assert.equal(verdict.age_label, "15m");
  assert.ok(
    verdict.drivers.some(
      (driver) =>
        driver.category === "market_context" && driver.severity === "info",
    ),
  );
  assert.ok(verdict.citations.includes("redacted_receipt.data_time_iso"));
});

test("marks a redacted share stale but informative when public context is not loaded", () => {
  const watchlist = buildRedactedMarketWatchlist({ bundle: redactedBundle });
  const verdict = buildRedactedFreshnessVerdict({
    bundle: redactedBundle,
    watchlist,
    nowIso,
  });

  assert.equal(verdict.label, "stale_but_informative");
  assert.equal(verdict.high_count, 0);
  assert.ok(
    verdict.drivers.some(
      (driver) =>
        driver.category === "market_context" &&
        driver.id === "market-context:not-loaded",
    ),
  );
  assert.ok(
    verdict.drivers.some(
      (driver) =>
        driver.category === "trend_context" &&
        driver.id === "trend-context:not-loaded",
    ),
  );
});

test("uses strict thresholds to require a full recheck sooner", () => {
  const thresholds = getRedactedReviewThresholdProfile("strict").thresholds;
  const watchlist = buildRedactedMarketWatchlist({
    bundle: redactedBundle,
    thresholds,
  });
  const verdict = buildRedactedFreshnessVerdict({
    bundle: redactedBundle,
    watchlist,
    nowIso: "2026-06-27T01:00:00.000Z",
    thresholds,
  });

  assert.equal(verdict.label, "needs_full_recheck");
  assert.equal(verdict.thresholds.high_age_minutes, 720);
  assert.ok(
    verdict.drivers.some(
      (driver) =>
        driver.id === "receipt-age:high" &&
        driver.title === "Receipt is older than 12h",
    ),
  );
});

test("requires full recheck when the redacted timestamp is more than 24h old", () => {
  const verdict = buildVerdict({ nowIso: "2026-06-27T12:00:00.000Z" });

  assert.equal(verdict.label, "needs_full_recheck");
  assert.ok(
    verdict.drivers.some(
      (driver) =>
        driver.category === "receipt_age" && driver.severity === "high",
    ),
  );
});

test("requires full recheck for a thin disclosed liquidation buffer", () => {
  const bundle: redacted_receipt_bundle = {
    ...redactedBundle,
    aggregate: {
      ...redactedBundle.aggregate,
      min_liquidation_distance_bps: 400,
    },
    markets: redactedBundle.markets.map((market, index) =>
      index === 0 ? { ...market, liquidation_distance_bps: 400 } : market,
    ),
  };
  const verdict = buildVerdict({ bundle });

  assert.equal(verdict.label, "needs_full_recheck");
  assert.ok(
    verdict.drivers.some(
      (driver) =>
        driver.category === "liquidation_buffer" &&
        driver.severity === "high",
    ),
  );
});

test("requires full recheck when public 24h range reaches the disclosed buffer", () => {
  const trend: redacted_market_trend = {
    ...marketTrend,
    rows: marketTrend.rows.map((row, index) =>
      index === 0 ? { ...row, high_low_range_percent: 30 } : row,
    ),
  };
  const verdict = buildVerdict({ trend });

  assert.equal(verdict.label, "needs_full_recheck");
  assert.ok(
    verdict.drivers.some(
      (driver) =>
        driver.category === "volatility_range" &&
        driver.id === "ETH-PERP:range:exceeded-buffer",
    ),
  );
  assert.ok(
    verdict.citations.includes(
      "redacted_market_trend.rows.ETH-PERP.high_low_range_percent",
    ),
  );
});

test("escalates adverse public trend when the disclosed buffer is tight", () => {
  const bundle: redacted_receipt_bundle = {
    ...redactedBundle,
    aggregate: {
      ...redactedBundle.aggregate,
      min_liquidation_distance_bps: 900,
    },
    markets: redactedBundle.markets.map((market, index) =>
      index === 0 ? { ...market, liquidation_distance_bps: 900 } : market,
    ),
  };
  const trend: redacted_market_trend = {
    ...marketTrend,
    rows: marketTrend.rows.map((row, index) =>
      index === 0
        ? {
            ...row,
            receipt_liquidation_distance_bps: 900,
            price_change_percent: -2.5,
          }
        : row,
    ),
  };
  const verdict = buildVerdict({ bundle, trend });

  assert.equal(verdict.label, "needs_full_recheck");
  assert.ok(
    verdict.drivers.some(
      (driver) =>
        driver.category === "adverse_trend" && driver.severity === "high",
    ),
  );
});

test("marks the share stale when funding has moved materially", () => {
  const context: redacted_market_context = {
    ...marketContext,
    rows: marketContext.rows.map((row, index) =>
      index === 0
        ? { ...row, funding_delta_bps_user_perspective: 1.5 }
        : row,
    ),
  };
  const verdict = buildVerdict({ context });

  assert.equal(verdict.label, "stale_but_informative");
  assert.ok(
    verdict.drivers.some(
      (driver) =>
        driver.category === "funding_change" && driver.severity === "watch",
    ),
  );
});

test("keeps verdict copy redacted and field-level citations explicit", () => {
  const verdict = buildVerdict();
  const visibleCopy = [
    verdict.headline,
    verdict.summary,
    ...verdict.drivers.flatMap((driver) => [
      driver.title,
      driver.detail,
      ...driver.review_points,
    ]),
  ].join(" ");

  assert.doesNotMatch(visibleCopy, /account_value_usd/);
  assert.doesNotMatch(visibleCopy, /entry_price_usd/);
  assert.doesNotMatch(visibleCopy, /mark_price_usd/);
  assert.doesNotMatch(visibleCopy, /liquidation_price_usd/);
  assert.doesNotMatch(visibleCopy, /unrealized_pnl_usd/);
  assert.ok(verdict.citations.includes("redacted_freshness_verdict.label"));
});
