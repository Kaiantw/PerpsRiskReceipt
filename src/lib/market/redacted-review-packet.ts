import type {
  redacted_receipt_bundle,
  redacted_receipt_market,
} from "../receipts/portable-receipt-bundle.ts";
import type {
  redacted_market_context,
  redacted_market_context_row,
} from "./redacted-market-context.ts";
import type {
  redacted_market_trend,
  redacted_market_trend_row,
} from "./redacted-market-trend.ts";
import type {
  redacted_market_watch_item,
  redacted_market_watchlist,
} from "./redacted-market-watchlist.ts";
import type {
  redacted_freshness_verdict,
  redacted_freshness_verdict_driver,
} from "./redacted-freshness-verdict.ts";
import type {
  redacted_snapshot_comparison,
  redacted_snapshot_comparison_direction,
  redacted_snapshot_comparison_metric,
  redacted_snapshot_market_change,
} from "./redacted-snapshot-comparison.ts";

export type redacted_review_packet = {
  title: string;
  summary: string;
  markdown: string;
};

export type redacted_review_packet_mode = "compact" | "full";

export function buildRedactedReviewPacket(input: {
  bundle: redacted_receipt_bundle;
  marketContext?: redacted_market_context;
  marketTrend?: redacted_market_trend;
  watchlist: redacted_market_watchlist;
  freshnessVerdict?: redacted_freshness_verdict;
  snapshotComparison?: redacted_snapshot_comparison;
}): redacted_review_packet {
  const title = `Redacted review packet for ${input.bundle.receipt_id}`;
  const summary = `${input.bundle.aggregate.risk_label} ${input.bundle.aggregate.risk_score} redacted receipt. ${
    input.snapshotComparison?.headline ??
    input.freshnessVerdict?.headline ??
    input.watchlist.headline
  }`;
  const markdown = [
    `# ${title}`,
    "",
    "## redacted receipt",
    `- receipt id: ${input.bundle.receipt_id}`,
    `- protocol: ${input.bundle.protocol}`,
    `- source: ${input.bundle.source}`,
    `- freshness: ${input.bundle.freshness}`,
    `- created: ${input.bundle.created_at_iso}`,
    `- data timestamp: ${input.bundle.data_time_iso}`,
    `- snapshot hash reference: ${input.bundle.snapshot_hash}`,
    "- verification scope: hash reference only; hidden full snapshot is required to recompute the original hash",
    `- risk score: ${input.bundle.aggregate.risk_score} (${input.bundle.aggregate.risk_label})`,
    `- account value bucket: ${input.bundle.aggregate.account_value_bucket_usd}`,
    `- total notional bucket: ${input.bundle.aggregate.total_notional_bucket_usd}`,
    `- margin usage: ${formatBpsAsPercent(input.bundle.aggregate.margin_usage_bps)}`,
    `- min disclosed liquidation distance: ${formatBpsAsPercent(input.bundle.aggregate.min_liquidation_distance_bps)}`,
    `- daily funding bucket: ${input.bundle.aggregate.daily_funding_bucket_usd}`,
    `- 30-day funding bucket: ${input.bundle.aggregate.thirty_day_funding_bucket_usd}`,
    `- disclosed positions: ${input.bundle.aggregate.position_count}`,
    "",
    "## disclosed market rows",
    ...formatDisclosedMarkets(input.bundle.markets),
    "",
    ...formatMarketContextSection(input.marketContext),
    ...formatMarketTrendSection(input.marketTrend),
    ...formatFreshnessVerdictSection(input.freshnessVerdict),
    ...formatSnapshotComparisonSection(input.snapshotComparison),
    "## redacted review thresholds",
    ...formatRedactedReviewThresholds(input.watchlist),
    "## redacted review watchlist",
    `- label: ${input.watchlist.label.replaceAll("_", " ")}`,
    `- headline: ${input.watchlist.headline}`,
    `- counts: ${input.watchlist.high_count} high, ${input.watchlist.watch_count} watch, ${input.watchlist.info_count} info`,
    ...formatWatchlistItems(input.watchlist.items),
    "",
    "## limits",
    "- this packet is a public/redacted communication summary, not a full receipt bundle.",
    "- hidden fields include the raw account address, exact account value, exact position sizes, entry prices, saved mark prices, listed liquidation prices, PnL, and exact funding dollars.",
    "- the snapshot hash is preserved as a reference, but this redacted packet cannot recompute or verify it.",
    "- redacted review thresholds are local sensitivity settings only; they do not change the receipt, snapshot hash, bundle contents, or protocol risk.",
    "- redacted snapshot comparison uses visible minimized fields only and cannot prove hidden exact account movement.",
    "- public market context uses disclosed markets only and does not use a raw account address.",
    "- review cues are heuristic context, not protocol-official risk calculations or trading advice.",
    "",
  ].join("\n");

  return { title, summary, markdown };
}

