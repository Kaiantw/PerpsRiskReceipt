import type { hyperliquid_market_history } from "../hyperliquid/adapter.ts";
import type {
  normalized_account_snapshot,
  normalized_position,
} from "../perps/types.ts";

const BPS_PER_UNIT = 10_000;
const EIGHT_HOUR_WINDOWS_PER_DAY = 3;
const MATERIAL_FUNDING_BPS = 1;
const NEUTRAL_AVERAGE_FUNDING_BPS = 0.25;
const PERSISTENT_POINT_SHARE = 0.67;

export type funding_persistence_position_label =
  | "no_history"
  | "persistent_cost"
  | "recent_cost"
  | "persistent_credit"
  | "mixed"
  | "neutral";

export type funding_persistence_label =
  | "no_positions"
  | "no_history"
  | funding_persistence_position_label;

export type funding_persistence_position = {
  market: string;
  side: normalized_position["side"];
  notional_usd: number;
  current_funding_8h_bps_user_perspective: number;
  funding_point_count: number;
  cost_point_count: number;
  credit_point_count: number;
  cost_persistence_percent: number | null;
  credit_persistence_percent: number | null;
  latest_funding_8h_bps_user_perspective: number | null;
  average_funding_8h_bps_user_perspective: number | null;
  latest_delta_from_current_bps: number | null;
  average_delta_from_current_bps: number | null;
  estimated_average_daily_funding_usd: number | null;
  label: funding_persistence_position_label;
  summary: string;
};

