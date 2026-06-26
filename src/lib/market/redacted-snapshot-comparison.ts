import {
  buildRedactedFreshnessVerdict,
  type redacted_freshness_verdict,
  type redacted_freshness_verdict_label,
} from "./redacted-freshness-verdict.ts";
import { buildRedactedMarketWatchlist } from "./redacted-market-watchlist.ts";
import type {
  redacted_receipt_bundle,
  redacted_receipt_market,
} from "../receipts/portable-receipt-bundle.ts";

export type redacted_snapshot_comparison_direction =
  | "improved"
  | "worsened"
  | "changed"
  | "unchanged"
  | "not_comparable";

export type redacted_snapshot_comparison_label =
  | "risk_improved"
  | "risk_worsened"
  | "risk_changed"
  | "unchanged"
  | "not_comparable";

export type redacted_snapshot_comparison_metric = {
  id: string;
  label: string;
  direction: redacted_snapshot_comparison_direction;
  previous_value: string;
  latest_value: string;
  detail: string;
  citations: string[];
};

export type redacted_snapshot_market_change = {
  id: string;
  market: string;
  direction: redacted_snapshot_comparison_direction;
  title: string;
  detail: string;
  citations: string[];
};

export type redacted_snapshot_comparison = {
  label: redacted_snapshot_comparison_label;
  headline: string;
  summary: string;
  previous_receipt_id: string;
  latest_receipt_id: string;
  previous_data_time_iso: string;
  latest_data_time_iso: string;
  previous_freshness_verdict: redacted_freshness_verdict;
  latest_freshness_verdict: redacted_freshness_verdict;
  risk_score_delta: number;
  metric_count: number;
  improved_count: number;
  worsened_count: number;
  changed_count: number;
  unchanged_count: number;
  metrics: redacted_snapshot_comparison_metric[];
  market_changes: redacted_snapshot_market_change[];
  review_points: string[];
  citations: string[];
};

export function buildRedactedSnapshotComparison(input: {
  firstBundle: redacted_receipt_bundle;
  secondBundle: redacted_receipt_bundle;
  nowIso?: string;
}): redacted_snapshot_comparison {
  const orderedBundles = orderBundlesByDataTime({
    firstBundle: input.firstBundle,
    secondBundle: input.secondBundle,
  });
  const previousBundle = orderedBundles.previousBundle;
  const latestBundle = orderedBundles.latestBundle;
  const previousFreshnessVerdict = buildRedactedOnlyFreshnessVerdict({
    bundle: previousBundle,
    nowIso: input.nowIso,
  });
  const latestFreshnessVerdict = buildRedactedOnlyFreshnessVerdict({
    bundle: latestBundle,
    nowIso: input.nowIso,
  });
  const baseMetrics = buildBaseMetrics({
    previousBundle,
    latestBundle,
    previousFreshnessVerdict,
    latestFreshnessVerdict,
  });
  const marketChanges = buildMarketChanges({ previousBundle, latestBundle });
  const metrics = [
    ...baseMetrics,
    buildMarketChangeMetric(marketChanges),
  ].sort(compareMetrics);
  const improvedCount = metrics.filter(
    (metric) => metric.direction === "improved",
  ).length;
  const worsenedCount = metrics.filter(
    (metric) => metric.direction === "worsened",
  ).length;
  const changedCount = metrics.filter(
    (metric) => metric.direction === "changed",
  ).length;
  const unchangedCount = metrics.filter(
    (metric) => metric.direction === "unchanged",
  ).length;
  const label = getComparisonLabel({
    previousBundle,
    latestBundle,
    improvedCount,
    worsenedCount,
    changedCount,
  });

  return {
    label,
    headline: getHeadline(label),
    summary: getSummary(label),
    previous_receipt_id: previousBundle.receipt_id,
    latest_receipt_id: latestBundle.receipt_id,
    previous_data_time_iso: previousBundle.data_time_iso,
    latest_data_time_iso: latestBundle.data_time_iso,
    previous_freshness_verdict: previousFreshnessVerdict,
    latest_freshness_verdict: latestFreshnessVerdict,
    risk_score_delta:
      latestBundle.aggregate.risk_score - previousBundle.aggregate.risk_score,
    metric_count: metrics.length,
    improved_count: improvedCount,
    worsened_count: worsenedCount,
    changed_count: changedCount,
    unchanged_count: unchangedCount,
    metrics,
    market_changes: marketChanges,
    review_points: getReviewPoints(label),
    citations: getComparisonCitations({ metrics, marketChanges }),
  };
}

