import type { market_context, market_context_position } from "../market/market-context.ts";
import type {
  receipt_risk_driver_comparison,
  receipt_risk_driver_market_change,
} from "./receipt-risk-driver-comparison.ts";

export type receipt_recheck_watch_severity = "info" | "watch" | "high";

export type receipt_recheck_watch_category =
  | "account_mismatch"
  | "position_state"
  | "liquidation_buffer"
  | "adverse_mark_move"
  | "driver_score"
  | "funding_cost"
  | "open_interest"
  | "missing_market_context";

export type receipt_recheck_watch_item = {
  id: string;
  market: string;
  severity: receipt_recheck_watch_severity;
  category: receipt_recheck_watch_category;
  title: string;
  detail: string;
  review_points: string[];
};

export type receipt_recheck_watchlist_label =
  | "no_live_recheck"
  | "no_watch_items"
  | "watch_items_loaded"
  | "high_attention";

export type receipt_recheck_watchlist = {
  label: receipt_recheck_watchlist_label;
  headline: string;
  summary: string;
  thresholds: receipt_recheck_watchlist_thresholds;
  item_count: number;
  high_count: number;
  watch_count: number;
  info_count: number;
  items: receipt_recheck_watch_item[];
};

export type receipt_recheck_watchlist_thresholds = {
  material_daily_funding_usd: number;
  material_driver_score_delta: number;
  material_funding_8h_bps: number;
  material_mark_move_percent: number;
  material_open_interest_delta_usd: number;
  thin_liquidation_distance_bps: number;
  tight_liquidation_distance_bps: number;
};

export const defaultReceiptRecheckWatchlistThresholds: receipt_recheck_watchlist_thresholds =
  {
    material_daily_funding_usd: 1,
    material_driver_score_delta: 10,
    material_funding_8h_bps: 1,
    material_mark_move_percent: 2,
    material_open_interest_delta_usd: 50_000_000,
    thin_liquidation_distance_bps: 500,
    tight_liquidation_distance_bps: 1_000,
  };

export function buildReceiptRecheckWatchlist(input: {
  marketContext: market_context;
  riskDriverComparison: receipt_risk_driver_comparison;
  thresholds?: Partial<receipt_recheck_watchlist_thresholds>;
}): receipt_recheck_watchlist {
  const thresholds = resolveThresholds(input.thresholds);

  if (input.riskDriverComparison.label === "no_live_snapshot") {
    return buildWatchlistResult({
      label: "no_live_recheck",
      items: [],
      thresholds,
    });
  }

  const contextRowsByMarket = getRowsByMarket(input.marketContext.positions);
  const accountItems = getAccountItems(input.riskDriverComparison);
  const marketItems = input.riskDriverComparison.market_changes.flatMap(
    (marketChange) =>
      buildMarketWatchItems({
        marketChange,
        contextRow: contextRowsByMarket.get(marketChange.market) ?? null,
        thresholds,
      }),
  );
  const items = [...accountItems, ...marketItems].sort(compareWatchItems);

  return buildWatchlistResult({
    label: getWatchlistLabel(items),
    items,
    thresholds,
  });
}

function resolveThresholds(
  thresholds: Partial<receipt_recheck_watchlist_thresholds> | undefined,
): receipt_recheck_watchlist_thresholds {
  const merged = {
    ...defaultReceiptRecheckWatchlistThresholds,
    ...thresholds,
  };
  const thinLiquidationDistanceBps = Math.max(
    0,
    merged.thin_liquidation_distance_bps,
  );
  const tightLiquidationDistanceBps = Math.max(
    thinLiquidationDistanceBps,
    merged.tight_liquidation_distance_bps,
  );

  return {
    material_daily_funding_usd: Math.max(0, merged.material_daily_funding_usd),
    material_driver_score_delta: Math.max(0, merged.material_driver_score_delta),
    material_funding_8h_bps: Math.max(0, merged.material_funding_8h_bps),
    material_mark_move_percent: Math.max(0, merged.material_mark_move_percent),
    material_open_interest_delta_usd: Math.max(
      0,
      merged.material_open_interest_delta_usd,
    ),
    thin_liquidation_distance_bps: thinLiquidationDistanceBps,
    tight_liquidation_distance_bps: tightLiquidationDistanceBps,
  };
}

