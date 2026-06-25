import type {
  redacted_market_context,
  redacted_market_context_row,
} from "./redacted-market-context.ts";
import type {
  redacted_market_trend,
  redacted_market_trend_row,
} from "./redacted-market-trend.ts";
import type {
  redacted_receipt_bundle,
  redacted_receipt_market,
} from "../receipts/portable-receipt-bundle.ts";

const THIN_LIQUIDATION_DISTANCE_BPS = 500;
const TIGHT_LIQUIDATION_DISTANCE_BPS = 1_000;
const MATERIAL_PRICE_MOVE_PERCENT = 2;
const MATERIAL_FUNDING_BPS = 1;
const HIGH_RANGE_PERCENT = 8;
const RANGE_TO_BUFFER_WARN_RATIO = 0.5;

export type redacted_market_watch_severity = "info" | "watch" | "high";

export type redacted_market_watch_category =
  | "liquidation_buffer"
  | "adverse_trend"
  | "funding_cost"
  | "volatility_range"
  | "missing_market_context"
  | "missing_history";

export type redacted_market_watch_item = {
  id: string;
  market: string;
  side: redacted_receipt_market["side"];
  severity: redacted_market_watch_severity;
  category: redacted_market_watch_category;
  title: string;
  detail: string;
  review_points: string[];
};

export type redacted_market_watchlist_label =
  | "no_loaded_context"
  | "no_watch_items"
  | "watch_items_loaded"
  | "high_attention";

export type redacted_market_watchlist = {
  label: redacted_market_watchlist_label;
  headline: string;
  summary: string;
  item_count: number;
  high_count: number;
  watch_count: number;
  info_count: number;
  items: redacted_market_watch_item[];
};

export function buildRedactedMarketWatchlist(input: {
  bundle: redacted_receipt_bundle;
  marketContext?: redacted_market_context;
  marketTrend?: redacted_market_trend;
}): redacted_market_watchlist {
  const contextRowsByMarket = getRowsByMarket(input.marketContext?.rows ?? []);
  const trendRowsByMarket = getRowsByMarket(input.marketTrend?.rows ?? []);
  const hasLoadedContext =
    input.marketContext !== undefined || input.marketTrend !== undefined;

  if (!hasLoadedContext) {
    return buildWatchlistResult({
      label: "no_loaded_context",
      items: [],
    });
  }

  const items = input.bundle.markets
    .flatMap((market) =>
      buildMarketWatchItems({
        market,
        contextRow: contextRowsByMarket.get(market.market),
        trendRow: trendRowsByMarket.get(market.market),
        hasLoadedMarketContext: input.marketContext !== undefined,
        hasLoadedMarketTrend: input.marketTrend !== undefined,
      }),
    )
    .sort(compareWatchItems);

  return buildWatchlistResult({
    label: getWatchlistLabel(items),
    items,
  });
}

function buildMarketWatchItems(input: {
  market: redacted_receipt_market;
  contextRow: redacted_market_context_row | undefined;
  trendRow: redacted_market_trend_row | undefined;
  hasLoadedMarketContext: boolean;
  hasLoadedMarketTrend: boolean;
}): redacted_market_watch_item[] {
  const items: Array<redacted_market_watch_item | null> = [
    getLiquidationBufferItem(input.market),
    getAdverseTrendItem(input),
    getFundingCostItem(input),
    getVolatilityRangeItem(input),
    getMissingMarketContextItem(input),
    getMissingHistoryItem(input),
  ];

  return items.filter(isWatchItem);
}