function buildRedactedOnlyFreshnessVerdict(input: {
  bundle: redacted_receipt_bundle;
  nowIso: string | undefined;
}) {
  const watchlist = buildRedactedMarketWatchlist({ bundle: input.bundle });

  return buildRedactedFreshnessVerdict({
    bundle: input.bundle,
    watchlist,
    nowIso: input.nowIso,
  });
}

function orderBundlesByDataTime(input: {
  firstBundle: redacted_receipt_bundle;
  secondBundle: redacted_receipt_bundle;
}) {
  const firstTimeMs = Date.parse(input.firstBundle.data_time_iso);
  const secondTimeMs = Date.parse(input.secondBundle.data_time_iso);

  if (
    Number.isFinite(firstTimeMs) &&
    Number.isFinite(secondTimeMs) &&
    firstTimeMs > secondTimeMs
  ) {
    return {
      previousBundle: input.secondBundle,
      latestBundle: input.firstBundle,
    };
  }

  return {
    previousBundle: input.firstBundle,
    latestBundle: input.secondBundle,
  };
}

function buildBaseMetrics(input: {
  previousBundle: redacted_receipt_bundle;
  latestBundle: redacted_receipt_bundle;
  previousFreshnessVerdict: redacted_freshness_verdict;
  latestFreshnessVerdict: redacted_freshness_verdict;
}) {
  const previousWatchSeverity = getDisclosedWatchSeverity(input.previousBundle);
  const latestWatchSeverity = getDisclosedWatchSeverity(input.latestBundle);

  return [
    compareNumberMetric({
      id: "risk-score",
      label: "Risk score",
      previousValue: input.previousBundle.aggregate.risk_score,
      latestValue: input.latestBundle.aggregate.risk_score,
      lowerIsBetter: true,
      formatValue: String,
      citations: [
        "previous_redacted_receipt.aggregate.risk_score",
        "latest_redacted_receipt.aggregate.risk_score",
      ],
    }),
    compareRankMetric({
      id: "risk-label",
      label: "Risk label",
      previousValue: input.previousBundle.aggregate.risk_label,
      latestValue: input.latestBundle.aggregate.risk_label,
      previousRank: getRiskLabelRank(input.previousBundle.aggregate.risk_label),
      latestRank: getRiskLabelRank(input.latestBundle.aggregate.risk_label),
      lowerIsBetter: true,
      citations: [
        "previous_redacted_receipt.aggregate.risk_label",
        "latest_redacted_receipt.aggregate.risk_label",
      ],
    }),
    compareNumberMetric({
      id: "margin-usage",
      label: "Margin usage",
      previousValue: input.previousBundle.aggregate.margin_usage_bps,
      latestValue: input.latestBundle.aggregate.margin_usage_bps,
      lowerIsBetter: true,
      formatValue: formatBpsAsPercent,
      citations: [
        "previous_redacted_receipt.aggregate.margin_usage_bps",
        "latest_redacted_receipt.aggregate.margin_usage_bps",
      ],
    }),
    compareNullableNumberMetric({
      id: "minimum-disclosed-buffer",
      label: "Minimum disclosed buffer",
      previousValue:
        input.previousBundle.aggregate.min_liquidation_distance_bps,
      latestValue: input.latestBundle.aggregate.min_liquidation_distance_bps,
      higherIsBetter: true,
      formatValue: formatNullableBpsAsPercent,
      citations: [
        "previous_redacted_receipt.aggregate.min_liquidation_distance_bps",
        "latest_redacted_receipt.aggregate.min_liquidation_distance_bps",
      ],
    }),
    compareRankMetric({
      id: "redacted-only-watch-severity",
      label: "Disclosed watch severity",
      previousValue: previousWatchSeverity,
      latestValue: latestWatchSeverity,
      previousRank: getWatchSeverityRank(previousWatchSeverity),
      latestRank: getWatchSeverityRank(latestWatchSeverity),
      lowerIsBetter: true,
      citations: [
        "previous_redacted_receipt.aggregate.risk_label",
        "previous_redacted_receipt.aggregate.min_liquidation_distance_bps",
        "latest_redacted_receipt.aggregate.risk_label",
        "latest_redacted_receipt.aggregate.min_liquidation_distance_bps",
      ],
    }),
    compareRankMetric({
      id: "redacted-only-freshness",
      label: "Redacted-only freshness",
      previousValue: formatFreshnessLabel(
        input.previousFreshnessVerdict.label,
      ),
      latestValue: formatFreshnessLabel(input.latestFreshnessVerdict.label),
      previousRank: getFreshnessLabelRank(
        input.previousFreshnessVerdict.label,
      ),
      latestRank: getFreshnessLabelRank(input.latestFreshnessVerdict.label),
      lowerIsBetter: true,
      citations: [
        "previous_redacted_freshness_verdict.label",
        "latest_redacted_freshness_verdict.label",
        "previous_redacted_receipt.data_time_iso",
        "latest_redacted_receipt.data_time_iso",
      ],
    }),
    compareNumberMetric({
      id: "position-count",
      label: "Disclosed position count",
      previousValue: input.previousBundle.aggregate.position_count,
      latestValue: input.latestBundle.aggregate.position_count,
      lowerIsBetter: false,
      formatValue: String,
      citations: [
        "previous_redacted_receipt.aggregate.position_count",
        "latest_redacted_receipt.aggregate.position_count",
      ],
      directionalChange: "changed",
    }),
    compareBucketMetric({
      id: "account-value-bucket",
      label: "Account value bucket",
      previousValue: input.previousBundle.aggregate.account_value_bucket_usd,
      latestValue: input.latestBundle.aggregate.account_value_bucket_usd,
      citations: [
        "previous_redacted_receipt.aggregate.account_value_bucket_usd",
        "latest_redacted_receipt.aggregate.account_value_bucket_usd",
      ],
    }),
    compareBucketMetric({
      id: "total-notional-bucket",
      label: "Total notional bucket",
      previousValue: input.previousBundle.aggregate.total_notional_bucket_usd,
      latestValue: input.latestBundle.aggregate.total_notional_bucket_usd,
      citations: [
        "previous_redacted_receipt.aggregate.total_notional_bucket_usd",
        "latest_redacted_receipt.aggregate.total_notional_bucket_usd",
      ],
    }),
    compareFundingBucketMetric({
      id: "daily-funding-bucket",
      label: "Daily funding bucket",
      previousValue: input.previousBundle.aggregate.daily_funding_bucket_usd,
      latestValue: input.latestBundle.aggregate.daily_funding_bucket_usd,
      citations: [
        "previous_redacted_receipt.aggregate.daily_funding_bucket_usd",
        "latest_redacted_receipt.aggregate.daily_funding_bucket_usd",
      ],
    }),
    compareFundingBucketMetric({
      id: "thirty-day-funding-bucket",
      label: "30-day funding bucket",
      previousValue:
        input.previousBundle.aggregate.thirty_day_funding_bucket_usd,
      latestValue: input.latestBundle.aggregate.thirty_day_funding_bucket_usd,
      citations: [
        "previous_redacted_receipt.aggregate.thirty_day_funding_bucket_usd",
        "latest_redacted_receipt.aggregate.thirty_day_funding_bucket_usd",
      ],
    }),
  ];
}

