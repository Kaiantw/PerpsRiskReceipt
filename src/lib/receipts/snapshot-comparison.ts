import type {
  normalized_account_snapshot,
  normalized_position,
} from "../perps/types.ts";
import {
  calculateDailyFundingUsd,
  calculateLiquidationDistanceBps,
} from "../risk/risk-engine.ts";

const MATERIAL_RISK_SCORE_DELTA = 10;
const MATERIAL_MARGIN_USAGE_BPS_DELTA = 500;
const MATERIAL_LIQUIDATION_DISTANCE_BPS_DELTA = 500;
const MATERIAL_MARK_PRICE_MOVE_PERCENT = 2;

export type metric_comparison = {
  receipt_value: number | null;
  current_value: number | null;
  delta: number | null;
};

export type position_comparison_status =
  | "same_position"
  | "position_changed"
  | "closed"
  | "new";

export type snapshot_comparison_status =
  | "account_mismatch"
  | "position_state_changed"
  | "risk_worsened"
  | "risk_improved"
  | "market_moved"
  | "little_changed";

export type compared_position = {
  market: string;
  status: position_comparison_status;
  receipt_position: normalized_position | null;
  current_position: normalized_position | null;
  mark_price_change_percent: number | null;
  liquidation_distance_bps: metric_comparison;
  daily_funding_usd: metric_comparison;
  notional_usd: metric_comparison;
  size: metric_comparison;
};

export type snapshot_comparison = {
  account_matches: boolean;
  status: snapshot_comparison_status;
  headline: string;
  changed_position_count: number;
  max_abs_mark_price_change_percent: number;
  metrics: {
    account_value_usd: metric_comparison;
    margin_usage_bps: metric_comparison;
    total_notional_usd: metric_comparison;
    min_liquidation_distance_bps: metric_comparison;
    daily_funding_usd: metric_comparison;
    risk_score: metric_comparison;
  };
  positions: compared_position[];
};

function round(value: number, decimals = 2) {
  const multiplier = 10 ** decimals;

  return Math.round(value * multiplier) / multiplier;
}

function compareNumber(
  receiptValue: number | null,
  currentValue: number | null,
): metric_comparison {
  if (receiptValue === null || currentValue === null) {
    return {
      receipt_value: receiptValue,
      current_value: currentValue,
      delta: null,
    };
  }

  return {
    receipt_value: receiptValue,
    current_value: currentValue,
    delta: round(currentValue - receiptValue),
  };
}

function getPositionByMarket(snapshot: normalized_account_snapshot) {
  return new Map(
    snapshot.positions.map((position) => [position.market, position]),
  );
}

function getMarkPriceChangePercent(
  receiptPosition: normalized_position | null,
  currentPosition: normalized_position | null,
) {
  if (
    !receiptPosition ||
    !currentPosition ||
    receiptPosition.mark_price_usd <= 0
  ) {
    return null;
  }

  return round(
    ((currentPosition.mark_price_usd - receiptPosition.mark_price_usd) /
      receiptPosition.mark_price_usd) *
      100,
  );
}

function getPositionStatus(
  receiptPosition: normalized_position | null,
  currentPosition: normalized_position | null,
): position_comparison_status {
  if (receiptPosition && !currentPosition) {
    return "closed";
  }

  if (!receiptPosition && currentPosition) {
    return "new";
  }

  if (!receiptPosition || !currentPosition) {
    return "same_position";
  }

  const sizeDelta = Math.abs(receiptPosition.size - currentPosition.size);

  if (receiptPosition.side !== currentPosition.side || sizeDelta > 0.00000001) {
    return "position_changed";
  }

  return "same_position";
}

function comparePosition(
  market: string,
  receiptPosition: normalized_position | null,
  currentPosition: normalized_position | null,
): compared_position {
  return {
    market,
    status: getPositionStatus(receiptPosition, currentPosition),
    receipt_position: receiptPosition,
    current_position: currentPosition,
    mark_price_change_percent: getMarkPriceChangePercent(
      receiptPosition,
      currentPosition,
    ),
    liquidation_distance_bps: compareNumber(
      receiptPosition ? calculateLiquidationDistanceBps(receiptPosition) : null,
      currentPosition ? calculateLiquidationDistanceBps(currentPosition) : null,
    ),
    daily_funding_usd: compareNumber(
      receiptPosition ? calculateDailyFundingUsd(receiptPosition) : null,
      currentPosition ? calculateDailyFundingUsd(currentPosition) : null,
    ),
    notional_usd: compareNumber(
      receiptPosition?.notional_usd ?? null,
      currentPosition?.notional_usd ?? null,
    ),
    size: compareNumber(receiptPosition?.size ?? null, currentPosition?.size ?? null),
  };
}