export function buildCompactRedactedReviewPacket(input: {
  bundle: redacted_receipt_bundle;
  marketContext?: redacted_market_context;
  marketTrend?: redacted_market_trend;
  watchlist: redacted_market_watchlist;
  freshnessVerdict?: redacted_freshness_verdict;
  snapshotComparison?: redacted_snapshot_comparison;
}): redacted_review_packet {
  const title = `Compact redacted risk note for ${input.bundle.receipt_id}`;
  const verdictLabel =
    input.freshnessVerdict?.label.replaceAll("_", " ") ?? "not computed";
  const summary = `${input.bundle.aggregate.risk_label} ${input.bundle.aggregate.risk_score} redacted receipt; ${verdictLabel}. ${getCompactHeadline(input)}`;
  const markdown = [
    `# ${title}`,
    "",
    `- receipt: ${input.bundle.receipt_id}`,
    `- protocol/source: ${input.bundle.protocol}/${input.bundle.source}`,
    `- data timestamp: ${input.bundle.data_time_iso}`,
    `- snapshot hash reference: ${shortHash(input.bundle.snapshot_hash)}`,
    `- risk: ${input.bundle.aggregate.risk_score} (${input.bundle.aggregate.risk_label})`,
    `- account/notional buckets: ${input.bundle.aggregate.account_value_bucket_usd} / ${input.bundle.aggregate.total_notional_bucket_usd}`,
    `- margin usage: ${formatBpsAsPercent(input.bundle.aggregate.margin_usage_bps)}`,
    `- min disclosed liquidation distance: ${formatBpsAsPercent(input.bundle.aggregate.min_liquidation_distance_bps)}`,
    `- funding buckets: ${input.bundle.aggregate.daily_funding_bucket_usd} daily; ${input.bundle.aggregate.thirty_day_funding_bucket_usd} 30d`,
    `- disclosed positions: ${input.bundle.aggregate.position_count}`,
    `- current market context: ${input.marketContext ? input.marketContext.label.replaceAll("_", " ") : "not loaded"}`,
    `- 24h trend context: ${input.marketTrend ? input.marketTrend.label.replaceAll("_", " ") : "not loaded"}`,
    `- freshness verdict: ${verdictLabel}`,
    `- cue counts: ${getCompactCueCounts(input)}`,
    `- thresholds: age ${formatAgeMinutes(input.watchlist.thresholds.watch_age_minutes)}/${formatAgeMinutes(input.watchlist.thresholds.high_age_minutes)}, buffer ${formatBpsAsPercent(input.watchlist.thresholds.thin_liquidation_distance_bps)}/${formatBpsAsPercent(input.watchlist.thresholds.tight_liquidation_distance_bps)}, adverse move ${formatPlainNumber(input.watchlist.thresholds.material_adverse_move_percent)}%, funding ${formatPlainNumber(input.watchlist.thresholds.material_funding_move_bps)} bps`,
    ...formatCompactComparison(input.snapshotComparison),
    "",
    "## top review cues",
    ...formatCompactReviewCues(input),
    "",
    "## limits",
    "- compact public summary only; use the full redacted packet for detailed rows.",
    "- hidden full snapshot is required to recompute the original snapshot hash.",
    "- does not reveal raw account, exact sizes, saved marks, listed liquidation prices, PnL, or exact account value.",
    "- heuristic review context only; not protocol-official risk, a live liquidation monitor, or trading advice.",
    "",
  ].join("\n");

  return { title, summary, markdown };
}