function getLiquidationBufferItem(
  market: redacted_receipt_market,
): redacted_market_watch_item | null {
  const liquidationDistanceBps = market.liquidation_distance_bps;

  if (liquidationDistanceBps === null) {
    return null;
  }

  if (liquidationDistanceBps <= THIN_LIQUIDATION_DISTANCE_BPS) {
    return {
      id: `${market.market}:liquidation-buffer:thin`,
      market: market.market,
      side: market.side,
      severity: "high",
      category: "liquidation_buffer",
      title: "Thin disclosed liquidation buffer",
      detail: `The redacted share disclosed a ${formatBpsAsPercent(
        liquidationDistanceBps,
      )} liquidation distance for this side.`,
      review_points: [
        "Compare this buffer with public price movement and range before treating the snapshot as still representative.",
        "Exact liquidation verification still requires the hidden full snapshot.",
      ],
    };
  }

  if (liquidationDistanceBps <= TIGHT_LIQUIDATION_DISTANCE_BPS) {
    return {
      id: `${market.market}:liquidation-buffer:tight`,
      market: market.market,
      side: market.side,
      severity: "watch",
      category: "liquidation_buffer",
      title: "Tight disclosed liquidation buffer",
      detail: `The redacted share disclosed a ${formatBpsAsPercent(
        liquidationDistanceBps,
      )} liquidation distance for this side.`,
      review_points: [
        "Check whether recent public price movement used a meaningful share of the disclosed buffer.",
        "Use the full receipt bundle if exact liquidation math needs to be recomputed.",
      ],
    };
  }

  return null;
}

function getAdverseTrendItem(input: {
  market: redacted_receipt_market;
  trendRow: redacted_market_trend_row | undefined;
}): redacted_market_watch_item | null {
  const trendRow = input.trendRow;

  if (!trendRow?.has_history || trendRow.price_change_percent === null) {
    return null;
  }

  if (!isAdversePriceMove(input.market, trendRow.price_change_percent)) {
    return null;
  }

  const hasTightBuffer = isTightLiquidationDistance(
    input.market.liquidation_distance_bps,
  );
  const priceMove = formatSignedPercent(trendRow.price_change_percent);

  return {
    id: `${input.market.market}:adverse-trend`,
    market: input.market.market,
    side: input.market.side,
    severity: hasTightBuffer ? "high" : "watch",
    category: "adverse_trend",
    title: hasTightBuffer
      ? "Adverse trend near disclosed buffer"
      : "Adverse 24h price trend",
    detail: `The public 24h close-to-close move is ${priceMove}, which is adverse for the disclosed ${input.market.side} side.`,
    review_points: [
      "Review this alongside the disclosed liquidation distance and receipt data timestamp.",
      "Current market context cannot reveal the hidden saved mark price or exact position size.",
    ],
  } satisfies redacted_market_watch_item;
}

function getFundingCostItem(input: {
  market: redacted_receipt_market;
  contextRow: redacted_market_context_row | undefined;
  trendRow: redacted_market_trend_row | undefined;
}): redacted_market_watch_item | null {
  const averageFunding =
    input.trendRow?.average_funding_8h_bps_user_perspective ?? null;
  const latestFunding =
    input.trendRow?.latest_funding_8h_bps_user_perspective ?? null;
  const fundingDelta =
    input.contextRow?.funding_delta_bps_user_perspective ?? null;
  const hasPersistentFundingCost =
    averageFunding !== null &&
    latestFunding !== null &&
    averageFunding >= MATERIAL_FUNDING_BPS &&
    latestFunding >= MATERIAL_FUNDING_BPS;

  if (
    !hasPersistentFundingCost &&
    (fundingDelta === null || fundingDelta <= MATERIAL_FUNDING_BPS)
  ) {
    return null;
  }

  if (
    hasPersistentFundingCost &&
    fundingDelta !== null &&
    fundingDelta > MATERIAL_FUNDING_BPS
  ) {
    return {
      id: `${input.market.market}:funding-cost:persistent-and-worse`,
      market: input.market.market,
      side: input.market.side,
      severity: "high",
      category: "funding_cost",
      title: "Funding cost is persistent and more expensive now",
      detail: `Public funding stayed at or above ${MATERIAL_FUNDING_BPS.toFixed(
        2,
      )} bps for the disclosed side, and current funding is ${formatSignedBps(
        fundingDelta,
      )} versus the receipt.`,
      review_points: [
        "Compare current funding with the receipt timestamp before relying on the saved funding estimate.",
        "Funding costs can accumulate while the position stays open.",
      ],
    };
  }

  if (hasPersistentFundingCost) {
    return {
      id: `${input.market.market}:funding-cost:persistent`,
      market: input.market.market,
      side: input.market.side,
      severity: "watch",
      category: "funding_cost",
      title: "Persistent funding cost",
      detail: `Public funding averaged ${formatSignedBps(
        averageFunding,
      )} and most recently showed ${formatSignedBps(
        latestFunding,
      )} for the disclosed side.`,
      review_points: [
        "Review whether the receipt's funding estimate still represents the recent public funding regime.",
      ],
    };
  }

  if (fundingDelta === null || fundingDelta <= MATERIAL_FUNDING_BPS) {
    return null;
  }

  return {
    id: `${input.market.market}:funding-cost:current-more-expensive`,
    market: input.market.market,
    side: input.market.side,
    severity: "watch",
    category: "funding_cost",
    title: "Current funding is more expensive",
    detail: `Current public funding is ${formatSignedBps(
      fundingDelta,
    )} versus the redacted receipt for the disclosed side.`,
    review_points: [
      "Review current funding before treating the receipt's funding estimate as current.",
    ],
  } satisfies redacted_market_watch_item;
}