function compareNumberMetric(input: {
  id: string;
  label: string;
  previousValue: number;
  latestValue: number;
  lowerIsBetter: boolean;
  formatValue: (value: number) => string;
  citations: string[];
  directionalChange?: redacted_snapshot_comparison_direction;
}): redacted_snapshot_comparison_metric {
  const direction = getNumberDirection({
    previousValue: input.previousValue,
    latestValue: input.latestValue,
    lowerIsBetter: input.lowerIsBetter,
    directionalChange: input.directionalChange,
  });

  return {
    id: input.id,
    label: input.label,
    direction,
    previous_value: input.formatValue(input.previousValue),
    latest_value: input.formatValue(input.latestValue),
    detail: getMetricDetail({
      label: input.label,
      direction,
      previousValue: input.formatValue(input.previousValue),
      latestValue: input.formatValue(input.latestValue),
    }),
    citations: input.citations,
  };
}

function compareNullableNumberMetric(input: {
  id: string;
  label: string;
  previousValue: number | null;
  latestValue: number | null;
  higherIsBetter: boolean;
  formatValue: (value: number | null) => string;
  citations: string[];
}): redacted_snapshot_comparison_metric {
  const direction = getNullableNumberDirection(input);

  return {
    id: input.id,
    label: input.label,
    direction,
    previous_value: input.formatValue(input.previousValue),
    latest_value: input.formatValue(input.latestValue),
    detail: getMetricDetail({
      label: input.label,
      direction,
      previousValue: input.formatValue(input.previousValue),
      latestValue: input.formatValue(input.latestValue),
    }),
    citations: input.citations,
  };
}