function getAccountItems(
  comparison: receipt_risk_driver_comparison,
): receipt_recheck_watch_item[] {
  if (comparison.account_matches) {
    return [];
  }

  return [
    {
      id: "account:account-mismatch",
      market: "account",
      severity: "high",
      category: "account_mismatch",
      title: "Live account does not match receipt account",
      detail:
        "The live recheck returned a different account, so saved and current risk rows should not be treated as comparable.",
      review_points: [
        "Verify the address before using this receipt as current account context.",
      ],
    },
  ];
}

function buildMarketWatchItems(input: {
  marketChange: receipt_risk_driver_market_change;
  contextRow: market_context_position | null;
  thresholds: receipt_recheck_watchlist_thresholds;
}) {
  const items: Array<receipt_recheck_watch_item | null> = [
    getPositionStateItem(input.marketChange),
    getLiquidationBufferItem(input),
    getAdverseMarkMoveItem(input),
    getDriverScoreItem(input),
    getFundingCostItem(input),
    getOpenInterestItem(input),
    getMissingMarketContextItem(input),
  ];

  return items.filter(isWatchItem);
}

function getPositionStateItem(
  marketChange: receipt_risk_driver_market_change,
): receipt_recheck_watch_item | null {
  if (marketChange.status === "same_position") {
    return null;
  }

  return {
    id: `${marketChange.market}:position-state`,
    market: marketChange.market,
    severity: "high",
    category: "position_state",
    title: "Position state changed since receipt",
    detail: marketChange.summary,
    review_points: [
      "Treat the saved receipt as historical for this market.",
      "Review the live position table before comparing driver deltas as the same risk object.",
    ],
  };
}

function getLiquidationBufferItem(input: {
  marketChange: receipt_risk_driver_market_change;
  contextRow: market_context_position | null;
  thresholds: receipt_recheck_watchlist_thresholds;
}): receipt_recheck_watch_item | null {
  const currentBufferBps =
    input.contextRow?.liquidation_distance_bps.current_value ??
    input.marketChange.current_driver?.liquidation_distance_bps ??
    null;

  if (currentBufferBps === null) {
    return null;
  }

  if (currentBufferBps <= 0) {
    return {
      id: `${input.marketChange.market}:liquidation-buffer:through`,
      market: input.marketChange.market,
      severity: "high",
      category: "liquidation_buffer",
      title: "At or through listed liquidation price",
      detail:
        "The current listed liquidation distance is at or below zero for this market.",
      review_points: [
        "Use this as an urgent review cue, not as exchange-official liquidation proof.",
      ],
    };
  }

  if (currentBufferBps <= input.thresholds.thin_liquidation_distance_bps) {
    return {
      id: `${input.marketChange.market}:liquidation-buffer:thin`,
      market: input.marketChange.market,
      severity: "high",
      category: "liquidation_buffer",
      title: "Thin current listed liquidation buffer",
      detail: `The current listed liquidation distance is ${formatBpsAsPercent(
        currentBufferBps,
      )}.`,
      review_points: [
        "Compare the current buffer with mark movement since the receipt.",
        "Exact liquidation behavior can still change with cross-margin state and funding.",
      ],
    };
  }

  if (currentBufferBps <= input.thresholds.tight_liquidation_distance_bps) {
    return {
      id: `${input.marketChange.market}:liquidation-buffer:tight`,
      market: input.marketChange.market,
      severity: "watch",
      category: "liquidation_buffer",
      title: "Tight current listed liquidation buffer",
      detail: `The current listed liquidation distance is ${formatBpsAsPercent(
        currentBufferBps,
      )}.`,
      review_points: [
        "Review this market before treating the saved receipt as still representative.",
      ],
    };
  }

  return null;
}

function getAdverseMarkMoveItem(input: {
  marketChange: receipt_risk_driver_market_change;
  contextRow: market_context_position | null;
  thresholds: receipt_recheck_watchlist_thresholds;
}): receipt_recheck_watch_item | null {
  const contextRow = input.contextRow;

  if (
    !contextRow ||
    contextRow.mark_move_direction !== "toward_liquidation" ||
    Math.abs(contextRow.mark_price_change_percent ?? 0) <
      input.thresholds.material_mark_move_percent
  ) {
    return null;
  }

  const isNearListedBuffer =
    (contextRow.liquidation_distance_bps.current_value ?? Infinity) <=
    input.thresholds.tight_liquidation_distance_bps;

  return {
    id: `${input.marketChange.market}:adverse-mark-move`,
    market: input.marketChange.market,
    severity: isNearListedBuffer ? "high" : "watch",
    category: "adverse_mark_move",
    title: isNearListedBuffer
      ? "Adverse mark move near listed buffer"
      : "Adverse mark move since receipt",
    detail: `Mark moved ${formatSignedPercent(
      contextRow.mark_price_change_percent ?? 0,
    )} toward the listed liquidation price.`,
    review_points: [
      "Review this alongside the current listed liquidation distance.",
      "Mark price is descriptive receipt context, not a trade signal.",
    ],
  };
}

