import type {
  normalized_account_snapshot,
  normalized_position,
} from "../perps/types.ts";
import {
  calculateDailyFundingUsd,
  calculateThirtyDayFundingUsd,
} from "../risk/risk-engine.ts";

const BPS_PER_UNIT = 10_000;
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
  daily_funding_usd: number;
  thirty_day_funding_usd: number;
  direction: "cost" | "earn" | "neutral";
};

export type funding_carry_watch = {
  label: funding_carry_label;
  daily_net_funding_usd: number;
  thirty_day_net_funding_usd: number;
  daily_funding_bps_of_account_value: number | null;
  top_cost_position: funding_position_exposure | null;
  top_earning_position: funding_position_exposure | null;
  positions: funding_position_exposure[];
  summary: string;
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
  dailyNetFundingUsd: number;
  dailyFundingBpsOfAccountValue: number | null;
}) {
  const bpsCopy =
    input.dailyFundingBpsOfAccountValue === null
      ? "account-value burden is unavailable"
      : `${Math.abs(input.dailyFundingBpsOfAccountValue).toFixed(2)} bps/day of account value`;

  switch (input.label) {
    case "no_positions":
      return "No open positions, so there is no funding carry exposure in this snapshot.";
    case "earning":
      return `Current net funding estimate is earned funding at ${bpsCopy}. Funding can flip as rates and position state change.`;
    case "neutral":
      return "Current net funding estimate is close to flat for this snapshot.";
    case "low_cost":
      return `Current net funding estimate is a low holding cost at ${bpsCopy}.`;
    case "elevated_cost":
      return `Current net funding estimate is an elevated holding cost at ${bpsCopy}.`;
    case "heavy_cost":
      return `Current net funding estimate is a heavy holding cost at ${bpsCopy}.`;
  }
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
  const dailyNetFundingUsd = roundCurrency(snapshot.aggregate.daily_funding_usd);
  const label = getLabel({
    positions,
    dailyFundingBpsOfAccountValue,
    dailyNetFundingUsd,
  });

  return {
    label,
    daily_net_funding_usd: dailyNetFundingUsd,
    thirty_day_net_funding_usd: roundCurrency(
      snapshot.aggregate.thirty_day_funding_usd,
    ),
    daily_funding_bps_of_account_value: dailyFundingBpsOfAccountValue,
    top_cost_position: topCostPosition,
    top_earning_position: topEarningPosition,
    positions,
    summary: buildSummary({
      label,
      dailyNetFundingUsd,
      dailyFundingBpsOfAccountValue,
    }),
  };
}