function compareRankMetric(input: {
  id: string;
  label: string;
  previousValue: string;
  latestValue: string;
  previousRank: number;
  latestRank: number;
  lowerIsBetter: boolean;
  citations: string[];
}): redacted_snapshot_comparison_metric {
  const direction = getNumberDirection({
    previousValue: input.previousRank,
    latestValue: input.latestRank,
    lowerIsBetter: input.lowerIsBetter,
  });

  return {
    id: input.id,
    label: input.label,
    direction,
    previous_value: input.previousValue,
    latest_value: input.latestValue,
    detail: getMetricDetail({
      label: input.label,
      direction,
      previousValue: input.previousValue,
      latestValue: input.latestValue,
    }),
    citations: input.citations,
  };
}

function compareBucketMetric(input: {
  id: string;
  label: string;
  previousValue: string;
  latestValue: string;
  citations: string[];
}): redacted_snapshot_comparison_metric {
  const direction =
    input.previousValue === input.latestValue ? "unchanged" : "changed";

  return {
    id: input.id,
    label: input.label,
    direction,
    previous_value: input.previousValue,
    latest_value: input.latestValue,
    detail: getMetricDetail({
      label: input.label,
      direction,
      previousValue: input.previousValue,
      latestValue: input.latestValue,
    }),
    citations: input.citations,
  };
}

function compareFundingBucketMetric(input: {
  id: string;
  label: string;
  previousValue: string;
  latestValue: string;
  citations: string[];
}): redacted_snapshot_comparison_metric {
  const previousFunding = parseSignedUsdBucket(input.previousValue);
  const latestFunding = parseSignedUsdBucket(input.latestValue);
  const direction =
    previousFunding === null || latestFunding === null
      ? input.previousValue === input.latestValue
        ? "unchanged"
        : "changed"
      : getNumberDirection({
          previousValue: previousFunding,
          latestValue: latestFunding,
          lowerIsBetter: true,
        });

  return {
    id: input.id,
    label: input.label,
    direction,
    previous_value: input.previousValue,
    latest_value: input.latestValue,
    detail: getMetricDetail({
      label: input.label,
      direction,
      previousValue: input.previousValue,
      latestValue: input.latestValue,
    }),
    citations: input.citations,
  };
}

