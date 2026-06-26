import type {
  market_context,
  market_context_position,
  market_move_direction,
} from "../market/market-context.ts";
import type {
  receipt_market_regime_severity,
} from "./receipt-market-regime.ts";
import type {
  receipt_risk_driver_comparison,
  receipt_risk_driver_market_change,
} from "./receipt-risk-driver-comparison.ts";
import type {
  receipt_recheck_watch_item,
  receipt_recheck_watchlist,
} from "./receipt-recheck-watchlist.ts";
import type {
  receipt_volatility_buffer,
  receipt_volatility_buffer_row,
} from "./receipt-volatility-buffer.ts";
import type { snapshot_comparison } from "./snapshot-comparison.ts";

export type receipt_market_regime_drilldown_row = {
  market: string;
  status: market_context_position["status"];
  severity: receipt_market_regime_severity;
  primary_cue: string;
  summary: string;
  current_driver_score: number | null;
  driver_score_delta: number | null;
  current_liquidation_distance_bps: number | null;
  current_daily_funding_usd: number | null;
  current_funding_burden_bps: number | null;
  mark_move_direction: market_move_direction;
  mark_price_change_percent: number | null;
  open_interest_delta_usd: number | null;
  volatility_severity: receipt_volatility_buffer_row["severity"] | null;
  volatility_range_to_buffer_ratio: number | null;
  watchlist_high_count: number;
  watchlist_watch_count: number;
  watchlist_info_count: number;
  review_points: string[];
};

export type receipt_market_regime_drilldown = {
  headline: string;
  summary: string;
  focus_market: string | null;
  row_count: number;
  critical_count: number;
  high_count: number;
  watch_count: number;
  info_count: number;
  rows: receipt_market_regime_drilldown_row[];
};

const WATCH_FUNDING_BURDEN_BPS = 5;

export function buildReceiptMarketRegimeDrilldown(input: {
  comparison: snapshot_comparison;
  marketContext: market_context;
  riskDriverComparison: receipt_risk_driver_comparison;
  volatilityBuffer?: receipt_volatility_buffer | null;
  watchlist: receipt_recheck_watchlist;
}): receipt_market_regime_drilldown {
  const rows = getMarketNames(input)
    .map((market) => buildDrilldownRow({ ...input, market }))
    .sort(compareRows);
  const focusRow = rows[0] ?? null;

  return {
    headline: getHeadline(rows),
    summary: getSummary({ focusRow, rows }),
    focus_market: focusRow?.market ?? null,
    row_count: rows.length,
    critical_count: rows.filter((row) => row.severity === "critical").length,
    high_count: rows.filter((row) => row.severity === "high").length,
    watch_count: rows.filter((row) => row.severity === "watch").length,
    info_count: rows.filter((row) => row.severity === "info").length,
    rows,
  };
}

function buildDrilldownRow(input: {
  comparison: snapshot_comparison;
  market: string;
  marketContext: market_context;
  riskDriverComparison: receipt_risk_driver_comparison;
  volatilityBuffer?: receipt_volatility_buffer | null;
  watchlist: receipt_recheck_watchlist;
}): receipt_market_regime_drilldown_row {
  const marketChange = getMarketChange(input);
  const contextRow = getContextRow(input);
  const volatilityRow = getVolatilityRow(input);
  const watchItems = getWatchItems(input);
  const currentDailyFundingUsd = getCurrentDailyFundingUsd({
    contextRow,
    marketChange,
  });
  const currentFundingBurdenBps = getCurrentFundingBurdenBps({
    currentAccountValueUsd: input.comparison.metrics.account_value_usd.current_value,
    currentDailyFundingUsd,
  });
  const row = {
    market: input.market,
    status: contextRow?.status ?? marketChange?.status ?? "same_position",
    current_driver_score: marketChange?.current_driver?.driver_score ?? null,
    driver_score_delta: marketChange?.driver_score_delta ?? null,
    current_liquidation_distance_bps:
      contextRow?.liquidation_distance_bps.current_value ??
      marketChange?.current_driver?.liquidation_distance_bps ??
      null,
    current_daily_funding_usd: currentDailyFundingUsd,
    current_funding_burden_bps: currentFundingBurdenBps,
    mark_move_direction: contextRow?.mark_move_direction ?? "not_comparable",
    mark_price_change_percent: contextRow?.mark_price_change_percent ?? null,
    open_interest_delta_usd: contextRow?.open_interest_usd.delta ?? null,
    volatility_severity: volatilityRow?.severity ?? null,
    volatility_range_to_buffer_ratio:
      volatilityRow?.range_to_buffer_ratio ?? null,
    watchlist_high_count: watchItems.filter((item) => item.severity === "high")
      .length,
    watchlist_watch_count: watchItems.filter((item) => item.severity === "watch")
      .length,
    watchlist_info_count: watchItems.filter((item) => item.severity === "info")
      .length,
  } satisfies Omit<
    receipt_market_regime_drilldown_row,
    "primary_cue" | "review_points" | "severity" | "summary"
  >;
  const severity = getRowSeverity({
    accountMatches: input.riskDriverComparison.account_matches,
    row,
    volatilityRow,
    watchItems,
  });

  return {
    ...row,
    severity,
    primary_cue: getPrimaryCue({
      accountMatches: input.riskDriverComparison.account_matches,
      contextRow,
      marketChange,
      row,
      volatilityRow,
      watchItems,
    }),
    summary: getRowSummary({
      accountMatches: input.riskDriverComparison.account_matches,
      contextRow,
      marketChange,
      row,
      volatilityRow,
      watchItems,
    }),
    review_points: getReviewPoints({
      accountMatches: input.riskDriverComparison.account_matches,
      contextRow,
      row,
      volatilityRow,
      watchItems,
    }),
  };
}

