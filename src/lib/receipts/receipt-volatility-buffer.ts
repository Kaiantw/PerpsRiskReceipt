import type { hyperliquid_market_history } from "../hyperliquid/adapter.ts";
import type {
  market_context,
  market_context_position,
} from "../market/market-context.ts";

export type receipt_volatility_buffer_label =
  | "no_comparable_positions"
  | "no_history"
  | "missing_buffer"
  | "range_exceeds_buffer"
  | "range_near_buffer"
  | "adverse_trend_near_buffer"
  | "volatility_context_loaded";

export type receipt_volatility_buffer_severity = "info" | "watch" | "high";

export type receipt_volatility_buffer_row = {
  market: string;
  status: market_context_position["status"];
  side: market_context_position["side"];
  severity: receipt_volatility_buffer_severity;
  has_history: boolean;
  current_liquidation_distance_bps: number | null;
  current_liquidation_distance_percent: number | null;
  candle_count: number;
  latest_close_price_usd: number | null;
  price_change_percent: number | null;
  adverse_price_change_percent: number | null;
  high_low_range_percent: number | null;
  average_true_range_percent: number | null;
  range_to_buffer_ratio: number | null;
  atr_buffer_multiple: number | null;
  summary: string;
  review_points: string[];
};

export type receipt_volatility_buffer = {
  label: receipt_volatility_buffer_label;
  headline: string;
  summary: string;
  fetched_at_iso: string;
  window_hours: number;
  interval: string;
  matched_market_count: number;
  high_count: number;
  watch_count: number;
  info_count: number;
  focus_market: string | null;
  rows: receipt_volatility_buffer_row[];
};

type candle_range = {
  high_price_usd: number;
  low_price_usd: number;
  open_price_usd: number;
  close_price_usd: number;
};

function round(value: number, decimals = 2) {
  const multiplier = 10 ** decimals;

  return Math.round(value * multiplier) / multiplier;
}

function divideOrNull(numerator: number | null, denominator: number | null) {
  if (
    numerator === null ||
    denominator === null ||
    denominator === 0 ||
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator)
  ) {
    return null;
  }

  return round(numerator / denominator, 2);
}

function getHistoriesByMarket(histories: hyperliquid_market_history[]) {
  return new Map(histories.map((history) => [history.market, history]));
}

function getHighLowRangePercent(input: {
  candles: candle_range[];
  latestClosePriceUsd: number | null;
}) {
  if (input.candles.length === 0 || input.latestClosePriceUsd === null) {
    return null;
  }

  const highPriceUsd = Math.max(
    ...input.candles.map((candle) => candle.high_price_usd),
  );
  const lowPriceUsd = Math.min(
    ...input.candles.map((candle) => candle.low_price_usd),
  );

  return round(
    ((highPriceUsd - lowPriceUsd) / input.latestClosePriceUsd) * 100,
  );
}

function getPriceChangePercent(input: {
  firstClosePriceUsd: number | null;
  latestClosePriceUsd: number | null;
}) {
  if (
    input.firstClosePriceUsd === null ||
    input.latestClosePriceUsd === null ||
    input.firstClosePriceUsd === 0
  ) {
    return null;
  }

  return round(
    ((input.latestClosePriceUsd - input.firstClosePriceUsd) /
      input.firstClosePriceUsd) *
      100,
  );
}

function getAverageTrueRangePercent(input: {
  candles: candle_range[];
  latestClosePriceUsd: number | null;
}) {
  if (input.candles.length === 0 || input.latestClosePriceUsd === null) {
    return null;
  }

  const trueRanges = input.candles.map((candle, index) => {
    const previousClosePriceUsd =
      input.candles[index - 1]?.close_price_usd ?? candle.open_price_usd;

    return Math.max(
      candle.high_price_usd - candle.low_price_usd,
      Math.abs(candle.high_price_usd - previousClosePriceUsd),
      Math.abs(candle.low_price_usd - previousClosePriceUsd),
    );
  });
  const averageTrueRangeUsd =
    trueRanges.reduce((sum, value) => sum + value, 0) / trueRanges.length;

  return round((averageTrueRangeUsd / input.latestClosePriceUsd) * 100);
}