function getNumberDirection(input: {
  previousValue: number;
  latestValue: number;
  lowerIsBetter: boolean;
  directionalChange?: redacted_snapshot_comparison_direction;
}): redacted_snapshot_comparison_direction {
  if (input.previousValue === input.latestValue) {
    return "unchanged";
  }

  if (input.directionalChange) {
    return input.directionalChange;
  }

  const latestIsBetter = input.lowerIsBetter
    ? input.latestValue < input.previousValue
    : input.latestValue > input.previousValue;

  return latestIsBetter ? "improved" : "worsened";
}

function getNullableNumberDirection(input: {
  previousValue: number | null;
  latestValue: number | null;
  higherIsBetter: boolean;
}): redacted_snapshot_comparison_direction {
  if (input.previousValue === input.latestValue) {
    return "unchanged";
  }

  if (input.previousValue === null || input.latestValue === null) {
    return "changed";
  }

  const latestIsBetter = input.higherIsBetter
    ? input.latestValue > input.previousValue
    : input.latestValue < input.previousValue;

  return latestIsBetter ? "improved" : "worsened";
}

function buildMarketChanges(input: {
  previousBundle: redacted_receipt_bundle;
  latestBundle: redacted_receipt_bundle;
}) {
  const previousMarketsByKey = getMarketsByKey(input.previousBundle.markets);
  const latestMarketsByKey = getMarketsByKey(input.latestBundle.markets);
  const allMarketKeys = Array.from(
    new Set([...previousMarketsByKey.keys(), ...latestMarketsByKey.keys()]),
  ).sort();

  return allMarketKeys.flatMap((marketKey) => {
    const previousMarket = previousMarketsByKey.get(marketKey) ?? null;
    const latestMarket = latestMarketsByKey.get(marketKey) ?? null;

    return buildMarketChangeItems({
      marketKey,
      previousMarket,
      latestMarket,
    });
  });
}

function buildMarketChangeItems(input: {
  marketKey: string;
  previousMarket: redacted_receipt_market | null;
  latestMarket: redacted_receipt_market | null;
}): redacted_snapshot_market_change[] {
  if (!input.previousMarket && input.latestMarket) {
    return [
      {
        id: `${input.marketKey}:added`,
        market: input.latestMarket.market,
        direction: "changed",
        title: "Disclosed market row added",
        detail: `${input.latestMarket.market} ${input.latestMarket.side} appears in the latest redacted share.`,
        citations: [`latest_redacted_receipt.markets.${input.marketKey}`],
      },
    ];
  }

  if (input.previousMarket && !input.latestMarket) {
    return [
      {
        id: `${input.marketKey}:removed`,
        market: input.previousMarket.market,
        direction: "changed",
        title: "Disclosed market row removed",
        detail: `${input.previousMarket.market} ${input.previousMarket.side} appears in the previous redacted share but not the latest one.`,
        citations: [`previous_redacted_receipt.markets.${input.marketKey}`],
      },
    ];
  }

  if (!input.previousMarket || !input.latestMarket) {
    return [];
  }

  const matchedMarketInput = {
    marketKey: input.marketKey,
    previousMarket: input.previousMarket,
    latestMarket: input.latestMarket,
  };

  return [
    compareMarketBuffer(matchedMarketInput),
    compareMarketFunding(matchedMarketInput),
    compareMarketBucket({
      ...matchedMarketInput,
      fieldName: "notional_bucket_usd",
      fieldLabel: "notional bucket",
      title: "Notional bucket changed",
    }),
    compareMarketBucket({
      ...matchedMarketInput,
      fieldName: "open_interest_bucket_usd",
      fieldLabel: "open-interest bucket",
      title: "Open-interest bucket changed",
    }),
  ].filter(isMarketChange);
}

