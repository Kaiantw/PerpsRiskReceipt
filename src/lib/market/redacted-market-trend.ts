import type { hyperliquid_market_history } from "../hyperliquid/adapter.ts";
import type {
  redacted_receipt_bundle,
  redacted_receipt_market,
} from "../receipts/portable-receipt-bundle.ts";

const MATERIAL_PRICE_MOVE_PERCENT = 2;
const MATERIAL_FUNDING_BPS = 1;

export type redacted_market_trend_label =
  | "no_disclosed_markets"
  | "no_history"
  | "adverse_price_trend"
  | "persistent_funding_cost"
  | "persistent_funding_credit"
  | "market_history_loaded";

export type redacted_market_trend_row = {
  market: string;
  side: redacted_receipt_market["side"];
  receipt_liquidation_distance_bps: number | null;
  receipt_funding_8h_bps_user_perspective: number;
  candle_count: number;
  funding_point_count: number;
  first_close_price_usd: number | null;
  latest_close_price_usd: number | null;
  high_price_usd: number | null;
  low_price_usd: number | null;
  price_change_percent: number | null;
  high_low_range_percent: number | null;
  latest_funding_8h_bps_user_perspective: number | null;
  average_funding_8h_bps_user_perspective: number | null;
  average_funding_delta_from_receipt_bps: number | null;
  close_prices_usd: number[];
  has_history: boolean;
  summary: string;
};

export type redacted_market_trend = {
  label: redacted_market_trend_label;
  headline: string;
  summary: string;
  fetched_at_iso: string;
  window_hours: number;
  interval: string;
  matched_market_count: number;
  rows: redacted_market_trend_row[];
};