export type funding_persistence_read = {
  label: funding_persistence_label;
  headline: string;
  summary: string;
  fetched_at_iso: string;
  window_hours: number;
  interval: string;
  matched_market_count: number;
  focus_market: string | null;
  focus_position: funding_persistence_position | null;
  positions: funding_persistence_position[];
  review_points: string[];
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

function getSideAdjustedFundingBps(input: {
  position: normalized_position;
  fundingBps: number;
}) {
  return input.position.side === "long"
    ? input.fundingBps
    : -input.fundingBps;
}

function getFundingPersistencePercent(input: {
  pointCount: number;
  matchingPointCount: number;
}) {
  if (input.pointCount === 0) {
    return null;
  }

  return round((input.matchingPointCount / input.pointCount) * 100);
}

function getEstimatedAverageDailyFundingUsd(input: {
  averageFundingBps: number | null;
  position: normalized_position;
}) {
  if (input.averageFundingBps === null) {
    return null;
  }

  return round(
    input.position.notional_usd *
      (input.averageFundingBps / BPS_PER_UNIT) *
      EIGHT_HOUR_WINDOWS_PER_DAY,
  );
}

function getPositionLabel(input: {
  averageFundingBps: number | null;
  costPersistencePercent: number | null;
  creditPersistencePercent: number | null;
  fundingPointCount: number;
  latestFundingBps: number | null;
}): funding_persistence_position_label {
  if (input.fundingPointCount === 0) {
    return "no_history";
  }

  if (
    input.averageFundingBps !== null &&
    input.latestFundingBps !== null &&
    input.averageFundingBps >= MATERIAL_FUNDING_BPS &&
    input.latestFundingBps >= MATERIAL_FUNDING_BPS &&
    (input.costPersistencePercent ?? 0) >= PERSISTENT_POINT_SHARE * 100
  ) {
    return "persistent_cost";
  }

  if (
    input.latestFundingBps !== null &&
    input.latestFundingBps >= MATERIAL_FUNDING_BPS
  ) {
    return "recent_cost";
  }

  if (
    input.averageFundingBps !== null &&
    input.latestFundingBps !== null &&
    input.averageFundingBps <= -MATERIAL_FUNDING_BPS &&
    input.latestFundingBps <= -MATERIAL_FUNDING_BPS &&
    (input.creditPersistencePercent ?? 0) >= PERSISTENT_POINT_SHARE * 100
  ) {
    return "persistent_credit";
  }

  if (
    input.averageFundingBps !== null &&
    Math.abs(input.averageFundingBps) <= NEUTRAL_AVERAGE_FUNDING_BPS
  ) {
    return "neutral";
  }

  return "mixed";
}

function buildPositionSummary(input: {
  label: funding_persistence_position_label;
  position: Pick<
    funding_persistence_position,
    | "average_funding_8h_bps_user_perspective"
    | "cost_point_count"
    | "credit_point_count"
    | "estimated_average_daily_funding_usd"
    | "funding_point_count"
    | "market"
  >;
}) {
  if (input.label === "no_history") {
    return `${input.position.market} has no public funding-history points in the loaded window.`;
  }

  const pointCopy = `${input.position.cost_point_count}/${input.position.funding_point_count} cost points and ${input.position.credit_point_count}/${input.position.funding_point_count} credit points`;
  const averageCopy =
    input.position.average_funding_8h_bps_user_perspective === null
      ? "average funding unavailable"
      : `${input.position.average_funding_8h_bps_user_perspective.toFixed(2)} bps average 8h funding`;
  const dailyCopy =
    input.position.estimated_average_daily_funding_usd === null
      ? "average daily estimate unavailable"
      : `$${Math.abs(input.position.estimated_average_daily_funding_usd).toFixed(
          2,
        )}/day average ${
          input.position.estimated_average_daily_funding_usd >= 0
            ? "cost"
            : "credit"
        }`;

  if (input.label === "persistent_cost") {
    return `${input.position.market} shows persistent recent funding cost: ${pointCopy}, ${averageCopy}, ${dailyCopy}.`;
  }

  if (input.label === "recent_cost") {
    return `${input.position.market} has a recent funding cost, but the loaded window is not consistently costly: ${pointCopy}, ${averageCopy}.`;
  }

  if (input.label === "persistent_credit") {
    return `${input.position.market} shows persistent recent funding credit: ${pointCopy}, ${averageCopy}, ${dailyCopy}.`;
  }

  if (input.label === "neutral") {
    return `${input.position.market} funding was near flat across the loaded window: ${pointCopy}, ${averageCopy}.`;
  }

  return `${input.position.market} funding was mixed across the loaded window: ${pointCopy}, ${averageCopy}.`;
}

function buildPosition(input: {
  history: hyperliquid_market_history | undefined;
  position: normalized_position;
}): funding_persistence_position {
  const sideAdjustedFunding = (input.history?.funding ?? []).map((point) =>
    getSideAdjustedFundingBps({
      position: input.position,
      fundingBps: point.funding_8h_bps,
    }),
  );
  const averageFunding = average(sideAdjustedFunding);
  const latestFunding = sideAdjustedFunding.at(-1) ?? null;
  const costPointCount = sideAdjustedFunding.filter((value) => value > 0).length;
  const creditPointCount = sideAdjustedFunding.filter((value) => value < 0).length;
  const costPersistencePercent = getFundingPersistencePercent({
    pointCount: sideAdjustedFunding.length,
    matchingPointCount: costPointCount,
  });
  const creditPersistencePercent = getFundingPersistencePercent({
    pointCount: sideAdjustedFunding.length,
    matchingPointCount: creditPointCount,
  });
  const averageFundingBps = averageFunding === null ? null : round(averageFunding, 4);
  const latestFundingBps = latestFunding === null ? null : round(latestFunding, 4);
  const label = getPositionLabel({
    averageFundingBps,
    costPersistencePercent,
    creditPersistencePercent,
    fundingPointCount: sideAdjustedFunding.length,
    latestFundingBps,
  });
  const positionWithoutSummary = {
    market: input.position.market,
    side: input.position.side,
    notional_usd: input.position.notional_usd,
    current_funding_8h_bps_user_perspective:
      input.position.funding_8h_bps_user_perspective,
    funding_point_count: sideAdjustedFunding.length,
    cost_point_count: costPointCount,
    credit_point_count: creditPointCount,
    cost_persistence_percent: costPersistencePercent,
    credit_persistence_percent: creditPersistencePercent,
    latest_funding_8h_bps_user_perspective: latestFundingBps,
    average_funding_8h_bps_user_perspective: averageFundingBps,
    latest_delta_from_current_bps:
      latestFundingBps === null
        ? null
        : round(
            latestFundingBps -
              input.position.funding_8h_bps_user_perspective,
            4,
          ),
    average_delta_from_current_bps:
      averageFundingBps === null
        ? null
        : round(
            averageFundingBps -
              input.position.funding_8h_bps_user_perspective,
            4,
          ),
    estimated_average_daily_funding_usd:
      getEstimatedAverageDailyFundingUsd({
        averageFundingBps,
        position: input.position,
      }),
    label,
  } satisfies Omit<funding_persistence_position, "summary">;

  return {
    ...positionWithoutSummary,
    summary: buildPositionSummary({
      label,
      position: positionWithoutSummary,
    }),
  };
}

function getReadLabel(
  positions: funding_persistence_position[],
): funding_persistence_label {
  if (positions.length === 0) {
    return "no_positions";
  }

  if (positions.every((position) => position.label === "no_history")) {
    return "no_history";
  }

  if (positions.some((position) => position.label === "persistent_cost")) {
    return "persistent_cost";
  }

  if (positions.some((position) => position.label === "recent_cost")) {
    return "recent_cost";
  }

  if (positions.some((position) => position.label === "persistent_credit")) {
    return "persistent_credit";
  }

  if (positions.every((position) => position.label === "neutral")) {
    return "neutral";
  }

  return "mixed";
}

function getFocusPosition(positions: funding_persistence_position[]) {
  const positionsWithHistory = positions.filter(
    (position) => position.label !== "no_history",
  );

  if (positionsWithHistory.length === 0) {
    return null;
  }

  return [...positionsWithHistory].sort((left, right) => {
    const rightCost = right.estimated_average_daily_funding_usd ?? 0;
    const leftCost = left.estimated_average_daily_funding_usd ?? 0;

    if (rightCost > 0 || leftCost > 0) {
      return rightCost - leftCost;
    }

    return Math.abs(rightCost) - Math.abs(leftCost);
  })[0] ?? null;
}

function buildHeadline(input: {
  focusPosition: funding_persistence_position | null;
  label: funding_persistence_label;
}) {
  const market = input.focusPosition?.market ?? "Loaded markets";

  switch (input.label) {
    case "no_positions":
      return "No open positions to compare with recent funding history.";
    case "no_history":
      return "No public funding history was returned for the open positions.";
    case "persistent_cost":
      return `${market} has persistent recent funding cost.`;
    case "recent_cost":
      return `${market} has a recent funding cost to review.`;
    case "persistent_credit":
      return `${market} has persistent recent funding credit.`;
    case "neutral":
      return "Loaded funding history is near flat for the open positions.";
    case "mixed":
      return "Loaded funding history is mixed across the open positions.";
  }
}

function buildSummary(input: {
  label: funding_persistence_label;
  matchedMarketCount: number;
  positionCount: number;
  windowHours: number;
}) {
  if (input.label === "no_positions") {
    return "The snapshot has no open positions, so funding persistence is not applicable.";
  }

  if (input.label === "no_history") {
    return `The ${input.windowHours}h read loaded no funding-history points for the current markets.`;
  }

  return `${input.matchedMarketCount}/${input.positionCount} open markets have public funding-history points in the ${input.windowHours}h read. Positive side-adjusted funding means cost to the current side; negative means credit.`;
}

function buildReviewPoints(input: {
  focusPosition: funding_persistence_position | null;
  label: funding_persistence_label;
}) {
  const points = [
    "Funding persistence is descriptive current-market context, not a trade recommendation.",
    "The read uses public Hyperliquid fundingHistory points; it does not use private userFunding ledger transfers.",
    "Daily estimates assume current notional and side stay unchanged and use normalized mark-price notional rather than exact oracle-price settlement.",
  ];

  if (input.focusPosition) {
    points.unshift(input.focusPosition.summary);
  }

  if (input.label === "no_history") {
    points.unshift(
      "No loaded funding-history points were available, so only current funding rates remain visible.",
    );
  }

  return points;
}

export function buildFundingPersistenceRead(input: {
  fetchedAtIso: string;
  histories: hyperliquid_market_history[];
  interval: string;
  snapshot: normalized_account_snapshot;
  windowHours: number;
}): funding_persistence_read {
  const historiesByMarket = getHistoriesByMarket(input.histories);
  const positions = input.snapshot.positions.map((position) =>
    buildPosition({
      history: historiesByMarket.get(position.market),
      position,
    }),
  );
  const label = getReadLabel(positions);
  const focusPosition = getFocusPosition(positions);
  const matchedMarketCount = positions.filter(
    (position) => position.funding_point_count > 0,
  ).length;

  return {
    label,
    headline: buildHeadline({ focusPosition, label }),
    summary: buildSummary({
      label,
      matchedMarketCount,
      positionCount: positions.length,
      windowHours: input.windowHours,
    }),
    fetched_at_iso: input.fetchedAtIso,
    window_hours: input.windowHours,
    interval: input.interval,
    matched_market_count: matchedMarketCount,
    focus_market: focusPosition?.market ?? null,
    focus_position: focusPosition,
    positions,
    review_points: buildReviewPoints({ focusPosition, label }),
  };
}