function compareMarketBuffer(input: {
  marketKey: string;
  previousMarket: redacted_receipt_market;
  latestMarket: redacted_receipt_market;
}): redacted_snapshot_market_change | null {
  const direction = getNullableNumberDirection({
    previousValue: input.previousMarket.liquidation_distance_bps,
    latestValue: input.latestMarket.liquidation_distance_bps,
    higherIsBetter: true,
  });

  if (direction === "unchanged") {
    return null;
  }

  return {
    id: `${input.marketKey}:liquidation-distance`,
    market: input.latestMarket.market,
    direction,
    title: "Disclosed liquidation buffer changed",
    detail: `${input.latestMarket.market} ${input.latestMarket.side} disclosed buffer moved from ${formatNullableBpsAsPercent(
      input.previousMarket.liquidation_distance_bps,
    )} to ${formatNullableBpsAsPercent(
      input.latestMarket.liquidation_distance_bps,
    )}.`,
    citations: [
      `previous_redacted_receipt.markets.${input.marketKey}.liquidation_distance_bps`,
      `latest_redacted_receipt.markets.${input.marketKey}.liquidation_distance_bps`,
    ],
  };
}

function compareMarketFunding(input: {
  marketKey: string;
  previousMarket: redacted_receipt_market;
  latestMarket: redacted_receipt_market;
}): redacted_snapshot_market_change | null {
  const direction = getNumberDirection({
    previousValue: input.previousMarket.funding_8h_bps_user_perspective,
    latestValue: input.latestMarket.funding_8h_bps_user_perspective,
    lowerIsBetter: true,
  });

  if (direction === "unchanged") {
    return null;
  }

  return {
    id: `${input.marketKey}:funding`,
    market: input.latestMarket.market,
    direction,
    title: "Disclosed funding changed",
    detail: `${input.latestMarket.market} ${input.latestMarket.side} side-adjusted funding moved from ${formatSignedBps(
      input.previousMarket.funding_8h_bps_user_perspective,
    )} to ${formatSignedBps(
      input.latestMarket.funding_8h_bps_user_perspective,
    )}.`,
    citations: [
      `previous_redacted_receipt.markets.${input.marketKey}.funding_8h_bps_user_perspective`,
      `latest_redacted_receipt.markets.${input.marketKey}.funding_8h_bps_user_perspective`,
    ],
  };
}

function compareMarketBucket(input: {
  marketKey: string;
  previousMarket: redacted_receipt_market;
  latestMarket: redacted_receipt_market;
  fieldName: "notional_bucket_usd" | "open_interest_bucket_usd";
  fieldLabel: string;
  title: string;
}): redacted_snapshot_market_change | null {
  const previousValue = input.previousMarket[input.fieldName] ?? "n/a";
  const latestValue = input.latestMarket[input.fieldName] ?? "n/a";

  if (previousValue === latestValue) {
    return null;
  }

  return {
    id: `${input.marketKey}:${input.fieldName}`,
    market: input.latestMarket.market,
    direction: "changed",
    title: input.title,
    detail: `${input.latestMarket.market} ${input.latestMarket.side} ${input.fieldLabel} moved from ${previousValue} to ${latestValue}.`,
    citations: [
      `previous_redacted_receipt.markets.${input.marketKey}.${input.fieldName}`,
      `latest_redacted_receipt.markets.${input.marketKey}.${input.fieldName}`,
    ],
  };
}

function buildMarketChangeMetric(
  marketChanges: redacted_snapshot_market_change[],
): redacted_snapshot_comparison_metric {
  const worsenedCount = marketChanges.filter(
    (change) => change.direction === "worsened",
  ).length;
  const improvedCount = marketChanges.filter(
    (change) => change.direction === "improved",
  ).length;
  const direction =
    worsenedCount > 0
      ? "worsened"
      : improvedCount > 0
        ? "improved"
        : marketChanges.length > 0
          ? "changed"
          : "unchanged";

  return {
    id: "disclosed-market-rows",
    label: "Disclosed market rows",
    direction,
    previous_value: "previous disclosed rows",
    latest_value:
      marketChanges.length === 0
        ? "no disclosed row changes"
        : `${marketChanges.length} disclosed row changes`,
    detail:
      marketChanges.length === 0
        ? "Disclosed market rows did not change."
        : `${marketChanges.length} disclosed market-row changes are visible in the redacted shares.`,
    citations: [
      "previous_redacted_receipt.markets",
      "latest_redacted_receipt.markets",
    ],
  };
}