function getVolatilityRangeItem(input: {
  market: redacted_receipt_market;
  trendRow: redacted_market_trend_row | undefined;
}): redacted_market_watch_item | null {
  const highLowRangePercent = input.trendRow?.high_low_range_percent;

  if (highLowRangePercent === null || highLowRangePercent === undefined) {
    return null;
  }

  const liquidationDistanceBps = input.market.liquidation_distance_bps;
  const rangeBps = highLowRangePercent * 100;
  const rangeIsLargeComparedWithBuffer =
    liquidationDistanceBps !== null &&
    rangeBps >= liquidationDistanceBps * RANGE_TO_BUFFER_WARN_RATIO;

  if (rangeIsLargeComparedWithBuffer) {
    return {
      id: `${input.market.market}:range:relative-to-buffer`,
      market: input.market.market,
      side: input.market.side,
      severity: isTightLiquidationDistance(liquidationDistanceBps)
        ? "high"
        : "watch",
      category: "volatility_range",
      title: "24h range is large versus disclosed buffer",
      detail: `The public 24h high/low range is ${formatPercent(
        highLowRangePercent,
      )}; the redacted liquidation distance is ${formatBpsAsPercent(
        liquidationDistanceBps,
      )}.`,
      review_points: [
        "Review whether public intraday movement makes the saved risk snapshot stale.",
      ],
    };
  }

  if (highLowRangePercent >= HIGH_RANGE_PERCENT) {
    return {
      id: `${input.market.market}:range:high`,
      market: input.market.market,
      side: input.market.side,
      severity: "watch",
      category: "volatility_range",
      title: "High 24h public range",
      detail: `The public 24h high/low range is ${formatPercent(
        highLowRangePercent,
      )}.`,
      review_points: [
        "Review the receipt timestamp and current market context before relying on the snapshot.",
      ],
    };
  }

  return null;
}

function getMissingMarketContextItem(input: {
  market: redacted_receipt_market;
  contextRow: redacted_market_context_row | undefined;
  hasLoadedMarketContext: boolean;
}): redacted_market_watch_item | null {
  if (!input.hasLoadedMarketContext || input.contextRow?.found_current_market) {
    return null;
  }

  return {
    id: `${input.market.market}:missing-current-market-context`,
    market: input.market.market,
    side: input.market.side,
    severity: "info",
    category: "missing_market_context",
    title: "Current market context unavailable",
    detail:
      "The current public market lookup did not return a matching Hyperliquid market for this disclosed row.",
    review_points: [
      "Treat funding, open interest, and current mark comparison as unavailable for this market.",
    ],
  } satisfies redacted_market_watch_item;
}

function getMissingHistoryItem(input: {
  market: redacted_receipt_market;
  trendRow: redacted_market_trend_row | undefined;
  hasLoadedMarketTrend: boolean;
}): redacted_market_watch_item | null {
  if (!input.hasLoadedMarketTrend || input.trendRow?.has_history) {
    return null;
  }

  return {
    id: `${input.market.market}:missing-market-history`,
    market: input.market.market,
    side: input.market.side,
    severity: "info",
    category: "missing_history",
    title: "24h history unavailable",
    detail:
      "The public 24h candle and funding lookup did not return history for this disclosed market.",
    review_points: [
      "Treat recent trend and range checks as unavailable for this market.",
    ],
  } satisfies redacted_market_watch_item;
}

