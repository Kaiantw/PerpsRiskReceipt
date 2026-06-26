import type {
  redacted_market_context,
  redacted_market_context_row,
} from "../market/redacted-market-context.ts";
import type {
  redacted_market_trend,
  redacted_market_trend_row,
} from "../market/redacted-market-trend.ts";
import type {
  redacted_market_watch_item,
  redacted_market_watchlist,
} from "../market/redacted-market-watchlist.ts";
import type {
  redacted_freshness_verdict,
  redacted_freshness_verdict_driver,
} from "../market/redacted-freshness-verdict.ts";
import type {
  redacted_snapshot_comparison,
  redacted_snapshot_comparison_direction,
  redacted_snapshot_comparison_label,
  redacted_snapshot_comparison_metric,
  redacted_snapshot_market_change,
} from "../market/redacted-snapshot-comparison.ts";
import type {
  redacted_receipt_bundle,
  redacted_receipt_market,
} from "../receipts/portable-receipt-bundle.ts";

export type redacted_share_assistant_context = {
  bundle: redacted_receipt_bundle;
  marketContext?: redacted_market_context;
  marketTrend?: redacted_market_trend;
  watchlist: redacted_market_watchlist;
  freshnessVerdict?: redacted_freshness_verdict;
  snapshotComparison?: redacted_snapshot_comparison;
};

export type redacted_share_assistant_response = {
  answer: string;
  citations: string[];
  refused?: boolean;
};

export type redacted_share_assistant_suggestion = {
  id: string;
  label: string;
  question: string;
};

const advicePatterns = [
  /\bwhat should i do\b/,
  /\bshould i (trade|buy|sell|open|close|increase|reduce|use leverage|add leverage)\b/,
  /\b(buy|sell|ape)\b/,
  /\b(use|add|increase|reduce) leverage\b/,
  /\b(increase|reduce) (my |this |the )?(position|size|exposure|margin)\b/,
  /\b(open|close) (a |my |this |the )?(position|trade|long|short)\b/,
  /\bgo long\b/,
  /\bgo short\b/,
  /\bhedge\b/,
];

function includesAny(value: string, patterns: string[]) {
  return patterns.some((pattern) => value.includes(pattern));
}