function getMarketNames(input: {
  marketContext: market_context;
  riskDriverComparison: receipt_risk_driver_comparison;
  volatilityBuffer?: receipt_volatility_buffer | null;
  watchlist: receipt_recheck_watchlist;
}) {
  return Array.from(
    new Set([
      ...input.marketContext.positions.map((position) => position.market),
      ...input.riskDriverComparison.market_changes.map(
        (marketChange) => marketChange.market,
      ),
      ...(input.volatilityBuffer?.rows.map((row) => row.market) ?? []),
      ...input.watchlist.items
        .filter((item) => item.market !== "account")
        .map((item) => item.market),
    ]),
  ).sort((leftMarket, rightMarket) => leftMarket.localeCompare(rightMarket));
}

function getMarketChange(input: {
  market: string;
  riskDriverComparison: receipt_risk_driver_comparison;
}) {
  return (
    input.riskDriverComparison.market_changes.find(
      (marketChange) => marketChange.market === input.market,
    ) ?? null
  );
}

function getContextRow(input: {
  market: string;
  marketContext: market_context;
}) {
  return (
    input.marketContext.positions.find(
      (position) => position.market === input.market,
    ) ?? null
  );
}

function getVolatilityRow(input: {
  market: string;
  volatilityBuffer?: receipt_volatility_buffer | null;
}) {
  return (
    input.volatilityBuffer?.rows.find((row) => row.market === input.market) ??
    null
  );
}

function getWatchItems(input: {
  market: string;
  watchlist: receipt_recheck_watchlist;
}) {
  return input.watchlist.items.filter((item) => item.market === input.market);
}

function getCurrentDailyFundingUsd(input: {
  contextRow: market_context_position | null;
  marketChange: receipt_risk_driver_market_change | null;
}) {
  return (
    input.marketChange?.current_driver?.daily_funding_usd ??
    input.contextRow?.daily_funding_usd.current_value ??
    null
  );
}

function getCurrentFundingBurdenBps(input: {
  currentAccountValueUsd: number | null;
  currentDailyFundingUsd: number | null;
}) {
  if (
    input.currentAccountValueUsd === null ||
    input.currentAccountValueUsd <= 0 ||
    input.currentDailyFundingUsd === null ||
    input.currentDailyFundingUsd <= 0
  ) {
    return null;
  }

  return round((input.currentDailyFundingUsd / input.currentAccountValueUsd) * 10_000);
}

function getRowSeverity(input: {
  accountMatches: boolean;
  row: Omit<
    receipt_market_regime_drilldown_row,
    "primary_cue" | "review_points" | "severity" | "summary"
  >;
  volatilityRow: receipt_volatility_buffer_row | null;
  watchItems: receipt_recheck_watch_item[];
}): receipt_market_regime_severity {
  if (!input.accountMatches) {
    return "critical";
  }

  if (
    input.row.status !== "same_position" ||
    input.watchItems.some((item) => item.severity === "high") ||
    input.volatilityRow?.severity === "high"
  ) {
    return "high";
  }

  if (
    input.watchItems.some((item) => item.severity === "watch") ||
    input.volatilityRow?.severity === "watch" ||
    (input.row.current_funding_burden_bps ?? 0) >= WATCH_FUNDING_BURDEN_BPS
  ) {
    return "watch";
  }

  return "info";
}

function getPrimaryCue(input: {
  accountMatches: boolean;
  contextRow: market_context_position | null;
  marketChange: receipt_risk_driver_market_change | null;
  row: Pick<receipt_market_regime_drilldown_row, "status">;
  volatilityRow: receipt_volatility_buffer_row | null;
  watchItems: receipt_recheck_watch_item[];
}) {
  const topWatchItem = input.watchItems[0] ?? null;

  if (!input.accountMatches) {
    return "Live account mismatch";
  }

  if (input.row.status !== "same_position") {
    return "Position state changed";
  }

  if (topWatchItem && topWatchItem.severity !== "info") {
    return topWatchItem.title;
  }

  if (input.volatilityRow && input.volatilityRow.severity !== "info") {
    return input.volatilityRow.summary;
  }

  if (input.contextRow) {
    return input.contextRow.summary;
  }

  if (input.marketChange) {
    return input.marketChange.summary;
  }

  return "No row-level regime cue";
}

