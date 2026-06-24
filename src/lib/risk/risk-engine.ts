import type {
  account_snapshot_input,
  normalized_account_snapshot,
  normalized_position,
  position_input,
  risk_label,
  scenario_result,
} from "../perps/types.ts";

const BPS_PER_UNIT = 10_000;
const FUNDING_PERIODS_PER_DAY = 3;
const THIRTY_DAYS = 30;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function roundBps(value: number) {
  return Math.round(value);
}

export function calculateNotionalUsd(size: number, mark_price_usd: number) {
  return roundCurrency(Math.abs(size) * mark_price_usd);
}

export function calculateUnrealizedPnlUsd(
  side: normalized_position["side"],
  size: number,
  entry_price_usd: number,
  mark_price_usd: number,
) {
  const absoluteSize = Math.abs(size);
  const priceDelta =
    side === "long"
      ? mark_price_usd - entry_price_usd
      : entry_price_usd - mark_price_usd;

  return roundCurrency(priceDelta * absoluteSize);
}

export function normalizePosition(position: position_input): normalized_position {
  return {
    ...position,
    notional_usd: calculateNotionalUsd(position.size, position.mark_price_usd),
    unrealized_pnl_usd: calculateUnrealizedPnlUsd(
      position.side,
      position.size,
      position.entry_price_usd,
      position.mark_price_usd,
    ),
  };
}

export function calculateMarginUsageBps(
  account_value_usd: number,
  margin_used_usd: number,
) {
  if (account_value_usd <= 0) {
    return margin_used_usd > 0 ? BPS_PER_UNIT : 0;
  }

  return roundBps((margin_used_usd / account_value_usd) * BPS_PER_UNIT);
}

export function calculateLiquidationDistanceBps(
  position: Pick<
    normalized_position,
    "side" | "mark_price_usd" | "liquidation_price_usd"
  >,
) {
  if (position.liquidation_price_usd === null || position.mark_price_usd <= 0) {
    return null;
  }

  const distanceUsd =
    position.side === "long"
      ? position.mark_price_usd - position.liquidation_price_usd
      : position.liquidation_price_usd - position.mark_price_usd;

  return roundBps((distanceUsd / position.mark_price_usd) * BPS_PER_UNIT);
}

export function calculateDailyFundingUsd(
  position: Pick<
    normalized_position,
    "notional_usd" | "funding_8h_bps_user_perspective"
  >,
) {
  return roundCurrency(
    position.notional_usd *
      (position.funding_8h_bps_user_perspective / BPS_PER_UNIT) *
      FUNDING_PERIODS_PER_DAY,
  );
}

export function calculateThirtyDayFundingUsd(daily_funding_usd: number) {
  return roundCurrency(daily_funding_usd * THIRTY_DAYS);
}

export function getRiskLabel(risk_score: number): risk_label {
  if (risk_score >= 75) {
    return "critical";
  }

  if (risk_score >= 50) {
    return "high";
  }

  if (risk_score >= 25) {
    return "medium";
  }

  return "low";
}

export function calculateRiskScore(input: {
  account_value_usd: number;
  margin_usage_bps: number;
  min_liquidation_distance_bps: number | null;
  daily_funding_usd: number;
}) {
  if (input.account_value_usd <= 0) {
    return 100;
  }

  const marginComponent = clamp(input.margin_usage_bps / 100, 0, 40);
  const fundingBurdenBps = Math.max(input.daily_funding_usd, 0) /
    input.account_value_usd *
    BPS_PER_UNIT;
  const fundingComponent = clamp(fundingBurdenBps / 5, 0, 10);

  let liquidationComponent = 10;
  const distance = input.min_liquidation_distance_bps;

  if (distance === null) {
    liquidationComponent = 10;
  } else if (distance <= 0) {
    liquidationComponent = 50;
  } else if (distance < 500) {
    liquidationComponent = 45;
  } else if (distance < 1_000) {
    liquidationComponent = 35;
  } else if (distance < 2_500) {
    liquidationComponent = 20;
  } else if (distance < 5_000) {
    liquidationComponent = 10;
  } else {
    liquidationComponent = 0;
  }

  return roundBps(
    clamp(marginComponent + liquidationComponent + fundingComponent, 0, 100),
  );
}

