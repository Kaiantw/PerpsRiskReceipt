import type {
  normalized_account_snapshot,
  normalized_position,
} from "../perps/types.ts";
import {
  calculateDailyFundingUsd,
  calculateThirtyDayFundingUsd,
} from "../risk/risk-engine.ts";

const BPS_PER_UNIT = 10_000;
const HOURS_PER_DAY = 24;
const HOURS_PER_FUNDING_RATE = 8;
const LOW_COST_BPS_PER_DAY = 5;
const HEAVY_COST_BPS_PER_DAY = 25;

export type funding_carry_label =
  | "no_positions"
  | "earning"
  | "neutral"
  | "low_cost"
  | "elevated_cost"
  | "heavy_cost";

export type funding_position_exposure = {
  market: string;
  side: normalized_position["side"];
  notional_usd: number;
  funding_8h_bps_user_perspective: number;
  next_hour_funding_usd: number;
  eight_hour_rate_funding_usd: number;
  daily_funding_usd: number;
  thirty_day_funding_usd: number;
  direction: "cost" | "earn" | "neutral";
};

export type funding_carry_watch = {
  label: funding_carry_label;
  next_hour_net_funding_usd: number;
  eight_hour_rate_net_funding_usd: number;
  daily_net_funding_usd: number;
  thirty_day_net_funding_usd: number;
  next_hour_funding_bps_of_account_value: number | null;
  daily_funding_bps_of_account_value: number | null;
  top_cost_position: funding_position_exposure | null;
  top_earning_position: funding_position_exposure | null;
  positions: funding_position_exposure[];
  summary: string;
  review_points: string[];
};

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function roundBps(value: number) {
  return Math.round(value * 100) / 100;
}

function getDirection(dailyFundingUsd: number) {
  if (dailyFundingUsd > 0) {
    return "cost" as const;
  }

  if (dailyFundingUsd < 0) {
    return "earn" as const;
  }

  return "neutral" as const;
}

function getDailyFundingBpsOfAccountValue(
  snapshot: normalized_account_snapshot,
) {
  if (snapshot.account_value_usd <= 0) {
    return null;
  }

  return roundBps(
    (snapshot.aggregate.daily_funding_usd / snapshot.account_value_usd) *
      BPS_PER_UNIT,
  );
}

function calculateNextHourFundingUsd(dailyFundingUsd: number) {
  return roundCurrency(dailyFundingUsd / HOURS_PER_DAY);
}

function calculateEightHourRateFundingUsd(dailyFundingUsd: number) {
  return roundCurrency(dailyFundingUsd / (HOURS_PER_DAY / HOURS_PER_FUNDING_RATE));
}

function getNextHourFundingBpsOfAccountValue(
  dailyFundingBpsOfAccountValue: number | null,
) {
  if (dailyFundingBpsOfAccountValue === null) {
    return null;
  }

  return roundBps(dailyFundingBpsOfAccountValue / HOURS_PER_DAY);
}

function getLabel(input: {
  positions: funding_position_exposure[];
  dailyFundingBpsOfAccountValue: number | null;
  dailyNetFundingUsd: number;
}): funding_carry_label {
  if (input.positions.length === 0) {
    return "no_positions";
  }

  if (Math.abs(input.dailyNetFundingUsd) < 0.01) {
    return "neutral";
  }

  if (input.dailyNetFundingUsd < 0) {
    return "earning";
  }

  const bps = input.dailyFundingBpsOfAccountValue;

  if (bps === null || bps >= HEAVY_COST_BPS_PER_DAY) {
    return "heavy_cost";
  }

  if (bps >= LOW_COST_BPS_PER_DAY) {
    return "elevated_cost";
  }

  return "low_cost";
}

function buildSummary(input: {
  label: funding_carry_label;
  nextHourFundingBpsOfAccountValue: number | null;
}) {
  const bpsCopy =
    input.nextHourFundingBpsOfAccountValue === null
      ? "account-value burden is unavailable"
      : `${Math.abs(input.nextHourFundingBpsOfAccountValue).toFixed(2)} bps/hour of account value`;

  switch (input.label) {
    case "no_positions":
      return "No open positions, so there is no funding carry exposure in this snapshot.";
    case "earning":
      return `Next funding estimate is earned funding at ${bpsCopy}. Funding can flip as rates and position state change.`;
    case "neutral":
      return "Next funding estimate is close to flat for this snapshot.";
    case "low_cost":
      return `Next funding estimate is a low holding cost at ${bpsCopy}.`;
    case "elevated_cost":
      return `Next funding estimate is an elevated holding cost at ${bpsCopy}.`;
    case "heavy_cost":
      return `Next funding estimate is a heavy holding cost at ${bpsCopy}.`;
  }
}