function getCompactHeadline(input: {
  freshnessVerdict?: redacted_freshness_verdict;
  snapshotComparison?: redacted_snapshot_comparison;
  watchlist: redacted_market_watchlist;
}) {
  return (
    input.snapshotComparison?.headline ??
    input.freshnessVerdict?.headline ??
    input.watchlist.headline
  );
}

function getCompactCueCounts(input: {
  freshnessVerdict?: redacted_freshness_verdict;
  watchlist: redacted_market_watchlist;
}) {
  if (input.freshnessVerdict) {
    return `${input.freshnessVerdict.high_count} high, ${input.freshnessVerdict.watch_count} watch, ${input.freshnessVerdict.info_count} info`;
  }

  return `${input.watchlist.high_count} high, ${input.watchlist.watch_count} watch, ${input.watchlist.info_count} info`;
}

function formatCompactComparison(
  snapshotComparison: redacted_snapshot_comparison | undefined,
) {
  if (!snapshotComparison) {
    return ["- redacted comparison: not loaded"];
  }

  return [
    `- redacted comparison: ${snapshotComparison.label.replaceAll("_", " ")}; risk-score delta ${formatSignedNumber(snapshotComparison.risk_score_delta)}`,
    `- comparison receipts: ${snapshotComparison.previous_receipt_id} -> ${snapshotComparison.latest_receipt_id}`,
  ];
}

function formatCompactReviewCues(input: {
  freshnessVerdict?: redacted_freshness_verdict;
  snapshotComparison?: redacted_snapshot_comparison;
  watchlist: redacted_market_watchlist;
}) {
  const comparisonCues =
    input.snapshotComparison?.review_points
      .slice(0, 2)
      .map((point) => `- [comparison] ${point}`) ?? [];
  const freshnessCues =
    input.freshnessVerdict?.drivers
      .filter((driver) => driver.severity !== "info")
      .slice(0, 3)
      .map((driver) => `- [${driver.severity}] ${driver.title}: ${driver.detail}`) ??
    [];
  const watchlistCues = input.watchlist.items
    .slice(0, 3)
    .map((item) => `- [${item.severity}] ${item.market}: ${item.title}`);
  const cues = [...comparisonCues, ...freshnessCues, ...watchlistCues].slice(
    0,
    5,
  );

  if (cues.length === 0) {
    return ["- no loaded public review cues; load current markets or 24h trends for more context."];
  }

  return cues;
}

function formatRedactedReviewThresholds(watchlist: redacted_market_watchlist) {
  const thresholds = watchlist.thresholds;

  return [
    `- watch age: ${formatAgeMinutes(thresholds.watch_age_minutes)}`,
    `- full-recheck age: ${formatAgeMinutes(thresholds.high_age_minutes)}`,
    `- thin disclosed buffer: ${formatBpsAsPercent(thresholds.thin_liquidation_distance_bps)}`,
    `- tight disclosed buffer: ${formatBpsAsPercent(thresholds.tight_liquidation_distance_bps)}`,
    `- adverse 24h move: ${formatPlainNumber(thresholds.material_adverse_move_percent)}%`,
    `- material funding move: ${formatPlainNumber(thresholds.material_funding_move_bps)} bps`,
    `- high funding move: ${formatPlainNumber(thresholds.high_funding_move_bps)} bps`,
    `- high public range: ${formatPlainNumber(thresholds.high_range_percent)}%`,
    `- range/watch buffer ratio: ${formatPlainNumber(thresholds.range_to_buffer_watch_ratio)}x`,
    `- range/full-recheck buffer ratio: ${formatPlainNumber(thresholds.range_to_buffer_high_ratio)}x`,
    "",
  ];
}