export function calculateAggregate(
  snapshot: Pick<
    normalized_account_snapshot,
    "account_value_usd" | "margin_used_usd" | "positions"
  >,
): normalized_account_snapshot["aggregate"] {
  const totalNotionalUsd = roundCurrency(
    snapshot.positions.reduce((sum, position) => sum + position.notional_usd, 0),
  );
  const liquidationDistances = snapshot.positions
    .map((position) => calculateLiquidationDistanceBps(position))
    .filter((distance): distance is number => distance !== null);
  const minLiquidationDistanceBps =
    liquidationDistances.length > 0 ? Math.min(...liquidationDistances) : null;
  const dailyFundingUsd = roundCurrency(
    snapshot.positions.reduce(
      (sum, position) => sum + calculateDailyFundingUsd(position),
      0,
    ),
  );
  const marginUsageBps = calculateMarginUsageBps(
    snapshot.account_value_usd,
    snapshot.margin_used_usd,
  );
  const riskScore = calculateRiskScore({
    account_value_usd: snapshot.account_value_usd,
    margin_usage_bps: marginUsageBps,
    min_liquidation_distance_bps: minLiquidationDistanceBps,
    daily_funding_usd: dailyFundingUsd,
  });

  return {
    total_notional_usd: totalNotionalUsd,
    margin_usage_bps: marginUsageBps,
    min_liquidation_distance_bps: minLiquidationDistanceBps,
    daily_funding_usd: dailyFundingUsd,
    thirty_day_funding_usd: calculateThirtyDayFundingUsd(dailyFundingUsd),
    risk_score: riskScore,
    risk_label: getRiskLabel(riskScore),
  };
}

export function normalizeAccountSnapshot(
  input: account_snapshot_input,
): normalized_account_snapshot {
  const positions = input.positions.map(normalizePosition);
  const baseSnapshot = {
    ...input,
    positions,
  };

  return {
    ...baseSnapshot,
    aggregate: calculateAggregate(baseSnapshot),
  };
}

export function runPriceScenario(
  snapshot: normalized_account_snapshot,
  move_percent: number,
): scenario_result {
  const multiplier = 1 + move_percent / 100;
  const scenarioPositions = snapshot.positions.map((position) =>
    normalizePosition({
      ...position,
      mark_price_usd: roundCurrency(position.mark_price_usd * multiplier),
    }),
  );
  const estimatedPnlChangeUsd = roundCurrency(
    scenarioPositions.reduce(
      (sum, position, index) =>
        sum +
        (position.unrealized_pnl_usd -
          snapshot.positions[index].unrealized_pnl_usd),
      0,
    ),
  );
  const scenarioSnapshot = {
    ...snapshot,
    account_value_usd: roundCurrency(
      snapshot.account_value_usd + estimatedPnlChangeUsd,
    ),
    positions: scenarioPositions,
  };
  const aggregate = calculateAggregate(scenarioSnapshot);
  const positionsAtOrThroughLiquidation = scenarioPositions
    .filter((position) => {
      if (position.liquidation_price_usd === null) {
        return false;
      }

      return position.side === "long"
        ? position.mark_price_usd <= position.liquidation_price_usd
        : position.mark_price_usd >= position.liquidation_price_usd;
    })
    .map((position) => position.market);
  const liquidationSummary =
    positionsAtOrThroughLiquidation.length > 0
      ? `${positionsAtOrThroughLiquidation.join(", ")} at or through listed liquidation.`
      : "No positions at or through listed liquidation.";

  return {
    move_bps: roundBps(move_percent * 100),
    move_percent,
    estimated_account_value_usd: scenarioSnapshot.account_value_usd,
    estimated_pnl_change_usd: estimatedPnlChangeUsd,
    positions_at_or_through_liquidation: positionsAtOrThroughLiquidation,
    risk_score_after_move: aggregate.risk_score,
    risk_label_after_move: aggregate.risk_label,
    summary: `${move_percent}% price move: ${liquidationSummary}`,
  };
}
