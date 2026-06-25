import type { hyperliquid_market_context } from "../hyperliquid/adapter.ts";
import type {
  redacted_receipt_bundle,
  redacted_receipt_market,
} from "../receipts/portable-receipt-bundle.ts";

const MATERIAL_FUNDING_MOVE_BPS = 1;

export type redacted_market_context_label =
  | "no_disclosed_markets"
  | "current_market_unavailable"
  | "funding_more_expensive"
  | "funding_more_favorable"
  | "current_market_loaded";

export type redacted_market_context_row = {
  market: string;
  side: redacted_receipt_market["side"];
  notional_bucket_usd: string;
  receipt_liquidation_distance_bps: number | null;
  receipt_funding_8h_bps_user_perspective: number;
  current_mark_price_usd: number | null;
  current_oracle_price_usd: number | null;
  current_funding_8h_bps_user_perspective: number | null;
  funding_delta_bps_user_perspective: number | null;
  current_open_interest_usd: number | null;
  current_day_notional_volume_usd: number | null;
  found_current_market: boolean;
  summary: string;
};

export type redacted_market_context = {
  label: redacted_market_context_label;
  headline: string;
  summary: string;
  fetched_at_iso: string;
  matched_market_count: number;
  rows: redacted_market_context_row[];
};

function round(value: number, decimals = 2) {
  const multiplier = 10 ** decimals;

  return Math.round(value * multiplier) / multiplier;
}

function getCurrentFundingForSide(
  market: redacted_receipt_market,
  currentMarket: hyperliquid_market_context | undefined,
) {
  if (!currentMarket?.found || currentMarket.funding_8h_bps === null) {
    return null;
  }

  return market.side === "long"
    ? currentMarket.funding_8h_bps
    : -currentMarket.funding_8h_bps;
}

function getFundingDelta(input: {
  market: redacted_receipt_market;
  currentMarket: hyperliquid_market_context | undefined;
}) {
  const currentFunding = getCurrentFundingForSide(
    input.market,
    input.currentMarket,
  );

  if (currentFunding === null) {
    return null;
  }

  return round(
    currentFunding - input.market.funding_8h_bps_user_perspective,
    4,
  );
}

function buildRowSummary(row: Omit<redacted_market_context_row, "summary">) {
  if (!row.found_current_market) {
    return "No current Hyperliquid market context was found for this disclosed market.";
  }

  if (row.funding_delta_bps_user_perspective === null) {
    return "Current mark and participation context are available, but funding comparison is unavailable.";
  }

  if (row.funding_delta_bps_user_perspective > MATERIAL_FUNDING_MOVE_BPS) {
    return "Current funding is more expensive for the disclosed side than it was in the redacted receipt.";
  }

  if (row.funding_delta_bps_user_perspective < -MATERIAL_FUNDING_MOVE_BPS) {
    return "Current funding is more favorable for the disclosed side than it was in the redacted receipt.";
  }

  return "Current funding is close to the redacted receipt while saved mark and exact size remain hidden.";
}

function getCurrentMarketsByName(currentMarkets: hyperliquid_market_context[]) {
  return new Map(
    currentMarkets.map((currentMarket) => [currentMarket.market, currentMarket]),
  );
}

function buildContextRow(input: {
  market: redacted_receipt_market;
  currentMarket: hyperliquid_market_context | undefined;
}): redacted_market_context_row {
  const fundingDelta = getFundingDelta(input);
  const row = {
    market: input.market.market,
    side: input.market.side,
    notional_bucket_usd: input.market.notional_bucket_usd,
    receipt_liquidation_distance_bps: input.market.liquidation_distance_bps,
    receipt_funding_8h_bps_user_perspective:
      input.market.funding_8h_bps_user_perspective,
    current_mark_price_usd: input.currentMarket?.mark_price_usd ?? null,
    current_oracle_price_usd: input.currentMarket?.oracle_price_usd ?? null,
    current_funding_8h_bps_user_perspective: getCurrentFundingForSide(
      input.market,
      input.currentMarket,
    ),
    funding_delta_bps_user_perspective: fundingDelta,
    current_open_interest_usd: input.currentMarket?.open_interest_usd ?? null,
    current_day_notional_volume_usd:
      input.currentMarket?.day_notional_volume_usd ?? null,
    found_current_market: input.currentMarket?.found ?? false,
  } satisfies Omit<redacted_market_context_row, "summary">;

  return {
    ...row,
    summary: buildRowSummary(row),
  };
}

function getContextLabel(
  rows: redacted_market_context_row[],
): redacted_market_context_label {
  if (rows.length === 0) {
    return "no_disclosed_markets";
  }

  if (rows.every((row) => !row.found_current_market)) {
    return "current_market_unavailable";
  }

  if (
    rows.some(
      (row) =>
        row.funding_delta_bps_user_perspective !== null &&
        row.funding_delta_bps_user_perspective > MATERIAL_FUNDING_MOVE_BPS,
    )
  ) {
    return "funding_more_expensive";
  }

  if (
    rows.some(
      (row) =>
        row.funding_delta_bps_user_perspective !== null &&
        row.funding_delta_bps_user_perspective < -MATERIAL_FUNDING_MOVE_BPS,
    )
  ) {
    return "funding_more_favorable";
  }

  return "current_market_loaded";
}

function getHeadline(label: redacted_market_context_label) {
  switch (label) {
    case "no_disclosed_markets":
      return "No disclosed markets are available for current market context.";
    case "current_market_unavailable":
      return "Current Hyperliquid market context was not found for the disclosed markets.";
    case "funding_more_expensive":
      return "Current funding is more expensive for at least one disclosed side.";
    case "funding_more_favorable":
      return "Current funding is more favorable for at least one disclosed side.";
    case "current_market_loaded":
      return "Current public market context is loaded for the disclosed markets.";
  }
}

export function buildRedactedMarketContext(input: {
  bundle: redacted_receipt_bundle;
  currentMarkets: hyperliquid_market_context[];
  fetchedAtIso: string;
}): redacted_market_context {
  const currentMarketsByName = getCurrentMarketsByName(input.currentMarkets);
  const rows = input.bundle.markets.map((market) =>
    buildContextRow({
      market,
      currentMarket: currentMarketsByName.get(market.market),
    }),
  );
  const label = getContextLabel(rows);

  return {
    label,
    headline: getHeadline(label),
    summary:
      "This uses public Hyperliquid market data only. The redacted bundle does not reveal saved mark prices, exact sizes, raw account, PnL, or exact funding dollars.",
    fetched_at_iso: input.fetchedAtIso,
    matched_market_count: rows.filter((row) => row.found_current_market).length,
    rows,
  };
}