function round(value: number, decimals = 2) {
  const multiplier = 10 ** decimals;

  return Math.round(value * multiplier) / multiplier;
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getHistoriesByMarket(histories: hyperliquid_market_history[]) {
  return new Map(histories.map((history) => [history.market, history]));
}

function getSideAdjustedFunding(
  market: redacted_receipt_market,
  fundingBps: number,
) {
  return market.side === "long" ? fundingBps : -fundingBps;
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

function getHighLowRangePercent(input: {
  highPriceUsd: number | null;
  lowPriceUsd: number | null;
  latestClosePriceUsd: number | null;
}) {
  if (
    input.highPriceUsd === null ||
    input.lowPriceUsd === null ||
    input.latestClosePriceUsd === null ||
    input.latestClosePriceUsd === 0
  ) {
    return null;
  }

  return round(
    ((input.highPriceUsd - input.lowPriceUsd) / input.latestClosePriceUsd) * 100,
  );
}

function isAdversePriceTrend(
  row: Pick<redacted_market_trend_row, "price_change_percent" | "side">,
) {
  if (row.price_change_percent === null) {
    return false;
  }

  return row.side === "long"
    ? row.price_change_percent <= -MATERIAL_PRICE_MOVE_PERCENT
    : row.price_change_percent >= MATERIAL_PRICE_MOVE_PERCENT;
}

function hasPersistentFundingCost(
  row: Pick<
    redacted_market_trend_row,
    | "average_funding_8h_bps_user_perspective"
    | "latest_funding_8h_bps_user_perspective"
  >,
) {
  return (
    row.average_funding_8h_bps_user_perspective !== null &&
    row.latest_funding_8h_bps_user_perspective !== null &&
    row.average_funding_8h_bps_user_perspective >= MATERIAL_FUNDING_BPS &&
    row.latest_funding_8h_bps_user_perspective >= MATERIAL_FUNDING_BPS
  );
}

function hasPersistentFundingCredit(
  row: Pick<
    redacted_market_trend_row,
    | "average_funding_8h_bps_user_perspective"
    | "latest_funding_8h_bps_user_perspective"
  >,
) {
  return (
    row.average_funding_8h_bps_user_perspective !== null &&
    row.latest_funding_8h_bps_user_perspective !== null &&
    row.average_funding_8h_bps_user_perspective <= -MATERIAL_FUNDING_BPS &&
    row.latest_funding_8h_bps_user_perspective <= -MATERIAL_FUNDING_BPS
  );
}

function buildRowSummary(row: Omit<redacted_market_trend_row, "summary">) {
  if (!row.has_history) {
    return "No 24h public candle or funding history was returned for this disclosed market.";
  }

  if (isAdversePriceTrend(row)) {
    return "The 24h public price move is adverse for the disclosed side, but the saved mark price and exact liquidation price remain hidden.";
  }

  if (hasPersistentFundingCost(row)) {
    return "Side-adjusted funding is a persistent cost across the public 24h window.";
  }

  if (hasPersistentFundingCredit(row)) {
    return "Side-adjusted funding is persistently favorable across the public 24h window.";
  }

  return "Public 24h price and funding history are loaded for context; hidden account fields are still required for exact receipt verification.";
}

function buildTrendRow(input: {
  market: redacted_receipt_market;
  history: hyperliquid_market_history | undefined;
}): redacted_market_trend_row {
  const candles = input.history?.candles ?? [];
  const funding = input.history?.funding ?? [];
  const closePricesUsd = candles.map((candle) => candle.close_price_usd);
  const firstClosePriceUsd = closePricesUsd[0] ?? null;
  const latestClosePriceUsd = closePricesUsd.at(-1) ?? null;
  const highPriceUsd =
    candles.length > 0
      ? Math.max(...candles.map((candle) => candle.high_price_usd))
      : null;
  const lowPriceUsd =
    candles.length > 0
      ? Math.min(...candles.map((candle) => candle.low_price_usd))
      : null;
  const sideAdjustedFunding = funding.map((fundingPoint) =>
    getSideAdjustedFunding(input.market, fundingPoint.funding_8h_bps),
  );
  const averageFunding = average(sideAdjustedFunding);
  const row = {
    market: input.market.market,
    side: input.market.side,
    receipt_liquidation_distance_bps: input.market.liquidation_distance_bps,
    receipt_funding_8h_bps_user_perspective:
      input.market.funding_8h_bps_user_perspective,
    candle_count: candles.length,
    funding_point_count: funding.length,
    first_close_price_usd: firstClosePriceUsd,
    latest_close_price_usd: latestClosePriceUsd,
    high_price_usd: highPriceUsd,
    low_price_usd: lowPriceUsd,
    price_change_percent: getPriceChangePercent({
      firstClosePriceUsd,
      latestClosePriceUsd,
    }),
    high_low_range_percent: getHighLowRangePercent({
      highPriceUsd,
      lowPriceUsd,
      latestClosePriceUsd,
    }),
    latest_funding_8h_bps_user_perspective:
      sideAdjustedFunding.at(-1) ?? null,
    average_funding_8h_bps_user_perspective:
      averageFunding === null ? null : round(averageFunding, 4),
    average_funding_delta_from_receipt_bps:
      averageFunding === null
        ? null
        : round(
            averageFunding - input.market.funding_8h_bps_user_perspective,
            4,
          ),
    close_prices_usd: closePricesUsd,
    has_history: candles.length > 0 || funding.length > 0,
  } satisfies Omit<redacted_market_trend_row, "summary">;

  return {
    ...row,
    summary: buildRowSummary(row),
  };
}

function getTrendLabel(
  rows: redacted_market_trend_row[],
): redacted_market_trend_label {
  if (rows.length === 0) {
    return "no_disclosed_markets";
  }

  if (rows.every((row) => !row.has_history)) {
    return "no_history";
  }

  if (rows.some(isAdversePriceTrend)) {
    return "adverse_price_trend";
  }

  if (rows.some(hasPersistentFundingCost)) {
    return "persistent_funding_cost";
  }

  if (rows.some(hasPersistentFundingCredit)) {
    return "persistent_funding_credit";
  }

  return "market_history_loaded";
}

function getHeadline(label: redacted_market_trend_label) {
  switch (label) {
    case "no_disclosed_markets":
      return "No disclosed markets are available for 24h market history.";
    case "no_history":
      return "Hyperliquid returned no 24h history for the disclosed markets.";
    case "adverse_price_trend":
      return "At least one disclosed side has an adverse 24h price trend.";
    case "persistent_funding_cost":
      return "Funding has been a persistent cost for at least one disclosed side.";
    case "persistent_funding_credit":
      return "Funding has been persistently favorable for at least one disclosed side.";
    case "market_history_loaded":
      return "24h public market history is loaded for the disclosed markets.";
  }
}

export function buildRedactedMarketTrend(input: {
  bundle: redacted_receipt_bundle;
  histories: hyperliquid_market_history[];
  fetchedAtIso: string;
  windowHours: number;
  interval: string;
}): redacted_market_trend {
  const historiesByMarket = getHistoriesByMarket(input.histories);
  const rows = input.bundle.markets.map((market) =>
    buildTrendRow({
      market,
      history: historiesByMarket.get(market.market),
    }),
  );
  const label = getTrendLabel(rows);

  return {
    label,
    headline: getHeadline(label),
    summary:
      "This uses public Hyperliquid candles and funding history only. It can show whether current context is part of a recent market regime, but it cannot reveal or verify hidden account fields.",
    fetched_at_iso: input.fetchedAtIso,
    window_hours: input.windowHours,
    interval: input.interval,
    matched_market_count: rows.filter((row) => row.has_history).length,
    rows,
  };
}