function getAdversePriceChangePercent(input: {
  priceChangePercent: number | null;
  side: market_context_position["side"];
}) {
  if (input.priceChangePercent === null || input.side === "n/a") {
    return null;
  }

  if (input.side === "long" && input.priceChangePercent < 0) {
    return Math.abs(input.priceChangePercent);
  }

  if (input.side === "short" && input.priceChangePercent > 0) {
    return input.priceChangePercent;
  }

  return 0;
}

function getRowSeverity(input: {
  adversePriceChangePercent: number | null;
  currentLiquidationDistancePercent: number | null;
  hasHistory: boolean;
  highLowRangePercent: number | null;
  status: market_context_position["status"];
}) {
  if (!input.hasHistory || input.status !== "same_position") {
    return "info";
  }

  if (
    input.currentLiquidationDistancePercent !== null &&
    input.currentLiquidationDistancePercent <= 0
  ) {
    return "high";
  }

  if (
    input.currentLiquidationDistancePercent !== null &&
    input.highLowRangePercent !== null &&
    input.highLowRangePercent >= input.currentLiquidationDistancePercent
  ) {
    return "high";
  }

  if (
    input.currentLiquidationDistancePercent !== null &&
    input.adversePriceChangePercent !== null &&
    input.currentLiquidationDistancePercent <= 10 &&
    input.adversePriceChangePercent >= 2
  ) {
    return "high";
  }

  if (
    input.currentLiquidationDistancePercent !== null &&
    input.highLowRangePercent !== null &&
    input.highLowRangePercent >= input.currentLiquidationDistancePercent / 2
  ) {
    return "watch";
  }

  return "info";
}

function buildReviewPoints(
  row: Omit<receipt_volatility_buffer_row, "summary" | "review_points">,
) {
  if (row.status !== "same_position") {
    return [
      "Position state changed, so volatility context is historical rather than directly comparable.",
    ];
  }

  if (!row.has_history) {
    return [
      "Loadable 24h candle history was unavailable for this market.",
      "Use saved/current receipt context while public history is unavailable.",
    ];
  }

  if (row.current_liquidation_distance_percent === null) {
    return [
      "Current listed liquidation distance is unavailable, so buffer coverage cannot be calculated.",
    ];
  }

  if (row.current_liquidation_distance_percent <= 0) {
    return [
      "The current listed liquidation distance is at or below zero.",
      "This is a review cue, not protocol-official liquidation proof.",
    ];
  }

  if (
    row.high_low_range_percent !== null &&
    row.high_low_range_percent >= row.current_liquidation_distance_percent
  ) {
    return [
      "The public 24h high-low range is larger than the current listed buffer.",
      "Compare this with current mark direction and position state before treating the receipt as representative.",
    ];
  }

  if (
    row.high_low_range_percent !== null &&
    row.high_low_range_percent >= row.current_liquidation_distance_percent / 2
  ) {
    return [
      "The public 24h high-low range used at least half of the current listed buffer.",
      "Review recent volatility alongside listed liquidation distance.",
    ];
  }

  return [
    "Public 24h volatility is loaded for context.",
    "This does not predict direction or replace exact exchange risk checks.",
  ];
}