function getRowSummary(input: {
  accountMatches: boolean;
  contextRow: market_context_position | null;
  marketChange: receipt_risk_driver_market_change | null;
  row: Pick<
    receipt_market_regime_drilldown_row,
    "current_funding_burden_bps" | "mark_price_change_percent" | "market" | "status"
  >;
  volatilityRow: receipt_volatility_buffer_row | null;
  watchItems: receipt_recheck_watch_item[];
}) {
  const topWatchItem = input.watchItems[0] ?? null;

  if (!input.accountMatches) {
    return `${input.row.market} is part of a recheck where the live account does not match the receipt account.`;
  }

  if (input.row.status !== "same_position") {
    return `${input.row.market} is historical for regime review because the position state changed.`;
  }

  if (topWatchItem) {
    return `${input.row.market} is driven by ${topWatchItem.title.toLowerCase()}: ${topWatchItem.detail}`;
  }

  if (
    input.volatilityRow &&
    input.volatilityRow.severity !== "info"
  ) {
    return `${input.row.market} has a volatility-buffer cue: ${input.volatilityRow.summary}`;
  }

  if (
    input.row.current_funding_burden_bps !== null &&
    input.row.current_funding_burden_bps >= WATCH_FUNDING_BURDEN_BPS
  ) {
    return `${input.row.market} has elevated positive funding burden versus current account value.`;
  }

  return (
    input.contextRow?.summary ??
    input.marketChange?.summary ??
    `${input.row.market} has no high/watch drilldown cue by current app thresholds.`
  );
}

function getReviewPoints(input: {
  accountMatches: boolean;
  contextRow: market_context_position | null;
  row: Pick<
    receipt_market_regime_drilldown_row,
    "current_funding_burden_bps" | "market" | "status"
  >;
  volatilityRow: receipt_volatility_buffer_row | null;
  watchItems: receipt_recheck_watch_item[];
}) {
  const points = [
    ...input.watchItems.flatMap((item) => item.review_points),
    ...(input.volatilityRow?.review_points ?? []),
  ];

  if (!input.accountMatches) {
    points.unshift("Verify the live address before using market rows as current context.");
  }

  if (input.row.status !== "same_position") {
    points.unshift("Treat this row as historical rather than directly comparable.");
  }

  if (
    input.row.current_funding_burden_bps !== null &&
    input.row.current_funding_burden_bps >= WATCH_FUNDING_BURDEN_BPS
  ) {
    points.push("Funding burden is position-level holding-cost context, not a trade instruction.");
  }

  if (input.contextRow?.open_interest_usd.delta != null) {
    points.push("Open interest is participation context, not a standalone direction signal.");
  }

  if (points.length === 0) {
    return [
      "No high/watch per-market regime cue crossed the current app thresholds.",
    ];
  }

  return Array.from(new Set(points)).slice(0, 4);
}

function getHeadline(rows: receipt_market_regime_drilldown_row[]) {
  if (rows.length === 0) {
    return "No per-market regime rows are available.";
  }

  if (rows.some((row) => row.severity === "critical")) {
    return "Per-market regime rows are not directly comparable.";
  }

  if (rows.some((row) => row.severity === "high")) {
    return "Per-market regime rows show high-attention markets.";
  }

  if (rows.some((row) => row.severity === "watch")) {
    return "Per-market regime rows show watch-level markets.";
  }

  return "Per-market regime rows are calm by current app thresholds.";
}

function getSummary(input: {
  focusRow: receipt_market_regime_drilldown_row | null;
  rows: receipt_market_regime_drilldown_row[];
}) {
  if (!input.focusRow) {
    return "Run a live receipt recheck to build per-market regime rows.";
  }

  return `${input.focusRow.market} is the first row to inspect. The drilldown explains the account-level regime using market-level buffer, funding, volatility, mark movement, open interest, and watchlist cues.`;
}

function compareRows(
  firstRow: receipt_market_regime_drilldown_row,
  secondRow: receipt_market_regime_drilldown_row,
) {
  const severityDifference =
    getSeverityRank(secondRow.severity) - getSeverityRank(firstRow.severity);

  if (severityDifference !== 0) {
    return severityDifference;
  }

  const watchDifference =
    secondRow.watchlist_high_count - firstRow.watchlist_high_count ||
    secondRow.watchlist_watch_count - firstRow.watchlist_watch_count ||
    secondRow.watchlist_info_count - firstRow.watchlist_info_count;

  if (watchDifference !== 0) {
    return watchDifference;
  }

  const scoreDifference =
    (secondRow.current_driver_score ?? -1) - (firstRow.current_driver_score ?? -1);

  if (scoreDifference !== 0) {
    return scoreDifference;
  }

  return firstRow.market.localeCompare(secondRow.market);
}

function getSeverityRank(severity: receipt_market_regime_severity) {
  switch (severity) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "watch":
      return 2;
    case "info":
      return 1;
  }
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