function getDriverScoreItem(input: {
  marketChange: receipt_risk_driver_market_change;
  thresholds: receipt_recheck_watchlist_thresholds;
}): receipt_recheck_watch_item | null {
  const driverScoreDelta = input.marketChange.driver_score_delta;

  if (
    driverScoreDelta === null ||
    Math.abs(driverScoreDelta) < input.thresholds.material_driver_score_delta
  ) {
    return null;
  }

  if (driverScoreDelta > 0) {
    return {
      id: `${input.marketChange.market}:driver-score:higher`,
      market: input.marketChange.market,
      severity: "watch",
      category: "driver_score",
      title: "Driver score is higher now",
      detail: `The heuristic driver score moved by ${formatSignedNumber(
        driverScoreDelta,
      )} points since the receipt.`,
      review_points: [
        "Inspect which component moved before relying on the saved risk snapshot.",
      ],
    };
  }

  return {
    id: `${input.marketChange.market}:driver-score:lower`,
    market: input.marketChange.market,
    severity: "info",
    category: "driver_score",
    title: "Driver score is lower now",
    detail: `The heuristic driver score moved by ${formatSignedNumber(
      driverScoreDelta,
    )} points since the receipt.`,
    review_points: [
      "Lower score is descriptive context only; it is not a recommendation.",
    ],
  };
}

function getFundingCostItem(input: {
  marketChange: receipt_risk_driver_market_change;
  contextRow: market_context_position | null;
  thresholds: receipt_recheck_watchlist_thresholds;
}): receipt_recheck_watch_item | null {
  const dailyFundingDelta =
    input.marketChange.daily_funding_delta_usd ??
    input.contextRow?.daily_funding_usd.delta ??
    null;
  const currentDailyFunding =
    input.marketChange.current_driver?.daily_funding_usd ??
    input.contextRow?.daily_funding_usd.current_value ??
    null;
  const fundingBpsDelta =
    input.contextRow?.funding_8h_bps_user_perspective.delta ?? null;
  const hasDailyFundingCostIncrease =
    currentDailyFunding !== null &&
    currentDailyFunding > 0 &&
    dailyFundingDelta !== null &&
    dailyFundingDelta >= input.thresholds.material_daily_funding_usd;
  const hasFundingRateIncrease =
    fundingBpsDelta !== null &&
    fundingBpsDelta >= input.thresholds.material_funding_8h_bps;

  if (!hasDailyFundingCostIncrease && !hasFundingRateIncrease) {
    return null;
  }

  return {
    id: `${input.marketChange.market}:funding-cost`,
    market: input.marketChange.market,
    severity: "watch",
    category: "funding_cost",
    title: "Funding cost is higher now",
    detail: [
      `Daily funding delta: ${formatSignedNullableUsd(dailyFundingDelta)}.`,
      `8h funding delta: ${formatSignedNullableBps(fundingBpsDelta)}.`,
    ].join(" "),
    review_points: [
      "Funding can accumulate while a position stays open.",
      "Actual Hyperliquid funding settlement uses oracle-price notional.",
    ],
  };
}

function getOpenInterestItem(input: {
  marketChange: receipt_risk_driver_market_change;
  contextRow: market_context_position | null;
  thresholds: receipt_recheck_watchlist_thresholds;
}): receipt_recheck_watch_item | null {
  const openInterestDelta = input.contextRow?.open_interest_usd.delta ?? null;

  if (
    openInterestDelta === null ||
    Math.abs(openInterestDelta) <
      input.thresholds.material_open_interest_delta_usd
  ) {
    return null;
  }

  return {
    id: `${input.marketChange.market}:open-interest`,
    market: input.marketChange.market,
    severity: "info",
    category: "open_interest",
    title: "Open interest moved materially",
    detail: `Open interest moved by ${formatSignedUsd(openInterestDelta)} since the receipt.`,
    review_points: [
      "Treat open interest as participation context, not a standalone direction signal.",
    ],
  };
}