function buildRowSummary(row: Omit<receipt_volatility_buffer_row, "summary" | "review_points">) {
  if (row.status !== "same_position") {
    return "Position state changed; volatility buffer is not directly comparable for this market.";
  }

  if (!row.has_history) {
    return "No 24h public candle history was returned for this market.";
  }

  if (row.current_liquidation_distance_percent === null) {
    return "Current listed liquidation distance is unavailable, so volatility coverage cannot be calculated.";
  }

  if (row.current_liquidation_distance_percent <= 0) {
    return "Current listed liquidation distance is at or below zero.";
  }

  if (
    row.high_low_range_percent !== null &&
    row.high_low_range_percent >= row.current_liquidation_distance_percent
  ) {
    return "The public 24h high-low range is larger than the current listed liquidation buffer.";
  }

  if (
    row.adverse_price_change_percent !== null &&
    row.current_liquidation_distance_percent <= 10 &&
    row.adverse_price_change_percent >= 2
  ) {
    return "The 24h public price move is adverse while the current listed buffer is tight.";
  }

  if (
    row.high_low_range_percent !== null &&
    row.high_low_range_percent >= row.current_liquidation_distance_percent / 2
  ) {
    return "The public 24h high-low range used at least half of the current listed buffer.";
  }

  return "Public 24h volatility is loaded and remains below the current listed buffer.";
}

function buildVolatilityRow(input: {
  position: market_context_position;
  history: hyperliquid_market_history | undefined;
}): receipt_volatility_buffer_row {
  const candles = input.history?.candles ?? [];
  const closePricesUsd = candles.map((candle) => candle.close_price_usd);
  const firstClosePriceUsd = closePricesUsd[0] ?? null;
  const latestClosePriceUsd = closePricesUsd.at(-1) ?? null;
  const currentLiquidationDistanceBps =
    input.position.liquidation_distance_bps.current_value;
  const currentLiquidationDistancePercent =
    currentLiquidationDistanceBps === null
      ? null
      : round(currentLiquidationDistanceBps / 100);
  const priceChangePercent = getPriceChangePercent({
    firstClosePriceUsd,
    latestClosePriceUsd,
  });
  const highLowRangePercent = getHighLowRangePercent({
    candles,
    latestClosePriceUsd,
  });
  const averageTrueRangePercent = getAverageTrueRangePercent({
    candles,
    latestClosePriceUsd,
  });
  const adversePriceChangePercent = getAdversePriceChangePercent({
    priceChangePercent,
    side: input.position.side,
  });
  const row = {
    market: input.position.market,
    status: input.position.status,
    side: input.position.side,
    severity: getRowSeverity({
      adversePriceChangePercent,
      currentLiquidationDistancePercent,
      hasHistory: candles.length > 0,
      highLowRangePercent,
      status: input.position.status,
    }),
    has_history: candles.length > 0,
    current_liquidation_distance_bps: currentLiquidationDistanceBps,
    current_liquidation_distance_percent: currentLiquidationDistancePercent,
    candle_count: candles.length,
    latest_close_price_usd: latestClosePriceUsd,
    price_change_percent: priceChangePercent,
    adverse_price_change_percent: adversePriceChangePercent,
    high_low_range_percent: highLowRangePercent,
    average_true_range_percent: averageTrueRangePercent,
    range_to_buffer_ratio: divideOrNull(
      highLowRangePercent,
      currentLiquidationDistancePercent,
    ),
    atr_buffer_multiple: divideOrNull(
      currentLiquidationDistancePercent,
      averageTrueRangePercent,
    ),
  } satisfies Omit<receipt_volatility_buffer_row, "summary" | "review_points">;

  return {
    ...row,
    summary: buildRowSummary(row),
    review_points: buildReviewPoints(row),
  };
}

function getLabel(
  rows: receipt_volatility_buffer_row[],
): receipt_volatility_buffer_label {
  const comparableRows = rows.filter((row) => row.status === "same_position");

  if (comparableRows.length === 0) {
    return "no_comparable_positions";
  }

  if (comparableRows.every((row) => !row.has_history)) {
    return "no_history";
  }

  if (
    comparableRows.every(
      (row) => row.current_liquidation_distance_percent === null,
    )
  ) {
    return "missing_buffer";
  }

  if (
    comparableRows.some(
      (row) =>
        row.high_low_range_percent !== null &&
        row.current_liquidation_distance_percent !== null &&
        row.high_low_range_percent >= row.current_liquidation_distance_percent,
    )
  ) {
    return "range_exceeds_buffer";
  }

  if (
    comparableRows.some(
      (row) =>
        row.adverse_price_change_percent !== null &&
        row.current_liquidation_distance_percent !== null &&
        row.current_liquidation_distance_percent <= 10 &&
        row.adverse_price_change_percent >= 2,
    )
  ) {
    return "adverse_trend_near_buffer";
  }

  if (
    comparableRows.some(
      (row) =>
        row.high_low_range_percent !== null &&
        row.current_liquidation_distance_percent !== null &&
        row.high_low_range_percent >= row.current_liquidation_distance_percent / 2,
    )
  ) {
    return "range_near_buffer";
  }

  return "volatility_context_loaded";
}

