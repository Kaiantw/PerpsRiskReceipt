import type {
  normalized_account_snapshot,
  normalized_position,
  risk_label,
} from "../perps/types.ts";
import {
  calculateDailyFundingUsd,
  calculateLiquidationDistanceBps,
  getRiskLabel,
} from "./risk-engine.ts";

const BPS_PER_UNIT = 10_000;
const THIN_LIQUIDATION_DISTANCE_BPS = 500;
const TIGHT_LIQUIDATION_DISTANCE_BPS = 1_000;
const MODERATE_LIQUIDATION_DISTANCE_BPS = 2_500;
const WIDE_LIQUIDATION_DISTANCE_BPS = 5_000;
const MAX_NOTIONAL_SCORE = 25;
const MAX_FUNDING_SCORE = 20;
const MAX_UNREALIZED_LOSS_SCORE = 10;

export type position_risk_driver_category =
  | "liquidation_buffer"
  | "missing_liquidation"
  | "notional_concentration"
  | "funding_cost"
  | "unrealized_loss";

export type directional_bias =
  | "no_positions"
  | "balanced"
  | "net_long"
  | "net_short";

export type position_risk_driver = {
  market: string;
  side: normalized_position["side"];
  notional_usd: number;
  notional_share_bps: number | null;
  notional_to_account_value_bps: number | null;
  liquidation_distance_bps: number | null;
  daily_funding_usd: number;
  daily_funding_bps_of_account_value: number | null;
  unrealized_pnl_usd: number;
  unrealized_loss_bps_of_account_value: number | null;
  liquidation_score: number;
  notional_score: number;
  funding_score: number;
  unrealized_loss_score: number;
  driver_score: number;
  driver_label: risk_label;
  primary_driver: position_risk_driver_category;
  summary: string;
};