function getComparisonLabel(input: {
  previousBundle: redacted_receipt_bundle;
  latestBundle: redacted_receipt_bundle;
  improvedCount: number;
  worsenedCount: number;
  changedCount: number;
}): redacted_snapshot_comparison_label {
  if (
    input.previousBundle.protocol !== input.latestBundle.protocol ||
    input.previousBundle.source !== input.latestBundle.source
  ) {
    return "not_comparable";
  }

  if (input.worsenedCount > input.improvedCount) {
    return "risk_worsened";
  }

  if (input.improvedCount > input.worsenedCount) {
    return "risk_improved";
  }

  if (input.changedCount > 0 || input.improvedCount > 0) {
    return "risk_changed";
  }

  return "unchanged";
}

function getHeadline(label: redacted_snapshot_comparison_label) {
  switch (label) {
    case "risk_improved":
      return "Latest redacted snapshot looks improved on visible risk cues.";
    case "risk_worsened":
      return "Latest redacted snapshot looks worse on visible risk cues.";
    case "risk_changed":
      return "Latest redacted snapshot changed on visible redacted cues.";
    case "unchanged":
      return "Visible redacted snapshot cues are unchanged.";
    case "not_comparable":
      return "Redacted snapshots are not directly comparable.";
  }
}

function getSummary(label: redacted_snapshot_comparison_label) {
  switch (label) {
    case "risk_improved":
      return "This compares disclosed buckets and heuristic redacted-only cues. It does not prove hidden account state improved.";
    case "risk_worsened":
      return "This compares disclosed buckets and heuristic redacted-only cues. Use a full bundle or live recheck before relying on exact current risk.";
    case "risk_changed":
      return "The redacted shares changed, but visible cues are mixed or not directionally comparable.";
    case "unchanged":
      return "The visible redacted fields are the same; hidden fields may still differ and require the full snapshot to verify.";
    case "not_comparable":
      return "Protocol or source changed, so the comparison should be treated as context only.";
  }
}

function getReviewPoints(label: redacted_snapshot_comparison_label) {
  switch (label) {
    case "risk_improved":
      return [
        "Review the improved cues alongside unchanged or worsened market rows before summarizing the change.",
        "Use the full bundles if another reviewer needs hash recomputation or exact hidden-field verification.",
      ];
    case "risk_worsened":
      return [
        "Inspect worsened buffer, risk score, margin usage, and funding cues first.",
        "Use a live read-only lookup or full bundle for exact current account risk.",
      ];
    case "risk_changed":
      return [
        "Treat changed bucket values as directional context, not proof of exact account movement.",
        "Inspect market-row additions or removals before comparing risk scores.",
      ];
    case "unchanged":
      return [
        "A matching redacted read does not prove the hidden full snapshots are identical.",
        "Compare full bundles if exact hash recomputation matters.",
      ];
    case "not_comparable":
      return [
        "Only compare like-for-like protocol and source pairs for directional review.",
        "Use the result as communication context, not an improved-or-worsened claim.",
      ];
  }
}

function getComparisonCitations(input: {
  metrics: redacted_snapshot_comparison_metric[];
  marketChanges: redacted_snapshot_market_change[];
}) {
  return Array.from(
    new Set([
      ...input.metrics.flatMap((metric) => metric.citations),
      ...input.marketChanges.flatMap((change) => change.citations),
    ]),
  );
}

function getDisclosedWatchSeverity(bundle: redacted_receipt_bundle) {
  const minDistanceBps = bundle.aggregate.min_liquidation_distance_bps;

  if (bundle.aggregate.risk_label === "critical") {
    return "critical";
  }

  if (
    minDistanceBps !== null &&
    minDistanceBps <= 500
  ) {
    return "high";
  }

  if (
    bundle.aggregate.risk_label === "high" ||
    (minDistanceBps !== null && minDistanceBps <= 1_000)
  ) {
    return "watch";
  }

  return "info";
}