function formatSnapshotComparisonSection(
  snapshotComparison: redacted_snapshot_comparison | undefined,
) {
  if (!snapshotComparison) {
    return [
      "## redacted snapshot comparison",
      "- status: not loaded",
      "- note: paste a second redacted bundle on the import page to include visible previous-versus-latest risk cue movement.",
      "",
    ];
  }

  const changedMetrics = snapshotComparison.metrics.filter(
    (metric) => metric.direction !== "unchanged",
  );
  const metricsToShow = (changedMetrics.length > 0
    ? changedMetrics
    : snapshotComparison.metrics
  ).slice(0, 6);

  return [
    "## redacted snapshot comparison",
    `- label: ${snapshotComparison.label.replaceAll("_", " ")}`,
    `- headline: ${snapshotComparison.headline}`,
    `- previous receipt: ${snapshotComparison.previous_receipt_id}`,
    `- latest receipt: ${snapshotComparison.latest_receipt_id}`,
    `- previous data timestamp: ${snapshotComparison.previous_data_time_iso}`,
    `- latest data timestamp: ${snapshotComparison.latest_data_time_iso}`,
    `- risk-score delta: ${formatSignedNumber(snapshotComparison.risk_score_delta)}`,
    `- cue counts: ${snapshotComparison.worsened_count} worsened, ${snapshotComparison.improved_count} improved, ${snapshotComparison.changed_count} changed, ${snapshotComparison.unchanged_count} unchanged`,
    `- redacted-only freshness: ${snapshotComparison.previous_freshness_verdict.label.replaceAll(
      "_",
      " ",
    )} -> ${snapshotComparison.latest_freshness_verdict.label.replaceAll(
      "_",
      " ",
    )}`,
    ...metricsToShow.map(formatSnapshotComparisonMetric),
    ...formatSnapshotMarketChanges(snapshotComparison.market_changes),
    ...snapshotComparison.review_points
      .slice(0, 3)
      .map((point) => `- review: ${point}`),
    "- limit: this compares visible redacted fields only; use full bundles or a live recheck for exact hidden-state proof.",
    "",
  ];
}

function formatSnapshotComparisonMetric(
  metric: redacted_snapshot_comparison_metric,
) {
  return `- [${formatSnapshotDirection(metric.direction)}] ${metric.label}: ${metric.previous_value} -> ${metric.latest_value}; ${metric.detail}`;
}

function formatSnapshotMarketChanges(
  marketChanges: redacted_snapshot_market_change[],
) {
  if (marketChanges.length === 0) {
    return ["- disclosed market rows: no visible row changes"];
  }

  return marketChanges
    .slice(0, 6)
    .map(
      (change) =>
        `- [${formatSnapshotDirection(change.direction)}] ${change.market}: ${change.title}; ${change.detail}`,
    );
}

function formatFreshnessVerdictSection(
  freshnessVerdict: redacted_freshness_verdict | undefined,
) {
  if (!freshnessVerdict) {
    return [
      "## redacted freshness verdict",
      "- status: not computed",
      "- note: load public context or use the import page verdict to classify whether the redacted receipt is reviewable, stale but informative, or needs a full recheck.",
      "",
    ];
  }

  return [
    "## redacted freshness verdict",
    `- label: ${freshnessVerdict.label.replaceAll("_", " ")}`,
    `- headline: ${freshnessVerdict.headline}`,
    `- receipt age: ${freshnessVerdict.age_label}`,
    `- signal score: ${freshnessVerdict.signal_score}/100`,
    `- counts: ${freshnessVerdict.high_count} high, ${freshnessVerdict.watch_count} watch, ${freshnessVerdict.info_count} info`,
    `- summary: ${freshnessVerdict.summary}`,
    ...freshnessVerdict.drivers.slice(0, 5).flatMap(formatFreshnessDriver),
    "",
  ];
}

function formatFreshnessDriver(driver: redacted_freshness_verdict_driver) {
  return [
    `- [${driver.severity}] ${driver.title}`,
    `  detail: ${driver.detail}`,
    ...driver.review_points.slice(0, 2).map((point) => `  review: ${point}`),
  ];
}