function getRowsByMarket<Row extends { market: string }>(rows: Row[]) {
  return new Map(rows.map((row) => [row.market, row]));
}

function isWatchItem(
  item: redacted_market_watch_item | null,
): item is redacted_market_watch_item {
  return item !== null;
}

function isAdversePriceMove(
  market: redacted_receipt_market,
  priceChangePercent: number,
) {
  return market.side === "long"
    ? priceChangePercent <= -MATERIAL_PRICE_MOVE_PERCENT
    : priceChangePercent >= MATERIAL_PRICE_MOVE_PERCENT;
}

function isTightLiquidationDistance(liquidationDistanceBps: number | null) {
  return (
    liquidationDistanceBps !== null &&
    liquidationDistanceBps <= TIGHT_LIQUIDATION_DISTANCE_BPS
  );
}

function getWatchlistLabel(
  items: redacted_market_watch_item[],
): redacted_market_watchlist_label {
  if (items.length === 0) {
    return "no_watch_items";
  }

  if (items.some((item) => item.severity === "high")) {
    return "high_attention";
  }

  return "watch_items_loaded";
}

function buildWatchlistResult(input: {
  label: redacted_market_watchlist_label;
  items: redacted_market_watch_item[];
}): redacted_market_watchlist {
  const highCount = input.items.filter((item) => item.severity === "high").length;
  const watchCount = input.items.filter(
    (item) => item.severity === "watch",
  ).length;
  const infoCount = input.items.filter((item) => item.severity === "info").length;

  return {
    label: input.label,
    headline: getHeadline(input.label),
    summary: getSummary(input.label),
    item_count: input.items.length,
    high_count: highCount,
    watch_count: watchCount,
    info_count: infoCount,
    items: input.items,
  };
}

function getHeadline(label: redacted_market_watchlist_label) {
  switch (label) {
    case "no_loaded_context":
      return "Load market context or 24h trends to build a review watchlist.";
    case "no_watch_items":
      return "No market review cues were found from the loaded public context.";
    case "watch_items_loaded":
      return "Market review cues are available for this redacted share.";
    case "high_attention":
      return "High-attention market review cues are available.";
  }
}

function getSummary(label: redacted_market_watchlist_label) {
  switch (label) {
    case "no_loaded_context":
      return "The watchlist uses disclosed redacted fields plus public current market or 24h trend data. It does not use a raw account address.";
    case "no_watch_items":
      return "Loaded public context did not cross the heuristic review thresholds. This is still not a recomputation of hidden account risk.";
    case "watch_items_loaded":
    case "high_attention":
      return "This is a review checklist, not a trading recommendation. It highlights where current public market context may matter when reading a stale or redacted risk snapshot.";
  }
}

function compareWatchItems(
  firstItem: redacted_market_watch_item,
  secondItem: redacted_market_watch_item,
) {
  const severityDifference =
    getSeverityRank(secondItem.severity) - getSeverityRank(firstItem.severity);

  if (severityDifference !== 0) {
    return severityDifference;
  }

  return firstItem.market.localeCompare(secondItem.market);
}

function getSeverityRank(severity: redacted_market_watch_severity) {
  switch (severity) {
    case "high":
      return 3;
    case "watch":
      return 2;
    case "info":
      return 1;
  }
}

function formatBpsAsPercent(value: number) {
  return `${(value / 100).toFixed(2)}%`;
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function formatSignedPercent(value: number) {
  const roundedValue = Math.round(value * 100) / 100;

  if (roundedValue === 0) {
    return "0.00%";
  }

  return `${roundedValue > 0 ? "+" : "-"}${Math.abs(roundedValue).toFixed(
    2,
  )}%`;
}

function formatSignedBps(value: number) {
  const roundedValue = Math.round(value * 100) / 100;

  if (roundedValue === 0) {
    return "0.00 bps";
  }

  return `${roundedValue > 0 ? "+" : "-"}${Math.abs(roundedValue).toFixed(
    2,
  )} bps`;
}