function getRiskLabelRank(label: redacted_receipt_bundle["aggregate"]["risk_label"]) {
  switch (label) {
    case "low":
      return 1;
    case "medium":
      return 2;
    case "high":
      return 3;
    case "critical":
      return 4;
  }
}

function getWatchSeverityRank(label: string) {
  switch (label) {
    case "info":
      return 1;
    case "watch":
      return 2;
    case "high":
      return 3;
    case "critical":
      return 4;
    default:
      return 5;
  }
}

function getFreshnessLabelRank(label: redacted_freshness_verdict_label) {
  switch (label) {
    case "reviewable":
      return 1;
    case "stale_but_informative":
      return 2;
    case "needs_full_recheck":
      return 3;
  }
}

function getMetricDetail(input: {
  label: string;
  direction: redacted_snapshot_comparison_direction;
  previousValue: string;
  latestValue: string;
}) {
  if (input.direction === "unchanged") {
    return `${input.label} stayed at ${input.latestValue}.`;
  }

  if (input.direction === "not_comparable") {
    return `${input.label} is not directly comparable.`;
  }

  return `${input.label} moved from ${input.previousValue} to ${input.latestValue}.`;
}

function compareMetrics(
  firstMetric: redacted_snapshot_comparison_metric,
  secondMetric: redacted_snapshot_comparison_metric,
) {
  const directionDifference =
    getDirectionRank(secondMetric.direction) -
    getDirectionRank(firstMetric.direction);

  if (directionDifference !== 0) {
    return directionDifference;
  }

  return firstMetric.id.localeCompare(secondMetric.id);
}

function getDirectionRank(direction: redacted_snapshot_comparison_direction) {
  switch (direction) {
    case "worsened":
      return 5;
    case "not_comparable":
      return 4;
    case "changed":
      return 3;
    case "improved":
      return 2;
    case "unchanged":
      return 1;
  }
}

function getMarketsByKey(markets: redacted_receipt_market[]) {
  return new Map(
    markets.map((market) => [`${market.market}:${market.side}`, market]),
  );
}

function isMarketChange(
  change: redacted_snapshot_market_change | null,
): change is redacted_snapshot_market_change {
  return change !== null;
}

function parseSignedUsdBucket(value: string) {
  if (value === "$0") {
    return 0;
  }

  if (value.startsWith("cost ")) {
    return parseUsdBucketMidpoint(value.replace("cost ", ""));
  }

  if (value.startsWith("earn ")) {
    const midpoint = parseUsdBucketMidpoint(value.replace("earn ", ""));

    return midpoint === null ? null : -midpoint;
  }

  return parseUsdBucketMidpoint(value);
}

function parseUsdBucketMidpoint(value: string) {
  if (value === "$0") {
    return 0;
  }

  if (value === "$1m+") {
    return 1_000_000;
  }

  const match = value.match(/^\$(\d+)(k|m)?-\$(\d+)(k|m)$/i);

  if (!match) {
    return null;
  }

  const lowerValue = parseBucketNumber(match[1], match[2]);
  const upperValue = parseBucketNumber(match[3], match[4]);

  return (lowerValue + upperValue) / 2;
}

function parseBucketNumber(value: string, unit: string | undefined) {
  const numberValue = Number(value);

  if (unit?.toLowerCase() === "k") {
    return numberValue * 1_000;
  }

  if (unit?.toLowerCase() === "m") {
    return numberValue * 1_000_000;
  }

  return numberValue;
}

function formatFreshnessLabel(label: redacted_freshness_verdict_label) {
  return label.replaceAll("_", " ");
}

function formatNullableBpsAsPercent(value: number | null) {
  return value === null ? "n/a" : formatBpsAsPercent(value);
}

function formatBpsAsPercent(value: number) {
  return `${(value / 100).toFixed(2)}%`;
}

function formatSignedBps(value: number) {
  if (value === 0) {
    return "0.00 bps";
  }

  return `${value > 0 ? "+" : "-"}${Math.abs(value).toFixed(2)} bps`;
}
