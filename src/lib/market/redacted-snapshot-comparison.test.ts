import assert from "node:assert/strict";
import test from "node:test";

import type { redacted_receipt_bundle } from "../receipts/portable-receipt-bundle.ts";
import { buildRedactedSnapshotComparison } from "./redacted-snapshot-comparison.ts";

const previousBundle: redacted_receipt_bundle = {
  kind: "perps-risk-receipt.redacted.v1",
  version: 1,
  privacy_level: "redacted_summary",
  exported_at_iso: "2026-06-26T11:00:00.000Z",
  receipt_id: "rr_previous",
  snapshot_hash:
    "0x1111111111111111111111111111111111111111111111111111111111111111",
  created_at_iso: "2026-06-26T10:59:00.000Z",
  data_time_iso: "2026-06-26T10:55:00.000Z",
  protocol: "hyperliquid",
  source: "live",
  freshness: "live",
  aggregate: {
    risk_score: 78,
    risk_label: "high",
    margin_usage_bps: 6_000,
    min_liquidation_distance_bps: 700,
    account_value_bucket_usd: "$50k-$100k",
    total_notional_bucket_usd: "$100k-$250k",
    daily_funding_bucket_usd: "cost $1k-$10k",
    thirty_day_funding_bucket_usd: "cost $10k-$50k",
    position_count: 2,
  },
  markets: [
    {
      market: "ETH-PERP",
      side: "long",
      notional_bucket_usd: "$50k-$100k",
      liquidation_distance_bps: 700,
      funding_8h_bps_user_perspective: 1.5,
      open_interest_bucket_usd: "$250k-$1m",
    },
    {
      market: "BTC-PERP",
      side: "short",
      notional_bucket_usd: "$10k-$50k",
      liquidation_distance_bps: 1_400,
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

const improvedBundle: redacted_receipt_bundle = {
  ...previousBundle,
  exported_at_iso: "2026-06-26T12:00:00.000Z",
  receipt_id: "rr_latest_improved",
  snapshot_hash:
    "0x2222222222222222222222222222222222222222222222222222222222222222",
  created_at_iso: "2026-06-26T11:59:00.000Z",
  data_time_iso: "2026-06-26T11:55:00.000Z",
  aggregate: {
    ...previousBundle.aggregate,
    risk_score: 42,
    risk_label: "medium",
    margin_usage_bps: 3_500,
    min_liquidation_distance_bps: 2_000,
    account_value_bucket_usd: "$100k-$250k",
    total_notional_bucket_usd: "$50k-$100k",
    daily_funding_bucket_usd: "earn $0-$1k",
    thirty_day_funding_bucket_usd: "cost $1k-$10k",
    position_count: 1,
  },
  markets: [
    {
      market: "ETH-PERP",
      side: "long",
      notional_bucket_usd: "$10k-$50k",
      liquidation_distance_bps: 2_000,
      funding_8h_bps_user_perspective: -0.2,
      open_interest_bucket_usd: "$250k-$1m",
    },
  ],
};

const worsenedBundle: redacted_receipt_bundle = {
  ...previousBundle,
  exported_at_iso: "2026-06-26T12:00:00.000Z",
  receipt_id: "rr_latest_worse",
  snapshot_hash:
    "0x3333333333333333333333333333333333333333333333333333333333333333",
  created_at_iso: "2026-06-26T11:59:00.000Z",
  data_time_iso: "2026-06-26T11:55:00.000Z",
  aggregate: {
    ...previousBundle.aggregate,
    risk_score: 96,
    risk_label: "critical",
    margin_usage_bps: 8_900,
    min_liquidation_distance_bps: 300,
    account_value_bucket_usd: "$10k-$50k",
    total_notional_bucket_usd: "$250k-$1m",
    daily_funding_bucket_usd: "cost $10k-$50k",
    thirty_day_funding_bucket_usd: "cost $50k-$100k",
    position_count: 3,
  },
  markets: [
    {
      market: "ETH-PERP",
      side: "long",
      notional_bucket_usd: "$100k-$250k",
      liquidation_distance_bps: 300,
      funding_8h_bps_user_perspective: 3.2,
      open_interest_bucket_usd: "$1m+",
    },
    ...previousBundle.markets.slice(1),
    {
      market: "SOL-PERP",
      side: "long",
      notional_bucket_usd: "$10k-$50k",
      liquidation_distance_bps: 900,
      funding_8h_bps_user_perspective: 0.8,
    },
  ],
};

test("compares two redacted snapshots and labels visible risk improvement", () => {
  const comparison = buildRedactedSnapshotComparison({
    firstBundle: previousBundle,
    secondBundle: improvedBundle,
    nowIso: "2026-06-26T12:10:00.000Z",
  });

  assert.equal(comparison.label, "risk_improved");
  assert.equal(comparison.previous_receipt_id, "rr_previous");
  assert.equal(comparison.latest_receipt_id, "rr_latest_improved");
  assert.equal(comparison.risk_score_delta, -36);
  assert.ok(comparison.improved_count > comparison.worsened_count);
  assert.ok(
    comparison.metrics.some(
      (metric) =>
        metric.id === "minimum-disclosed-buffer" &&
        metric.direction === "improved" &&
        metric.previous_value === "7.00%" &&
        metric.latest_value === "20.00%",
    ),
  );
  assert.ok(
    comparison.market_changes.some(
      (change) =>
        change.id === "BTC-PERP:short:removed" &&
        change.direction === "changed",
    ),
  );
  assert.ok(
    comparison.citations.includes(
      "previous_redacted_receipt.aggregate.risk_score",
    ),
  );
});

test("compares two redacted snapshots and labels visible risk worsening", () => {
  const comparison = buildRedactedSnapshotComparison({
    firstBundle: previousBundle,
    secondBundle: worsenedBundle,
    nowIso: "2026-06-26T12:10:00.000Z",
  });

  assert.equal(comparison.label, "risk_worsened");
  assert.equal(comparison.risk_score_delta, 18);
  assert.ok(comparison.worsened_count > comparison.improved_count);
  assert.ok(
    comparison.metrics.some(
      (metric) =>
        metric.id === "redacted-only-watch-severity" &&
        metric.direction === "worsened" &&
        metric.latest_value === "critical",
    ),
  );
  assert.ok(
    comparison.market_changes.some(
      (change) =>
        change.id === "SOL-PERP:long:added" &&
        change.title === "Disclosed market row added",
    ),
  );
});

test("orders inputs by data timestamp before comparing", () => {
  const comparison = buildRedactedSnapshotComparison({
    firstBundle: improvedBundle,
    secondBundle: previousBundle,
    nowIso: "2026-06-26T12:10:00.000Z",
  });

  assert.equal(comparison.previous_receipt_id, "rr_previous");
  assert.equal(comparison.latest_receipt_id, "rr_latest_improved");
  assert.equal(comparison.label, "risk_improved");
});

test("marks protocol or source changes as not directly comparable", () => {
  const fixtureBundle: redacted_receipt_bundle = {
    ...improvedBundle,
    source: "fixture",
  };
  const comparison = buildRedactedSnapshotComparison({
    firstBundle: previousBundle,
    secondBundle: fixtureBundle,
    nowIso: "2026-06-26T12:10:00.000Z",
  });

  assert.equal(comparison.label, "not_comparable");
  assert.match(comparison.summary, /context only/i);
});

test("keeps comparison copy redacted and points to full snapshots for proof", () => {
  const comparison = buildRedactedSnapshotComparison({
    firstBundle: previousBundle,
    secondBundle: improvedBundle,
    nowIso: "2026-06-26T12:10:00.000Z",
  });
  const visibleCopy = [
    comparison.headline,
    comparison.summary,
    ...comparison.metrics.map((metric) => metric.detail),
    ...comparison.market_changes.map((change) => change.detail),
    ...comparison.review_points,
  ].join(" ");

  assert.doesNotMatch(visibleCopy, /account_value_usd/);
  assert.doesNotMatch(visibleCopy, /entry_price_usd/);
  assert.doesNotMatch(visibleCopy, /mark_price_usd/);
  assert.doesNotMatch(visibleCopy, /liquidation_price_usd/);
  assert.doesNotMatch(visibleCopy, /unrealized_pnl_usd/);
  assert.match(visibleCopy, /full bundles/i);
});