function getHeadline(label: receipt_volatility_buffer_label) {
  switch (label) {
    case "no_comparable_positions":
      return "No comparable live positions are available for volatility buffer context.";
    case "no_history":
      return "No 24h public candle history was returned for comparable markets.";
    case "missing_buffer":
      return "Comparable markets are missing current listed liquidation buffers.";
    case "range_exceeds_buffer":
      return "A public 24h range is larger than a current listed buffer.";
    case "range_near_buffer":
      return "A public 24h range used at least half of a current listed buffer.";
    case "adverse_trend_near_buffer":
      return "A tight listed buffer overlaps an adverse 24h price move.";
    case "volatility_context_loaded":
      return "24h volatility buffer context is loaded.";
  }
}

function getSummary(input: {
  label: receipt_volatility_buffer_label;
  focusMarket: string | null;
}) {
  const focusMarket = input.focusMarket ?? "No single market";

  switch (input.label) {
    case "no_comparable_positions":
      return "Position changes prevent a direct volatility-buffer comparison.";
    case "no_history":
      return "Use saved/current receipt context while public candle history is unavailable.";
    case "missing_buffer":
      return "Public volatility loaded, but current listed buffer coverage cannot be calculated.";
    case "range_exceeds_buffer":
    case "range_near_buffer":
    case "adverse_trend_near_buffer":
      return `${focusMarket} is the volatility-buffer row to inspect first. This is descriptive context, not a liquidation prediction.`;
    case "volatility_context_loaded":
      return "Public candle history is loaded and no volatility-buffer cue crossed the current app thresholds.";
  }
}

function getSeverityRank(severity: receipt_volatility_buffer_severity) {
  switch (severity) {
    case "high":
      return 3;
    case "watch":
      return 2;
    case "info":
      return 1;
  }
}

function getFocusRow(rows: receipt_volatility_buffer_row[]) {
  return (
    rows
      .slice()
      .sort((firstRow, secondRow) => {
        const severityDelta =
          getSeverityRank(secondRow.severity) - getSeverityRank(firstRow.severity);

        if (severityDelta !== 0) {
          return severityDelta;
        }

        return (
          (secondRow.range_to_buffer_ratio ?? -1) -
          (firstRow.range_to_buffer_ratio ?? -1)
        );
      })[0] ?? null
  );
}

export function buildReceiptVolatilityBuffer(input: {
  marketContext: market_context;
  histories: hyperliquid_market_history[];
  fetchedAtIso: string;
  windowHours: number;
  interval: string;
}): receipt_volatility_buffer {
  const historiesByMarket = getHistoriesByMarket(input.histories);
  const rows = input.marketContext.positions.map((position) =>
    buildVolatilityRow({
      position,
      history: historiesByMarket.get(position.market),
    }),
  );
  const label = getLabel(rows);
  const focusRow = getFocusRow(rows);

  return {
    label,
    headline: getHeadline(label),
    summary: getSummary({
      label,
      focusMarket: focusRow?.market ?? null,
    }),
    fetched_at_iso: input.fetchedAtIso,
    window_hours: input.windowHours,
    interval: input.interval,
    matched_market_count: rows.filter((row) => row.has_history).length,
    high_count: rows.filter((row) => row.severity === "high").length,
    watch_count: rows.filter((row) => row.severity === "watch").length,
    info_count: rows.filter((row) => row.severity === "info").length,
    focus_market: focusRow?.market ?? null,
    rows,
  };
}