export type position_risk_drivers = {
  label: risk_label | "no_positions";
  headline: string;
  summary: string;
  gross_notional_to_account_value_bps: number | null;
  largest_notional_share_bps: number | null;
  directional_bias: directional_bias;
  total_long_notional_usd: number;
  total_short_notional_usd: number;
  net_directional_notional_usd: number;
  top_driver_position: position_risk_driver | null;
  top_notional_position: position_risk_driver | null;
  top_liquidation_position: position_risk_driver | null;
  top_funding_cost_position: position_risk_driver | null;
  top_unrealized_loss_position: position_risk_driver | null;
  positions: position_risk_driver[];
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function roundBps(value: number) {
  return Math.round(value * 100) / 100;
}

function roundScore(value: number) {
  return Math.round(clamp(value, 0, 100));
}

function getBpsOfAccountValue(input: {
  accountValueUsd: number;
  valueUsd: number;
}) {
  if (input.accountValueUsd <= 0) {
    return null;
  }

  return roundBps((input.valueUsd / input.accountValueUsd) * BPS_PER_UNIT);
}

function getLiquidationScore(liquidationDistanceBps: number | null) {
  if (liquidationDistanceBps === null) {
    return 8;
  }

  if (liquidationDistanceBps <= 0) {
    return 45;
  }

  if (liquidationDistanceBps <= THIN_LIQUIDATION_DISTANCE_BPS) {
    return 42;
  }

  if (liquidationDistanceBps <= TIGHT_LIQUIDATION_DISTANCE_BPS) {
    return 34;
  }

  if (liquidationDistanceBps <= MODERATE_LIQUIDATION_DISTANCE_BPS) {
    return 20;
  }

  if (liquidationDistanceBps <= WIDE_LIQUIDATION_DISTANCE_BPS) {
    return 8;
  }

  return 0;
}

function getNotionalScore(input: {
  notionalShareBps: number | null;
  notionalToAccountValueBps: number | null;
}) {
  const concentrationScore =
    input.notionalShareBps === null ? 0 : input.notionalShareBps / 300;
  const accountPressureScore =
    input.notionalToAccountValueBps === null
      ? 25
      : input.notionalToAccountValueBps / 600;

  return roundScore(
    clamp(
      Math.max(concentrationScore, accountPressureScore, 0),
      0,
      MAX_NOTIONAL_SCORE,
    ),
  );
}

function getFundingScore(dailyFundingBpsOfAccountValue: number | null) {
  if (dailyFundingBpsOfAccountValue === null) {
    return 0;
  }

  return roundScore(
    clamp(
      Math.max(dailyFundingBpsOfAccountValue, 0) / 2,
      0,
      MAX_FUNDING_SCORE,
    ),
  );
}

function getUnrealizedLossScore(
  unrealizedLossBpsOfAccountValue: number | null,
) {
  if (unrealizedLossBpsOfAccountValue === null) {
    return 0;
  }

  return roundScore(
    clamp(unrealizedLossBpsOfAccountValue / 100, 0, MAX_UNREALIZED_LOSS_SCORE),
  );
}

function getPrimaryDriver(input: {
  liquidationDistanceBps: number | null;
  liquidationScore: number;
  notionalScore: number;
  fundingScore: number;
  unrealizedLossScore: number;
}): position_risk_driver_category {
  const components = [
    {
      category:
        input.liquidationDistanceBps === null
          ? ("missing_liquidation" as const)
          : ("liquidation_buffer" as const),
      score: input.liquidationScore,
    },
    {
      category: "notional_concentration" as const,
      score: input.notionalScore,
    },
    {
      category: "funding_cost" as const,
      score: input.fundingScore,
    },
    {
      category: "unrealized_loss" as const,
      score: input.unrealizedLossScore,
    },
  ];

  return components.sort((leftComponent, rightComponent) => {
    if (rightComponent.score !== leftComponent.score) {
      return rightComponent.score - leftComponent.score;
    }

    return getPrimaryDriverTieBreak(rightComponent.category) -
      getPrimaryDriverTieBreak(leftComponent.category);
  })[0].category;
}

function getPrimaryDriverTieBreak(category: position_risk_driver_category) {
  switch (category) {
    case "liquidation_buffer":
      return 5;
    case "missing_liquidation":
      return 4;
    case "notional_concentration":
      return 3;
    case "funding_cost":
      return 2;
    case "unrealized_loss":
      return 1;
  }
}

function getPositionSummary(input: {
  market: string;
  primaryDriver: position_risk_driver_category;
  notionalShareBps: number | null;
  notionalToAccountValueBps: number | null;
  liquidationDistanceBps: number | null;
  dailyFundingBpsOfAccountValue: number | null;
  unrealizedLossBpsOfAccountValue: number | null;
}) {
  switch (input.primaryDriver) {
    case "liquidation_buffer":
      return `${input.market} is driven most by listed liquidation distance at ${formatBpsAsPercent(
        input.liquidationDistanceBps,
      )}.`;
    case "missing_liquidation":
      return `${input.market} has no listed liquidation price, so the buffer contribution is unavailable.`;
    case "notional_concentration":
      return `${input.market} is driven most by notional exposure: ${formatBpsAsPercent(
        input.notionalShareBps,
      )} of gross notional and ${formatBpsAsMultiple(
        input.notionalToAccountValueBps,
      )} account value.`;
    case "funding_cost":
      return `${input.market} is driven most by positive funding burden at ${formatBpsAsPercent(
        input.dailyFundingBpsOfAccountValue,
      )} of account value per day.`;
    case "unrealized_loss":
      return `${input.market} is driven most by unrealized loss at ${formatBpsAsPercent(
        input.unrealizedLossBpsOfAccountValue,
      )} of account value.`;
  }
}

function buildPositionDriver(input: {
  position: normalized_position;
  accountValueUsd: number;
  totalNotionalUsd: number;
}): position_risk_driver {
  const dailyFundingUsd = calculateDailyFundingUsd(input.position);
  const liquidationDistanceBps = calculateLiquidationDistanceBps(input.position);
  const notionalShareBps =
    input.totalNotionalUsd <= 0
      ? null
      : roundBps((input.position.notional_usd / input.totalNotionalUsd) *
          BPS_PER_UNIT);
  const notionalToAccountValueBps = getBpsOfAccountValue({
    accountValueUsd: input.accountValueUsd,
    valueUsd: input.position.notional_usd,
  });
  const dailyFundingBpsOfAccountValue = getBpsOfAccountValue({
    accountValueUsd: input.accountValueUsd,
    valueUsd: dailyFundingUsd,
  });
  const unrealizedLossBpsOfAccountValue =
    input.position.unrealized_pnl_usd >= 0
      ? 0
      : getBpsOfAccountValue({
          accountValueUsd: input.accountValueUsd,
          valueUsd: Math.abs(input.position.unrealized_pnl_usd),
        });
  const liquidationScore = getLiquidationScore(liquidationDistanceBps);
  const notionalScore = getNotionalScore({
    notionalShareBps,
    notionalToAccountValueBps,
  });
  const fundingScore = getFundingScore(dailyFundingBpsOfAccountValue);
  const unrealizedLossScore = getUnrealizedLossScore(
    unrealizedLossBpsOfAccountValue,
  );
  const driverScore = roundScore(
    liquidationScore + notionalScore + fundingScore + unrealizedLossScore,
  );
  const primaryDriver = getPrimaryDriver({
    liquidationDistanceBps,
    liquidationScore,
    notionalScore,
    fundingScore,
    unrealizedLossScore,
  });

  return {
    market: input.position.market,
    side: input.position.side,
    notional_usd: input.position.notional_usd,
    notional_share_bps: notionalShareBps,
    notional_to_account_value_bps: notionalToAccountValueBps,
    liquidation_distance_bps: liquidationDistanceBps,
    daily_funding_usd: dailyFundingUsd,
    daily_funding_bps_of_account_value: dailyFundingBpsOfAccountValue,
    unrealized_pnl_usd: input.position.unrealized_pnl_usd,
    unrealized_loss_bps_of_account_value: unrealizedLossBpsOfAccountValue,
    liquidation_score: liquidationScore,
    notional_score: notionalScore,
    funding_score: fundingScore,
    unrealized_loss_score: unrealizedLossScore,
    driver_score: driverScore,
    driver_label: getRiskLabel(driverScore),
    primary_driver: primaryDriver,
    summary: getPositionSummary({
      market: input.position.market,
      primaryDriver,
      notionalShareBps,
      notionalToAccountValueBps,
      liquidationDistanceBps,
      dailyFundingBpsOfAccountValue,
      unrealizedLossBpsOfAccountValue,
    }),
  };
}

function sortDriversByScore(drivers: position_risk_driver[]) {
  return drivers.slice().sort((leftDriver, rightDriver) => {
    if (rightDriver.driver_score !== leftDriver.driver_score) {
      return rightDriver.driver_score - leftDriver.driver_score;
    }

    if (rightDriver.notional_usd !== leftDriver.notional_usd) {
      return rightDriver.notional_usd - leftDriver.notional_usd;
    }

    return leftDriver.market.localeCompare(rightDriver.market);
  });
}

function getDirectionalBias(input: {
  totalNotionalUsd: number;
  netDirectionalNotionalUsd: number;
}): directional_bias {
  if (input.totalNotionalUsd <= 0) {
    return "no_positions";
  }

  const netShare = Math.abs(input.netDirectionalNotionalUsd) /
    input.totalNotionalUsd;

  if (netShare < 0.1) {
    return "balanced";
  }

  return input.netDirectionalNotionalUsd > 0 ? "net_long" : "net_short";
}

function getTopBy(
  positions: position_risk_driver[],
  getValue: (position: position_risk_driver) => number,
) {
  return positions.slice().sort((leftPosition, rightPosition) => {
    const valueDifference = getValue(rightPosition) - getValue(leftPosition);

    if (valueDifference !== 0) {
      return valueDifference;
    }

    return leftPosition.market.localeCompare(rightPosition.market);
  })[0] ?? null;
}

function getTopLiquidationPosition(positions: position_risk_driver[]) {
  return positions
    .filter((position) => position.liquidation_distance_bps !== null)
    .sort((leftPosition, rightPosition) => {
      const distanceDifference =
        (leftPosition.liquidation_distance_bps ?? 0) -
        (rightPosition.liquidation_distance_bps ?? 0);

      if (distanceDifference !== 0) {
        return distanceDifference;
      }

      return rightPosition.notional_usd - leftPosition.notional_usd;
    })[0] ?? null;
}

function getTopPositiveBy(
  positions: position_risk_driver[],
  getValue: (position: position_risk_driver) => number,
) {
  return getTopBy(
    positions.filter((position) => getValue(position) > 0),
    getValue,
  );
}

function getHeadline(input: {
  label: position_risk_drivers["label"];
  topDriverPosition: position_risk_driver | null;
}) {
  if (input.label === "no_positions") {
    return "No open positions are driving account risk.";
  }

  return `${input.topDriverPosition?.market ?? "A position"} is the largest risk driver in this snapshot.`;
}

function getSummary(input: {
  label: position_risk_drivers["label"];
  topDriverPosition: position_risk_driver | null;
}) {
  if (input.label === "no_positions") {
    return "Open a fixture or live account with positions to see ranked risk drivers.";
  }

  return `Top driver score is ${input.topDriverPosition?.driver_score ?? 0}/100 from listed liquidation buffer, notional exposure, funding burden, and unrealized loss.`;
}

export function buildPositionRiskDrivers(
  snapshot: normalized_account_snapshot,
): position_risk_drivers {
  const totalLongNotionalUsd = roundCurrency(
    snapshot.positions
      .filter((position) => position.side === "long")
      .reduce((sum, position) => sum + position.notional_usd, 0),
  );
  const totalShortNotionalUsd = roundCurrency(
    snapshot.positions
      .filter((position) => position.side === "short")
      .reduce((sum, position) => sum + position.notional_usd, 0),
  );
  const netDirectionalNotionalUsd = roundCurrency(
    totalLongNotionalUsd - totalShortNotionalUsd,
  );
  const positions = sortDriversByScore(
    snapshot.positions.map((position) =>
      buildPositionDriver({
        position,
        accountValueUsd: snapshot.account_value_usd,
        totalNotionalUsd: snapshot.aggregate.total_notional_usd,
      }),
    ),
  );
  const topDriverPosition = positions[0] ?? null;
  const topNotionalPosition = getTopBy(
    positions,
    (position) => position.notional_usd,
  );
  const label = topDriverPosition?.driver_label ?? "no_positions";

  return {
    label,
    headline: getHeadline({
      label,
      topDriverPosition,
    }),
    summary: getSummary({
      label,
      topDriverPosition,
    }),
    gross_notional_to_account_value_bps: getBpsOfAccountValue({
      accountValueUsd: snapshot.account_value_usd,
      valueUsd: snapshot.aggregate.total_notional_usd,
    }),
    largest_notional_share_bps: topNotionalPosition?.notional_share_bps ?? null,
    directional_bias: getDirectionalBias({
      totalNotionalUsd: snapshot.aggregate.total_notional_usd,
      netDirectionalNotionalUsd,
    }),
    total_long_notional_usd: totalLongNotionalUsd,
    total_short_notional_usd: totalShortNotionalUsd,
    net_directional_notional_usd: netDirectionalNotionalUsd,
    top_driver_position: topDriverPosition,
    top_notional_position: topNotionalPosition,
    top_liquidation_position: getTopLiquidationPosition(positions),
    top_funding_cost_position: getTopPositiveBy(positions, (position) =>
      Math.max(position.daily_funding_usd, 0),
    ),
    top_unrealized_loss_position: getTopPositiveBy(positions, (position) =>
      Math.max(-position.unrealized_pnl_usd, 0),
    ),
    positions,
  };
}

function formatBpsAsPercent(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return `${(value / 100).toFixed(2)}%`;
}

function formatBpsAsMultiple(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return `${(value / BPS_PER_UNIT).toFixed(2)}x`;
}