function comparePositions(
  receiptSnapshot: normalized_account_snapshot,
  currentSnapshot: normalized_account_snapshot,
) {
  const receiptPositionsByMarket = getPositionByMarket(receiptSnapshot);
  const currentPositionsByMarket = getPositionByMarket(currentSnapshot);
  const markets = Array.from(
    new Set([
      ...receiptPositionsByMarket.keys(),
      ...currentPositionsByMarket.keys(),
    ]),
  ).sort((leftMarket, rightMarket) => leftMarket.localeCompare(rightMarket));

  return markets.map((market) =>
    comparePosition(
      market,
      receiptPositionsByMarket.get(market) ?? null,
      currentPositionsByMarket.get(market) ?? null,
    ),
  );
}

function getComparisonStatus(input: {
  accountMatches: boolean;
  changedPositionCount: number;
  maxAbsMarkPriceChangePercent: number;
  metrics: snapshot_comparison["metrics"];
}): snapshot_comparison_status {
  if (!input.accountMatches) {
    return "account_mismatch";
  }

  if (input.changedPositionCount > 0) {
    return "position_state_changed";
  }

  const riskScoreDelta = input.metrics.risk_score.delta ?? 0;
  const marginUsageDelta = input.metrics.margin_usage_bps.delta ?? 0;
  const liquidationDistanceDelta =
    input.metrics.min_liquidation_distance_bps.delta ?? 0;

  if (
    riskScoreDelta >= MATERIAL_RISK_SCORE_DELTA ||
    marginUsageDelta >= MATERIAL_MARGIN_USAGE_BPS_DELTA ||
    liquidationDistanceDelta <= -MATERIAL_LIQUIDATION_DISTANCE_BPS_DELTA
  ) {
    return "risk_worsened";
  }

  if (
    riskScoreDelta <= -MATERIAL_RISK_SCORE_DELTA ||
    marginUsageDelta <= -MATERIAL_MARGIN_USAGE_BPS_DELTA ||
    liquidationDistanceDelta >= MATERIAL_LIQUIDATION_DISTANCE_BPS_DELTA
  ) {
    return "risk_improved";
  }

  if (input.maxAbsMarkPriceChangePercent >= MATERIAL_MARK_PRICE_MOVE_PERCENT) {
    return "market_moved";
  }

  return "little_changed";
}

function getHeadline(status: snapshot_comparison_status) {
  switch (status) {
    case "account_mismatch":
      return "The live account does not match the saved receipt account.";
    case "position_state_changed":
      return "The account position state changed since this receipt was created.";
    case "risk_worsened":
      return "The saved account is materially riskier on the live recheck.";
    case "risk_improved":
      return "The saved account is materially less risky on the live recheck.";
    case "market_moved":
      return "The account positions are unchanged, but the market moved materially.";
    case "little_changed":
      return "The live recheck is close to the saved receipt state.";
  }
}

export function compareSnapshots(input: {
  receiptSnapshot: normalized_account_snapshot;
  currentSnapshot: normalized_account_snapshot;
}): snapshot_comparison {
  const positions = comparePositions(
    input.receiptSnapshot,
    input.currentSnapshot,
  );
  const changedPositionCount = positions.filter(
    (position) => position.status !== "same_position",
  ).length;
  const maxAbsMarkPriceChangePercent = Math.max(
    0,
    ...positions.map((position) =>
      Math.abs(position.mark_price_change_percent ?? 0),
    ),
  );
  const metrics = {
    account_value_usd: compareNumber(
      input.receiptSnapshot.account_value_usd,
      input.currentSnapshot.account_value_usd,
    ),
    margin_usage_bps: compareNumber(
      input.receiptSnapshot.aggregate.margin_usage_bps,
      input.currentSnapshot.aggregate.margin_usage_bps,
    ),
    total_notional_usd: compareNumber(
      input.receiptSnapshot.aggregate.total_notional_usd,
      input.currentSnapshot.aggregate.total_notional_usd,
    ),
    min_liquidation_distance_bps: compareNumber(
      input.receiptSnapshot.aggregate.min_liquidation_distance_bps,
      input.currentSnapshot.aggregate.min_liquidation_distance_bps,
    ),
    daily_funding_usd: compareNumber(
      input.receiptSnapshot.aggregate.daily_funding_usd,
      input.currentSnapshot.aggregate.daily_funding_usd,
    ),
    risk_score: compareNumber(
      input.receiptSnapshot.aggregate.risk_score,
      input.currentSnapshot.aggregate.risk_score,
    ),
  };
  const accountMatches =
    input.receiptSnapshot.account.toLowerCase() ===
    input.currentSnapshot.account.toLowerCase();
  const status = getComparisonStatus({
    accountMatches,
    changedPositionCount,
    maxAbsMarkPriceChangePercent,
    metrics,
  });

  return {
    account_matches: accountMatches,
    status,
    headline: getHeadline(status),
    changed_position_count: changedPositionCount,
    max_abs_mark_price_change_percent: round(maxAbsMarkPriceChangePercent),
    metrics,
    positions,
  };
}