function formatDisclosedMarkets(markets: redacted_receipt_market[]) {
  if (markets.length === 0) {
    return ["- no disclosed market rows"];
  }

  return markets.slice(0, 5).map(
    (market) =>
      `- ${market.market} ${market.side}: notional ${market.notional_bucket_usd}; disclosed liquidation distance ${formatBpsAsPercent(market.liquidation_distance_bps)}; funding ${formatSignedBps(market.funding_8h_bps_user_perspective)}; open interest ${market.open_interest_bucket_usd ?? "n/a"}`,
  );
}

function formatMarketContextSection(
  marketContext: redacted_market_context | undefined,
) {
  if (!marketContext) {
    return [
      "## public current market context",
      "- status: not loaded",
      "- note: load current markets on the redacted preview to add public mark, funding, and open-interest context.",
      "",
    ];
  }

  return [
    "## public current market context",
    `- label: ${marketContext.label.replaceAll("_", " ")}`,
    `- headline: ${marketContext.headline}`,
    `- fetched: ${marketContext.fetched_at_iso}`,
    `- matched markets: ${marketContext.matched_market_count}/${marketContext.rows.length}`,
    ...marketContext.rows.slice(0, 5).map(formatMarketContextRow),
    "",
  ];
}

function formatMarketContextRow(row: redacted_market_context_row) {
  return `- ${row.market} ${row.side}: current mark ${formatNullableUsd(row.current_mark_price_usd)}; funding now ${formatNullableSignedBps(row.current_funding_8h_bps_user_perspective)}; funding delta ${formatNullableSignedBps(row.funding_delta_bps_user_perspective)}; open interest ${formatNullableUsd(row.current_open_interest_usd)}; ${row.summary}`;
}

function formatMarketTrendSection(
  marketTrend: redacted_market_trend | undefined,
) {
  if (!marketTrend) {
    return [
      "## public 24h trend",
      "- status: not loaded",
      "- note: load 24h trends on the redacted preview to add public candle and funding-history context.",
      "",
    ];
  }

  return [
    "## public 24h trend",
    `- label: ${marketTrend.label.replaceAll("_", " ")}`,
    `- headline: ${marketTrend.headline}`,
    `- fetched: ${marketTrend.fetched_at_iso}`,
    `- window: ${marketTrend.window_hours}h ${marketTrend.interval}`,
    `- matched markets: ${marketTrend.matched_market_count}/${marketTrend.rows.length}`,
    ...marketTrend.rows.slice(0, 5).map(formatMarketTrendRow),
    "",
  ];
}

function formatMarketTrendRow(row: redacted_market_trend_row) {
  return `- ${row.market} ${row.side}: 24h price ${formatNullableSignedPercent(row.price_change_percent)}; high/low range ${formatNullablePercent(row.high_low_range_percent)}; avg funding ${formatNullableSignedBps(row.average_funding_8h_bps_user_perspective)}; latest funding ${formatNullableSignedBps(row.latest_funding_8h_bps_user_perspective)}; ${row.summary}`;
}

function formatWatchlistItems(items: redacted_market_watch_item[]) {
  if (items.length === 0) {
    return ["- no public review cues loaded"];
  }

  return items.slice(0, 5).flatMap((item) => [
    `- [${item.severity}] ${item.market}: ${item.title}`,
    `  detail: ${item.detail}`,
    ...item.review_points.slice(0, 2).map((point) => `  review: ${point}`),
  ]);
}

function formatBpsAsPercent(value: number | null) {
  return value === null ? "n/a" : `${(value / 100).toFixed(2)}%`;
}

function shortHash(value: string) {
  if (value.length <= 18) {
    return value;
  }

  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

function formatAgeMinutes(value: number) {
  if (value < 60) {
    return `${value}m`;
  }

  const hours = value / 60;

  if (hours < 24) {
    return `${formatPlainNumber(hours)}h`;
  }

  return `${formatPlainNumber(hours / 24)}d`;
}

function formatPlainNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
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

function formatSignedBps(value: number) {
  if (value === 0) {
    return "0.00 bps";
  }

  return `${value > 0 ? "+" : "-"}${Math.abs(value).toFixed(2)} bps`;
}

function formatNullableSignedBps(value: number | null) {
  return value === null ? "n/a" : formatSignedBps(value);
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