function includesAdviceIntent(value: string) {
  return advicePatterns.some((pattern) => pattern.test(value));
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function shortHash(value: string) {
  if (value.length <= 18) {
    return value;
  }

  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

function formatBpsAsPercent(value: number | null) {
  return value === null ? "n/a" : `${(value / 100).toFixed(2)}%`;
}

function formatNullableUsd(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return `$${value.toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

function formatSignedBps(value: number) {
  if (value === 0) {
    return "0.00 bps";
  }

  return `${value > 0 ? "+" : "-"}${Math.abs(value).toFixed(2)} bps`;
}

function formatNullableSignedBps(value: number | null) {
  return value === null ? "n/a" : formatSignedBps(value);
}

function formatNullablePercent(value: number | null) {
  return value === null ? "n/a" : `${value.toFixed(2)}%`;
}

function formatNullableSignedPercent(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  if (value === 0) {
    return "0.00%";
  }

  return `${value > 0 ? "+" : "-"}${Math.abs(value).toFixed(2)}%`;
}

function formatFreshnessVerdictLabel(
  label: redacted_freshness_verdict["label"],
) {
  return label.replaceAll("_", " ");
}

function formatSnapshotComparisonLabel(
  label: redacted_snapshot_comparison_label,
) {
  return label.replaceAll("_", " ");
}

function formatSnapshotDirection(
  direction: redacted_snapshot_comparison_direction,
) {
  return direction.replaceAll("_", " ");
}

function formatSignedNumber(value: number) {
  if (value === 0) {
    return "0";
  }

  return `${value > 0 ? "+" : ""}${value}`;
}

function getContextRowByMarket(
  marketContext: redacted_market_context | undefined,
  market: string,
) {
  return (
    marketContext?.rows.find((row) => row.market === market) ?? null
  );
}

function getTrendRowByMarket(
  marketTrend: redacted_market_trend | undefined,
  market: string,
) {
  return marketTrend?.rows.find((row) => row.market === market) ?? null;
}

function getWatchItemsByMarket(
  watchlist: redacted_market_watchlist,
  market: string,
) {
  return watchlist.items.filter((item) => item.market === market);
}

function getRequestedMarket(input: {
  bundle: redacted_receipt_bundle;
  normalizedQuestion: string;
}) {
  const upperQuestion = input.normalizedQuestion.toUpperCase();

  return (
    input.bundle.markets.find((market) => {
      const marketName = market.market.toUpperCase();
      const baseCoin = marketName.replace(/-PERP$/, "");
      const baseCoinPattern = new RegExp(`\\b${escapeRegex(baseCoin)}\\b`);

      return (
        upperQuestion.includes(marketName) || baseCoinPattern.test(upperQuestion)
      );
    }) ?? null
  );
}

function getClosestDisclosedMarket(markets: redacted_receipt_market[]) {
  return (
    markets
      .filter((market) => market.liquidation_distance_bps !== null)
      .sort(
        (leftMarket, rightMarket) =>
          (leftMarket.liquidation_distance_bps ?? Infinity) -
          (rightMarket.liquidation_distance_bps ?? Infinity),
      )[0] ?? null
  );
}

function formatWatchItem(item: redacted_market_watch_item) {
  const reviewPoints = item.review_points.join(" ");

  return `${item.severity.toUpperCase()} ${item.market}: ${item.title}. ${item.detail} Review: ${reviewPoints}`;
}

function formatFreshnessDriver(driver: redacted_freshness_verdict_driver) {
  const reviewPoints = driver.review_points.join(" ");

  return `${driver.severity.toUpperCase()}: ${driver.title}. ${driver.detail} Review: ${reviewPoints}`;
}

function formatComparisonMetric(
  metric: redacted_snapshot_comparison_metric,
) {
  return `${metric.label} ${formatSnapshotDirection(metric.direction)}: ${metric.detail}`;
}

function formatComparisonMarketChange(
  change: redacted_snapshot_market_change,
) {
  return `${change.market} ${formatSnapshotDirection(change.direction)}: ${change.title}. ${change.detail}`;
}

function formatMarketContextRow(row: redacted_market_context_row | null) {
  if (!row) {
    return "Current market context is not loaded for this disclosed market.";
  }

  return [
    `Current public mark is ${formatNullableUsd(row.current_mark_price_usd)}.`,
    `Side-adjusted funding now is ${formatNullableSignedBps(row.current_funding_8h_bps_user_perspective)}, with a funding delta of ${formatNullableSignedBps(row.funding_delta_bps_user_perspective)} versus the redacted receipt.`,
    `Open interest is ${formatNullableUsd(row.current_open_interest_usd)}.`,
    row.summary,
  ].join(" ");
}

function formatMarketTrendRow(row: redacted_market_trend_row | null) {
  if (!row) {
    return "Public 24h trend context is not loaded for this disclosed market.";
  }

  return [
    `The public 24h close-to-close move is ${formatNullableSignedPercent(row.price_change_percent)}.`,
    `The 24h high/low range is ${formatNullablePercent(row.high_low_range_percent)}.`,
    `Average side-adjusted funding is ${formatNullableSignedBps(row.average_funding_8h_bps_user_perspective)}, and latest funding is ${formatNullableSignedBps(row.latest_funding_8h_bps_user_perspective)}.`,
    row.summary,
  ].join(" ");
}

function getMarketCitations(input: {
  market: string;
  contextRow: redacted_market_context_row | null;
  trendRow: redacted_market_trend_row | null;
  watchItems: redacted_market_watch_item[];
}) {
  return [
    `redacted_receipt.markets.${input.market}.side`,
    `redacted_receipt.markets.${input.market}.notional_bucket_usd`,
    `redacted_receipt.markets.${input.market}.liquidation_distance_bps`,
    `redacted_receipt.markets.${input.market}.funding_8h_bps_user_perspective`,
    ...(input.contextRow
      ? [
          `redacted_market_context.rows.${input.market}.current_mark_price_usd`,
          `redacted_market_context.rows.${input.market}.current_funding_8h_bps_user_perspective`,
          `redacted_market_context.rows.${input.market}.funding_delta_bps_user_perspective`,
          `redacted_market_context.rows.${input.market}.current_open_interest_usd`,
          `redacted_market_context.rows.${input.market}.summary`,
        ]
      : []),
    ...(input.trendRow
      ? [
          `redacted_market_trend.rows.${input.market}.price_change_percent`,
          `redacted_market_trend.rows.${input.market}.high_low_range_percent`,
          `redacted_market_trend.rows.${input.market}.average_funding_8h_bps_user_perspective`,
          `redacted_market_trend.rows.${input.market}.summary`,
        ]
      : []),
    ...input.watchItems.slice(0, 3).flatMap((item) => [
      `redacted_market_watchlist.items.${item.id}.severity`,
      `redacted_market_watchlist.items.${item.id}.detail`,
      `redacted_market_watchlist.items.${item.id}.review_points`,
    ]),
  ];
}

function buildSummaryAnswer(
  context: redacted_share_assistant_context,
): redacted_share_assistant_response {
  const { bundle, watchlist } = context;

  return {
    answer: [
      `This redacted ${bundle.protocol} receipt is ${bundle.aggregate.risk_label} risk with score ${bundle.aggregate.risk_score}.`,
      `It discloses ${bundle.aggregate.position_count} position rows, account value bucket ${bundle.aggregate.account_value_bucket_usd}, total notional bucket ${bundle.aggregate.total_notional_bucket_usd}, margin usage ${formatBpsAsPercent(bundle.aggregate.margin_usage_bps)}, and minimum disclosed liquidation distance ${formatBpsAsPercent(bundle.aggregate.min_liquidation_distance_bps)}.`,
      `Current public context: ${context.marketContext?.headline ?? "not loaded"}. 24h trend context: ${context.marketTrend?.headline ?? "not loaded"}. Watchlist: ${watchlist.headline}`,
      context.freshnessVerdict
        ? `Freshness verdict: ${formatFreshnessVerdictLabel(
            context.freshnessVerdict.label,
          )}; ${context.freshnessVerdict.headline}`
        : "Freshness verdict: not computed.",
      context.snapshotComparison
        ? `Snapshot comparison: ${formatSnapshotComparisonLabel(
            context.snapshotComparison.label,
          )}; ${context.snapshotComparison.headline}`
        : "Snapshot comparison: not loaded.",
      "This assistant can explain disclosed fields and loaded public market context, but it cannot recompute hidden snapshot hashes or recommend trades.",
    ].join(" "),
    citations: [
      "redacted_receipt.aggregate.risk_score",
      "redacted_receipt.aggregate.risk_label",
      "redacted_receipt.aggregate.position_count",
      "redacted_receipt.aggregate.account_value_bucket_usd",
      "redacted_receipt.aggregate.total_notional_bucket_usd",
      "redacted_receipt.aggregate.margin_usage_bps",
      "redacted_receipt.aggregate.min_liquidation_distance_bps",
      ...(context.marketContext ? ["redacted_market_context.headline"] : []),
      ...(context.marketTrend ? ["redacted_market_trend.headline"] : []),
      "redacted_market_watchlist.headline",
      ...(context.freshnessVerdict
        ? [
            "redacted_freshness_verdict.label",
            "redacted_freshness_verdict.headline",
          ]
        : []),
      ...(context.snapshotComparison
        ? [
            "redacted_snapshot_comparison.label",
            "redacted_snapshot_comparison.headline",
          ]
        : []),
      "redacted_receipt.verification_scope",
    ],
  };
}

function buildSnapshotComparisonAnswer(input: {
  context: redacted_share_assistant_context;
  requestedMarket: redacted_receipt_market | null;
}): redacted_share_assistant_response {
  const comparison = input.context.snapshotComparison;

  if (!comparison) {
    return {
      answer:
        "No redacted snapshot comparison is loaded. Paste a second redacted bundle in Redacted snapshot compare to ask what changed between the previous and latest visible risk cues.",
      citations: ["redacted_snapshot_comparison"],
    };
  }

  const metrics = comparison.metrics.filter(
    (metric) => metric.direction !== "unchanged",
  );
  const notableMetrics = (metrics.length > 0
    ? metrics
    : comparison.metrics
  ).slice(0, 4);
  const marketChanges = input.requestedMarket
    ? comparison.market_changes.filter(
        (change) => change.market === input.requestedMarket?.market,
      )
    : comparison.market_changes;
  const displayedMarketChanges = marketChanges.slice(0, 4);
  const metricCopy =
    notableMetrics.length === 0
      ? "No visible redacted metric changes were available."
      : notableMetrics.map(formatComparisonMetric).join(" ");
  const marketCopy =
    displayedMarketChanges.length === 0
      ? input.requestedMarket
        ? `No disclosed comparison row changed for ${input.requestedMarket.market}.`
        : "No disclosed market-row changes were visible."
      : displayedMarketChanges.map(formatComparisonMarketChange).join(" ");

  return {
    answer: [
      `${comparison.headline} Label: ${formatSnapshotComparisonLabel(
        comparison.label,
      )}; risk-score delta ${formatSignedNumber(
        comparison.risk_score_delta,
      )}.`,
      `Previous receipt ${comparison.previous_receipt_id} at ${comparison.previous_data_time_iso}; latest receipt ${comparison.latest_receipt_id} at ${comparison.latest_data_time_iso}.`,
      `Visible cue counts: ${comparison.worsened_count} worsened, ${comparison.improved_count} improved, ${comparison.changed_count} changed, ${comparison.unchanged_count} unchanged.`,
      `Redacted-only freshness moved from ${formatFreshnessVerdictLabel(
        comparison.previous_freshness_verdict.label,
      )} to ${formatFreshnessVerdictLabel(
        comparison.latest_freshness_verdict.label,
      )}.`,
      metricCopy,
      marketCopy,
      comparison.review_points.join(" "),
      "This compares redacted visible fields only; use full bundles or a live recheck for exact hidden-state proof.",
    ].join(" "),
    citations: [
      "redacted_snapshot_comparison.label",
      "redacted_snapshot_comparison.risk_score_delta",
      "redacted_snapshot_comparison.previous_receipt_id",
      "redacted_snapshot_comparison.latest_receipt_id",
      "redacted_snapshot_comparison.previous_freshness_verdict.label",
      "redacted_snapshot_comparison.latest_freshness_verdict.label",
      "redacted_snapshot_comparison.review_points",
      ...notableMetrics.flatMap((metric) => metric.citations),
      ...displayedMarketChanges.flatMap((change) => change.citations),
    ],
  };
}

function buildWatchlistAnswer(
  context: redacted_share_assistant_context,
): redacted_share_assistant_response {
  const topItems = context.watchlist.items.slice(0, 3);
  const topItemSummary =
    topItems.length === 0
      ? "No ranked watchlist items crossed the current public-review thresholds."
      : topItems.map(formatWatchItem).join(" ");

  return {
    answer: [
      context.watchlist.headline,
      context.watchlist.summary,
      `Counts: ${context.watchlist.high_count} high, ${context.watchlist.watch_count} watch, ${context.watchlist.info_count} info.`,
      topItemSummary,
      "Use this to decide what to inspect first in the redacted share; it is not a trading recommendation.",
    ].join(" "),
    citations: [
      "redacted_market_watchlist.headline",
      "redacted_market_watchlist.summary",
      "redacted_market_watchlist.high_count",
      "redacted_market_watchlist.watch_count",
      "redacted_market_watchlist.info_count",
      ...topItems.flatMap((item) => [
        `redacted_market_watchlist.items.${item.id}.severity`,
        `redacted_market_watchlist.items.${item.id}.detail`,
        `redacted_market_watchlist.items.${item.id}.review_points`,
      ]),
    ],
  };
}

function buildCurrentMarketAnswer(
  context: redacted_share_assistant_context,
): redacted_share_assistant_response {
  if (!context.marketContext) {
    return {
      answer:
        "Current public market context is not loaded. Use Load current markets on the redacted preview to add public mark, side-adjusted funding, open-interest, and volume context for disclosed markets without sending a raw account address.",
      citations: ["redacted_market_context"],
    };
  }

  const rows = context.marketContext.rows.slice(0, 3);
  const rowSummary = rows
    .map(
      (row) =>
        `${row.market} ${row.side}: ${formatMarketContextRow(row)}`,
    )
    .join(" ");

  return {
    answer: [
      context.marketContext.headline,
      context.marketContext.summary,
      `Matched ${context.marketContext.matched_market_count}/${context.marketContext.rows.length} disclosed markets.`,
      rowSummary,
      "This is public market context only; it does not reveal saved marks, exact sizes, exact account equity, or PnL.",
    ].join(" "),
    citations: [
      "redacted_market_context.headline",
      "redacted_market_context.summary",
      "redacted_market_context.matched_market_count",
      ...rows.flatMap((row) => [
        `redacted_market_context.rows.${row.market}.current_mark_price_usd`,
        `redacted_market_context.rows.${row.market}.current_funding_8h_bps_user_perspective`,
        `redacted_market_context.rows.${row.market}.funding_delta_bps_user_perspective`,
        `redacted_market_context.rows.${row.market}.current_open_interest_usd`,
        `redacted_market_context.rows.${row.market}.summary`,
      ]),
    ],
  };
}

function buildTrendAnswer(
  context: redacted_share_assistant_context,
): redacted_share_assistant_response {
  if (!context.marketTrend) {
    return {
      answer:
        "Public 24h trend context is not loaded. Use Load 24h trends on the redacted preview to add public candle movement, high/low range, and funding-history context for disclosed markets.",
      citations: ["redacted_market_trend"],
    };
  }

  const rows = context.marketTrend.rows.slice(0, 3);
  const rowSummary = rows
    .map((row) => `${row.market} ${row.side}: ${formatMarketTrendRow(row)}`)
    .join(" ");

  return {
    answer: [
      context.marketTrend.headline,
      context.marketTrend.summary,
      `Window: ${context.marketTrend.window_hours}h ${context.marketTrend.interval}; matched ${context.marketTrend.matched_market_count}/${context.marketTrend.rows.length} disclosed markets.`,
      rowSummary,
      "This can show whether the stale receipt should be read against recent public movement, but it still cannot prove hidden account state.",
    ].join(" "),
    citations: [
      "redacted_market_trend.headline",
      "redacted_market_trend.summary",
      "redacted_market_trend.window_hours",
      "redacted_market_trend.interval",
      "redacted_market_trend.matched_market_count",
      ...rows.flatMap((row) => [
        `redacted_market_trend.rows.${row.market}.price_change_percent`,
        `redacted_market_trend.rows.${row.market}.high_low_range_percent`,
        `redacted_market_trend.rows.${row.market}.average_funding_8h_bps_user_perspective`,
        `redacted_market_trend.rows.${row.market}.summary`,
      ]),
    ],
  };
}

function buildLiquidationAnswer(
  context: redacted_share_assistant_context,
): redacted_share_assistant_response {
  const closestMarket = getClosestDisclosedMarket(context.bundle.markets);

  if (!closestMarket) {
    return {
      answer:
        "This redacted share does not disclose a usable liquidation-distance row. The full hidden snapshot is required for exact liquidation review.",
      citations: [
        "redacted_receipt.markets",
        "redacted_receipt.aggregate.min_liquidation_distance_bps",
      ],
    };
  }

  const trendRow = getTrendRowByMarket(context.marketTrend, closestMarket.market);
  const trendCopy = trendRow
    ? `Public 24h range for that market is ${formatNullablePercent(trendRow.high_low_range_percent)}, and the public 24h move is ${formatNullableSignedPercent(trendRow.price_change_percent)}.`
    : "Load 24h trends to compare the disclosed buffer with recent public range.";

  return {
    answer: [
      `${closestMarket.market} has the closest disclosed liquidation distance at ${formatBpsAsPercent(closestMarket.liquidation_distance_bps)} for the disclosed ${closestMarket.side} side.`,
      trendCopy,
      "This uses the redacted listed-distance field only; exact liquidation verification still requires the hidden full snapshot and protocol-specific margin context.",
    ].join(" "),
    citations: [
      `redacted_receipt.markets.${closestMarket.market}.liquidation_distance_bps`,
      `redacted_receipt.markets.${closestMarket.market}.side`,
      ...(trendRow
        ? [
            `redacted_market_trend.rows.${closestMarket.market}.high_low_range_percent`,
            `redacted_market_trend.rows.${closestMarket.market}.price_change_percent`,
          ]
        : []),
      "redacted_receipt.verification_scope",
    ],
  };
}

function buildFundingAnswer(
  context: redacted_share_assistant_context,
): redacted_share_assistant_response {
  const fundingRows = context.bundle.markets
    .slice(0, 3)
    .map((market) => {
      const contextRow = getContextRowByMarket(
        context.marketContext,
        market.market,
      );
      const trendRow = getTrendRowByMarket(context.marketTrend, market.market);

      return [
        `${market.market} ${market.side}: receipt funding ${formatSignedBps(market.funding_8h_bps_user_perspective)}.`,
        contextRow
          ? `Current funding ${formatNullableSignedBps(contextRow.current_funding_8h_bps_user_perspective)}, delta ${formatNullableSignedBps(contextRow.funding_delta_bps_user_perspective)}.`
          : "Current funding not loaded.",
        trendRow
          ? `24h average funding ${formatNullableSignedBps(trendRow.average_funding_8h_bps_user_perspective)}.`
          : "24h funding history not loaded.",
      ].join(" ");
    })
    .join(" ");

  return {
    answer: [
      `The redacted aggregate funding buckets are daily ${context.bundle.aggregate.daily_funding_bucket_usd} and 30-day ${context.bundle.aggregate.thirty_day_funding_bucket_usd}.`,
      fundingRows || "No disclosed market funding rows are available.",
      "Funding is a holding-cost signal that can change quickly. This is explanation only, not a position recommendation.",
    ].join(" "),
    citations: [
      "redacted_receipt.aggregate.daily_funding_bucket_usd",
      "redacted_receipt.aggregate.thirty_day_funding_bucket_usd",
      ...context.bundle.markets.slice(0, 3).flatMap((market) => [
        `redacted_receipt.markets.${market.market}.funding_8h_bps_user_perspective`,
        ...(getContextRowByMarket(context.marketContext, market.market)
          ? [
              `redacted_market_context.rows.${market.market}.current_funding_8h_bps_user_perspective`,
              `redacted_market_context.rows.${market.market}.funding_delta_bps_user_perspective`,
            ]
          : []),
        ...(getTrendRowByMarket(context.marketTrend, market.market)
          ? [
              `redacted_market_trend.rows.${market.market}.average_funding_8h_bps_user_perspective`,
            ]
          : []),
      ]),
    ],
  };
}

function buildHashPrivacyAnswer(
  context: redacted_share_assistant_context,
): redacted_share_assistant_response {
  return {
    answer: [
      `Receipt ${context.bundle.receipt_id} preserves snapshot hash reference ${shortHash(context.bundle.snapshot_hash)}.`,
      "Because this is a redacted bundle, the app cannot recompute the original hash from the visible fields. A reviewer needs the full portable receipt bundle to recompute the snapshot hash.",
      `The redacted share intentionally hides: ${context.bundle.redacted_fields.join(", ")}.`,
    ].join(" "),
    citations: [
      "redacted_receipt.receipt_id",
      "redacted_receipt.snapshot_hash",
      "redacted_receipt.verification_scope",
      "redacted_receipt.redacted_fields",
    ],
  };
}

function buildFreshnessAnswer(
  context: redacted_share_assistant_context,
): redacted_share_assistant_response {
  if (context.freshnessVerdict) {
    const verdict = context.freshnessVerdict;
    const topDrivers = verdict.drivers
      .slice(0, 3)
      .map(formatFreshnessDriver)
      .join(" ");

    return {
      answer: [
        `${verdict.headline} Verdict: ${formatFreshnessVerdictLabel(
          verdict.label,
        )}; signal score ${verdict.signal_score}/100; receipt age ${verdict.age_label}.`,
        verdict.summary,
        `Drivers: ${verdict.high_count} high, ${verdict.watch_count} watch, ${verdict.info_count} info.`,
        topDrivers || "No freshness drivers were available.",
        verdict.review_points.join(" "),
        "This is a redacted freshness verdict, not a live account monitor or trading recommendation.",
      ].join(" "),
      citations: verdict.citations,
    };
  }

  const currentContextFetched = context.marketContext
    ? ` Current market context was fetched at ${context.marketContext.fetched_at_iso}.`
    : " Current market context is not loaded.";
  const trendContextFetched = context.marketTrend
    ? ` 24h trend context was fetched at ${context.marketTrend.fetched_at_iso}.`
    : " 24h trend context is not loaded.";

  return {
    answer: [
      `The redacted receipt data timestamp is ${context.bundle.data_time_iso}, freshness is ${context.bundle.freshness}, and export time is ${context.bundle.exported_at_iso}.`,
      currentContextFetched,
      trendContextFetched,
      "Read the receipt as a historical snapshot plus optional current public context, not as a live account monitor.",
    ].join(" "),
    citations: [
      "redacted_receipt.data_time_iso",
      "redacted_receipt.freshness",
      "redacted_receipt.exported_at_iso",
      ...(context.marketContext
        ? ["redacted_market_context.fetched_at_iso"]
        : []),
      ...(context.marketTrend ? ["redacted_market_trend.fetched_at_iso"] : []),
    ],
  };
}

function buildMarketAnswer(input: {
  context: redacted_share_assistant_context;
  market: redacted_receipt_market;
}): redacted_share_assistant_response {
  const contextRow = getContextRowByMarket(
    input.context.marketContext,
    input.market.market,
  );
  const trendRow = getTrendRowByMarket(
    input.context.marketTrend,
    input.market.market,
  );
  const watchItems = getWatchItemsByMarket(
    input.context.watchlist,
    input.market.market,
  );
  const watchCopy =
    watchItems.length === 0
      ? "No watchlist item is currently ranked for this market."
      : watchItems.slice(0, 3).map(formatWatchItem).join(" ");

  return {
    answer: [
      `${input.market.market} is disclosed as a ${input.market.side} with notional bucket ${input.market.notional_bucket_usd}, disclosed liquidation distance ${formatBpsAsPercent(input.market.liquidation_distance_bps)}, and receipt funding ${formatSignedBps(input.market.funding_8h_bps_user_perspective)}.`,
      formatMarketContextRow(contextRow),
      formatMarketTrendRow(trendRow),
      watchCopy,
      "This market answer uses disclosed and public fields only; it cannot reveal exact position size, saved mark, listed liquidation price, PnL, or account equity.",
    ].join(" "),
    citations: getMarketCitations({
      market: input.market.market,
      contextRow,
      trendRow,
      watchItems,
    }),
  };
}

function buildAdviceRefusal(
  context: redacted_share_assistant_context,
): redacted_share_assistant_response {
  return {
    answer: [
      "I cannot recommend trades, leverage, hedges, or position changes.",
      `I can explain visible review signals: redacted risk score ${context.bundle.aggregate.risk_score} (${context.bundle.aggregate.risk_label}), disclosed minimum liquidation distance ${formatBpsAsPercent(context.bundle.aggregate.min_liquidation_distance_bps)}, and watchlist status: ${context.watchlist.headline}`,
    ].join(" "),
    citations: [
      "redacted_receipt.aggregate.risk_score",
      "redacted_receipt.aggregate.risk_label",
      "redacted_receipt.aggregate.min_liquidation_distance_bps",
      "redacted_market_watchlist.headline",
    ],
    refused: true,
  };
}

export function answerRedactedShareQuestion(input: {
  context: redacted_share_assistant_context;
  question: string;
}): redacted_share_assistant_response {
  const normalizedQuestion = input.question.trim().toLowerCase();
  const requestedMarket = getRequestedMarket({
    bundle: input.context.bundle,
    normalizedQuestion,
  });

  if (normalizedQuestion.length === 0) {
    return buildSummaryAnswer(input.context);
  }

  if (includesAdviceIntent(normalizedQuestion)) {
    return buildAdviceRefusal(input.context);
  }

  if (
    includesAny(normalizedQuestion, [
      "comparison",
      "compare",
      "changed",
      "changes",
      "what changed",
      "between",
      "previous",
      "latest",
      "improved",
      "worsened",
      "risk delta",
      "score delta",
      "snapshot compare",
    ])
  ) {
    return buildSnapshotComparisonAnswer({
      context: input.context,
      requestedMarket,
    });
  }

  if (
    includesAny(normalizedQuestion, [
      "hash",
      "verify",
      "verified",
      "proof",
      "privacy",
      "private",
      "hide",
      "hides",
      "hidden fields",
      "hidden",
      "full bundle",
      "full snapshot",
    ])
  ) {
    return buildHashPrivacyAnswer(input.context);
  }

  if (requestedMarket) {
    return buildMarketAnswer({
      context: input.context,
      market: requestedMarket,
    });
  }

  if (
    includesAny(normalizedQuestion, [
      "watchlist",
      "inspect first",
      "review first",
      "look at first",
      "focus first",
      "priority",
      "attention",
      "urgent",
    ])
  ) {
    return buildWatchlistAnswer(input.context);
  }

  if (
    includesAny(normalizedQuestion, [
      "24h",
      "trend",
      "history",
      "candle",
      "volatility",
      "range",
      "move",
      "moved",
    ])
  ) {
    return buildTrendAnswer(input.context);
  }

  if (
    includesAny(normalizedQuestion, [
      "current market",
      "market context",
      "mark",
      "price",
      "open interest",
      "oi",
    ])
  ) {
    return buildCurrentMarketAnswer(input.context);
  }

  if (
    includesAny(normalizedQuestion, [
      "liquidation",
      "liq",
      "buffer",
      "distance",
    ])
  ) {
    return buildLiquidationAnswer(input.context);
  }

  if (includesAny(normalizedQuestion, ["funding", "carry", "cost", "earn"])) {
    return buildFundingAnswer(input.context);
  }

  if (
    includesAny(normalizedQuestion, [
      "fresh",
      "stale",
      "timestamp",
      "time",
      "current",
      "old",
      "age",
      "reviewable",
      "still useful",
      "still valid",
      "recheck",
      "full recheck",
      "freshness",
    ])
  ) {
    return buildFreshnessAnswer(input.context);
  }

  return buildSummaryAnswer(input.context);
}

export function getRedactedShareAssistantSuggestions(
  context: redacted_share_assistant_context,
): redacted_share_assistant_suggestion[] {
  const topWatchItem = context.watchlist.items[0] ?? null;
  const closestMarket = getClosestDisclosedMarket(context.bundle.markets);

  return [
    {
      id: "summary",
      label: "Summary",
      question: "Summarize this redacted share.",
    },
    ...(context.snapshotComparison
      ? [
          {
            id: "comparison",
            label: "Compare",
            question: "What changed between these redacted snapshots?",
          },
        ]
      : []),
    {
      id: "watchlist",
      label: "Watchlist",
      question: "What should I inspect first in the redacted watchlist?",
    },
    {
      id: "freshness",
      label: "Freshness",
      question: "Is this redacted receipt still reviewable?",
    },
    {
      id: "current-market",
      label: "Current",
      question: "What does current public market context say?",
    },
    {
      id: "trend",
      label: "24h Trend",
      question: "What does the public 24h trend say?",
    },
    ...(closestMarket
      ? [
          {
            id: "liquidation",
            label: "Buffer",
            question: `What does the disclosed ${closestMarket.market} liquidation buffer mean?`,
          },
        ]
      : []),
    ...(topWatchItem
      ? [
          {
            id: "top-watch",
            label: "Top Cue",
            question: `Why is ${topWatchItem.market} on the redacted watchlist?`,
          },
        ]
      : []),
    {
      id: "funding",
      label: "Funding",
      question: "What does the redacted share show about funding?",
    },
    {
      id: "privacy",
      label: "Privacy",
      question: "What does the redacted share hide and verify?",
    },
  ];
}