function getMissingMarketContextItem(input: {
  marketChange: receipt_risk_driver_market_change;
  contextRow: market_context_position | null;
}): receipt_recheck_watch_item | null {
  if (input.contextRow) {
    return null;
  }

  return {
    id: `${input.marketChange.market}:missing-market-context`,
    market: input.marketChange.market,
    severity: "info",
    category: "missing_market_context",
    title: "Market context row unavailable",
    detail:
      "The risk-driver row has no matching saved/current market-context row.",
    review_points: [
      "Treat mark, funding, liquidation-distance, and open-interest comparison as unavailable for this market.",
    ],
  };
}

function getRowsByMarket<Row extends { market: string }>(rows: Row[]) {
  return new Map(rows.map((row) => [row.market, row]));
}

function isWatchItem(
  item: receipt_recheck_watch_item | null,
): item is receipt_recheck_watch_item {
  return item !== null;
}

function getWatchlistLabel(
  items: receipt_recheck_watch_item[],
): receipt_recheck_watchlist_label {
  if (items.length === 0) {
    return "no_watch_items";
  }

  if (items.some((item) => item.severity === "high")) {
    return "high_attention";
  }

  return "watch_items_loaded";
}

function buildWatchlistResult(input: {
  label: receipt_recheck_watchlist_label;
  items: receipt_recheck_watch_item[];
  thresholds: receipt_recheck_watchlist_thresholds;
}): receipt_recheck_watchlist {
  const highCount = input.items.filter((item) => item.severity === "high").length;
  const watchCount = input.items.filter(
    (item) => item.severity === "watch",
  ).length;
  const infoCount = input.items.filter((item) => item.severity === "info").length;

  return {
    label: input.label,
    headline: getHeadline(input.label),
    summary: getSummary(input.label),
    thresholds: input.thresholds,
    item_count: input.items.length,
    high_count: highCount,
    watch_count: watchCount,
    info_count: infoCount,
    items: input.items,
  };
}

function getHeadline(label: receipt_recheck_watchlist_label) {
  switch (label) {
    case "no_live_recheck":
      return "Run a live recheck to build the receipt watchlist.";
    case "no_watch_items":
      return "No receipt recheck watch cues crossed the current thresholds.";
    case "watch_items_loaded":
      return "Receipt recheck watch cues are available.";
    case "high_attention":
      return "High-attention receipt recheck cues are available.";
  }
}

function getSummary(label: receipt_recheck_watchlist_label) {
  switch (label) {
    case "no_live_recheck":
      return "The watchlist uses saved/current driver rows and market-context rows after a live recheck.";
    case "no_watch_items":
      return "The saved and current receipt context is close by current app thresholds. This is still not protocol-official risk.";
    case "watch_items_loaded":
    case "high_attention":
      return "This is a review checklist, not a trading recommendation. It ranks where saved/current driver and market context differ most.";
  }
}

function compareWatchItems(
  firstItem: receipt_recheck_watch_item,
  secondItem: receipt_recheck_watch_item,
) {
  const severityDifference =
    getSeverityRank(secondItem.severity) - getSeverityRank(firstItem.severity);

  if (severityDifference !== 0) {
    return severityDifference;
  }

  const categoryDifference =
    getCategoryRank(secondItem.category) - getCategoryRank(firstItem.category);

  if (categoryDifference !== 0) {
    return categoryDifference;
  }

  return firstItem.market.localeCompare(secondItem.market);
}

function getSeverityRank(severity: receipt_recheck_watch_severity) {
  switch (severity) {
    case "high":
      return 3;
    case "watch":
      return 2;
    case "info":
      return 1;
  }
}

function getCategoryRank(category: receipt_recheck_watch_category) {
  switch (category) {
    case "account_mismatch":
      return 8;
    case "position_state":
      return 7;
    case "liquidation_buffer":
      return 6;
    case "adverse_mark_move":
      return 5;
    case "driver_score":
      return 4;
    case "funding_cost":
      return 3;
    case "open_interest":
      return 2;
    case "missing_market_context":
      return 1;
  }
}

function formatBpsAsPercent(value: number) {
  return `${(value / 100).toFixed(2)}%`;
}

function formatSignedNumber(value: number) {
  if (value === 0) {
    return "0";
  }

  return `${value > 0 ? "+" : "-"}${Math.abs(value).toFixed(2)}`;
}

function formatSignedPercent(value: number) {
  return `${formatSignedNumber(value)}%`;
}

function formatSignedUsd(value: number) {
  return `${formatSignedNumber(value)} USD`;
}

function formatSignedNullableUsd(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return formatSignedUsd(value);
}

function formatSignedNullableBps(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return `${formatSignedNumber(value)} bps`;
}