function formatSignedCurrency(value: number) {
  if (value === 0) {
    return "$0.00";
  }

  return `${value > 0 ? "+" : "-"}$${Math.abs(value).toFixed(2)}`;
}

function buildReviewPoints(input: {
  topCostPosition: funding_position_exposure | null;
  topEarningPosition: funding_position_exposure | null;
  positions: funding_position_exposure[];
}) {
  if (input.positions.length === 0) {
    return [
      "No open positions means there is no next funding payment estimate for this snapshot.",
    ];
  }

  const points = [
    "Next-hour funding divides the normalized 8-hour user-perspective funding rate by 8.",
    "Actual Hyperliquid settlement uses oracle-price notional; this app estimates from normalized mark-price notional.",
  ];

  if (input.topCostPosition) {
    points.push(
      `${input.topCostPosition.market} is the largest estimated next funding cost at ${formatSignedCurrency(input.topCostPosition.next_hour_funding_usd)}.`,
    );
  }

  if (input.topEarningPosition) {
    points.push(
      `${input.topEarningPosition.market} is the largest estimated next funding earn at ${formatSignedCurrency(input.topEarningPosition.next_hour_funding_usd)}.`,
    );
  }

  return points;
}

export function calculateFundingCarryWatch(
  snapshot: normalized_account_snapshot,
): funding_carry_watch {
  const positions = snapshot.positions.map((position) => {
    const dailyFundingUsd = calculateDailyFundingUsd(position);

    return {
      market: position.market,
      side: position.side,
      notional_usd: position.notional_usd,
      funding_8h_bps_user_perspective:
        position.funding_8h_bps_user_perspective,
      next_hour_funding_usd: calculateNextHourFundingUsd(dailyFundingUsd),
      eight_hour_rate_funding_usd:
        calculateEightHourRateFundingUsd(dailyFundingUsd),
      daily_funding_usd: dailyFundingUsd,
      thirty_day_funding_usd: calculateThirtyDayFundingUsd(dailyFundingUsd),
      direction: getDirection(dailyFundingUsd),
    };
  });
  const topCostPosition =
    positions
      .filter((position) => position.daily_funding_usd > 0)
      .sort(
        (leftPosition, rightPosition) =>
          rightPosition.daily_funding_usd - leftPosition.daily_funding_usd,
      )[0] ?? null;
  const topEarningPosition =
    positions
      .filter((position) => position.daily_funding_usd < 0)
      .sort(
        (leftPosition, rightPosition) =>
          leftPosition.daily_funding_usd - rightPosition.daily_funding_usd,
      )[0] ?? null;
  const dailyFundingBpsOfAccountValue =
    getDailyFundingBpsOfAccountValue(snapshot);
  const nextHourFundingBpsOfAccountValue =
    getNextHourFundingBpsOfAccountValue(dailyFundingBpsOfAccountValue);
  const dailyNetFundingUsd = roundCurrency(snapshot.aggregate.daily_funding_usd);
  const label = getLabel({
    positions,
    dailyFundingBpsOfAccountValue,
    dailyNetFundingUsd,
  });

  return {
    label,
    next_hour_net_funding_usd:
      calculateNextHourFundingUsd(dailyNetFundingUsd),
    eight_hour_rate_net_funding_usd:
      calculateEightHourRateFundingUsd(dailyNetFundingUsd),
    daily_net_funding_usd: dailyNetFundingUsd,
    thirty_day_net_funding_usd: roundCurrency(
      snapshot.aggregate.thirty_day_funding_usd,
    ),
    next_hour_funding_bps_of_account_value:
      nextHourFundingBpsOfAccountValue,
    daily_funding_bps_of_account_value: dailyFundingBpsOfAccountValue,
    top_cost_position: topCostPosition,
    top_earning_position: topEarningPosition,
    positions,
    summary: buildSummary({
      label,
      nextHourFundingBpsOfAccountValue,
    }),
    review_points: buildReviewPoints({
      topCostPosition,
      topEarningPosition,
      positions,
    }),
  };
}
