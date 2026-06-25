import type {
  compared_position,
  metric_comparison,
  snapshot_comparison,
} from "../receipts/snapshot-comparison.ts";

const MATERIAL_MARK_MOVE_PERCENT = 2;
const MATERIAL_FUNDING_DELTA_USD = 1;

export type market_move_direction =
  | "toward_liquidation"
  | "away_from_liquidation"
  | "flat"
  | "not_comparable";

export type market_context_label =
  | "no_positions"
  | "position_state_changed"
  | "through_liquidation"
  | "toward_liquidation"
  | "market_moved"
  | "funding_more_expensive"
  | "funding_more_favorable"
  | "little_changed";

export type market_context_position = {
  market: string;
  status: compared_position["status"];
  side: "long" | "short" | "n/a";
  mark_price_usd: metric_comparison;
  mark_price_change_percent: number | null;
  mark_move_direction: market_move_direction;
  liquidation_distance_bps: metric_comparison;
  funding_8h_bps_user_perspective: metric_comparison;
  daily_funding_usd: metric_comparison;
  notional_usd: metric_comparison;
  open_interest_usd: metric_comparison;
  summary: string;
};

export type market_context = {
  label: market_context_label;
  headline: string;
  summary: string;
  max_abs_mark_price_change_percent: number;
  total_daily_funding_delta_usd: number | null;
  total_open_interest_delta_usd: number | null;
  most_relevant_position: market_context_position | null;
  positions: market_context_position[];
};

type market_context_position_without_summary = Omit<
  market_context_position,
  "summary"
>;

function round(value: number, decimals = 2) {
  const multiplier = 10 ** decimals;

  return Math.round(value * multiplier) / multiplier;
}

function compareOptionalNumber(
  receiptValue: number | undefined,
  currentValue: number | undefined,
): metric_comparison {
  if (receiptValue === undefined || currentValue === undefined) {
    return {
      receipt_value: receiptValue ?? null,
      current_value: currentValue ?? null,
      delta: null,
    };
  }

  return {
    receipt_value: receiptValue,
    current_value: currentValue,
    delta: round(currentValue - receiptValue),
  };
}

function getPositionSide(position: compared_position) {
  return (
    position.current_position?.side ??
    position.receipt_position?.side ??
    "n/a"
  );
}

function getMarkMoveDirection(
  position: compared_position,
): market_move_direction {
  const receiptPosition = position.receipt_position;
  const currentPosition = position.current_position;

  if (!receiptPosition || !currentPosition) {
    return "not_comparable";
  }

  const markPriceChangePercent = position.mark_price_change_percent;

  if (markPriceChangePercent === null || Math.abs(markPriceChangePercent) < 0.01) {
    return "flat";
  }

  const markMovedUp =
    currentPosition.mark_price_usd > receiptPosition.mark_price_usd;

  if (receiptPosition.side === "long") {
    return markMovedUp ? "away_from_liquidation" : "toward_liquidation";
  }

  return markMovedUp ? "toward_liquidation" : "away_from_liquidation";
}

function isAtOrThroughLiquidation(
  position: Pick<market_context_position, "liquidation_distance_bps">,
) {
  return (
    position.liquidation_distance_bps.current_value !== null &&
    position.liquidation_distance_bps.current_value <= 0
  );
}

function buildPositionSummary(position: market_context_position_without_summary) {
  if (position.status !== "same_position") {
    return "Position state changed; compare this receipt with care.";
  }

  if (isAtOrThroughLiquidation(position)) {
    return "Current mark is at or through the listed liquidation price.";
  }

  const markMoveCopy =
    position.mark_price_change_percent === null
      ? "mark move is unavailable"
      : `mark moved ${Math.abs(position.mark_price_change_percent).toFixed(2)}%`;
  const fundingDelta = position.daily_funding_usd.delta ?? 0;
  const fundingCopy =
    fundingDelta > MATERIAL_FUNDING_DELTA_USD
      ? "Daily funding became more expensive."
      : fundingDelta < -MATERIAL_FUNDING_DELTA_USD
        ? "Daily funding became more favorable."
        : "Daily funding is close to the saved receipt.";

  switch (position.mark_move_direction) {
    case "toward_liquidation":
      return `${markMoveCopy} toward the listed liquidation price. ${fundingCopy}`;
    case "away_from_liquidation":
      return `${markMoveCopy} away from the listed liquidation price. ${fundingCopy}`;
    case "flat":
      return `Mark price is close to the saved receipt. ${fundingCopy}`;
    case "not_comparable":
      return `No comparable live position. ${fundingCopy}`;
  }
}

function buildMarketContextPosition(
  position: compared_position,
): market_context_position {
  const contextPosition = {
    market: position.market,
    status: position.status,
    side: getPositionSide(position),
    mark_price_usd: {
      receipt_value: position.receipt_position?.mark_price_usd ?? null,
      current_value: position.current_position?.mark_price_usd ?? null,
      delta:
        position.receipt_position && position.current_position
          ? round(
              position.current_position.mark_price_usd -
                position.receipt_position.mark_price_usd,
            )
          : null,
    },
    mark_price_change_percent: position.mark_price_change_percent,
    mark_move_direction: getMarkMoveDirection(position),
    liquidation_distance_bps: position.liquidation_distance_bps,
    funding_8h_bps_user_perspective: compareOptionalNumber(
      position.receipt_position?.funding_8h_bps_user_perspective,
      position.current_position?.funding_8h_bps_user_perspective,
    ),
    daily_funding_usd: position.daily_funding_usd,
    notional_usd: position.notional_usd,
    open_interest_usd: compareOptionalNumber(
      position.receipt_position?.open_interest_usd,
      position.current_position?.open_interest_usd,
    ),
  } satisfies market_context_position_without_summary;

  return {
    ...contextPosition,
    summary: buildPositionSummary(contextPosition),
  };
}

function sumNullableDeltas(
  positions: market_context_position[],
  getComparison: (position: market_context_position) => metric_comparison,
) {
  const deltas = positions
    .map((position) => getComparison(position).delta)
    .filter((delta): delta is number => delta !== null);

  if (deltas.length === 0) {
    return null;
  }

  return round(deltas.reduce((sum, delta) => sum + delta, 0));
}

function getMostRelevantPosition(positions: market_context_position[]) {
  const throughLiquidation = positions
    .filter(isAtOrThroughLiquidation)
    .sort(
      (leftPosition, rightPosition) =>
        (leftPosition.liquidation_distance_bps.current_value ?? 0) -
        (rightPosition.liquidation_distance_bps.current_value ?? 0),
    )[0];

  if (throughLiquidation) {
    return throughLiquidation;
  }

  const towardLiquidation = positions
    .filter(
      (position) => position.mark_move_direction === "toward_liquidation",
    )
    .sort(
      (leftPosition, rightPosition) =>
        Math.abs(rightPosition.mark_price_change_percent ?? 0) -
        Math.abs(leftPosition.mark_price_change_percent ?? 0),
    )[0];

  if (towardLiquidation) {
    return towardLiquidation;
  }

  return (
    positions
      .slice()
      .sort(
        (leftPosition, rightPosition) =>
          Math.abs(rightPosition.mark_price_change_percent ?? 0) -
          Math.abs(leftPosition.mark_price_change_percent ?? 0),
      )[0] ?? null
  );
}

function getMarketContextLabel(input: {
  comparison: snapshot_comparison;
  positions: market_context_position[];
  totalDailyFundingDeltaUsd: number | null;
}): market_context_label {
  if (input.positions.length === 0) {
    return "no_positions";
  }

  if (input.comparison.changed_position_count > 0) {
    return "position_state_changed";
  }

  if (input.positions.some(isAtOrThroughLiquidation)) {
    return "through_liquidation";
  }

  const hasMaterialTowardMove = input.positions.some(
    (position) =>
      position.mark_move_direction === "toward_liquidation" &&
      Math.abs(position.mark_price_change_percent ?? 0) >=
        MATERIAL_MARK_MOVE_PERCENT,
  );

  if (hasMaterialTowardMove) {
    return "toward_liquidation";
  }

  if (
    input.comparison.max_abs_mark_price_change_percent >=
    MATERIAL_MARK_MOVE_PERCENT
  ) {
    return "market_moved";
  }

  if (
    input.totalDailyFundingDeltaUsd !== null &&
    input.totalDailyFundingDeltaUsd > MATERIAL_FUNDING_DELTA_USD
  ) {
    return "funding_more_expensive";
  }

  if (
    input.totalDailyFundingDeltaUsd !== null &&
    input.totalDailyFundingDeltaUsd < -MATERIAL_FUNDING_DELTA_USD
  ) {
    return "funding_more_favorable";
  }

  return "little_changed";
}

function getHeadline(label: market_context_label) {
  switch (label) {
    case "no_positions":
      return "There are no open positions to compare against the current market.";
    case "position_state_changed":
      return "The account changed positions since this receipt was created.";
    case "through_liquidation":
      return "A comparable position is at or through its listed liquidation price.";
    case "toward_liquidation":
      return "Current mark prices moved a comparable position toward liquidation.";
    case "market_moved":
      return "Current mark prices moved materially since the receipt.";
    case "funding_more_expensive":
      return "Funding carry is more expensive than it was on the receipt.";
    case "funding_more_favorable":
      return "Funding carry is more favorable than it was on the receipt.";
    case "little_changed":
      return "The current market context is close to the saved receipt.";
  }
}

function getSummary(input: {
  label: market_context_label;
  mostRelevantPosition: market_context_position | null;
  totalDailyFundingDeltaUsd: number | null;
}) {
  const focusMarket = input.mostRelevantPosition?.market ?? "No single market";
  const fundingCopy =
    input.totalDailyFundingDeltaUsd === null
      ? "daily funding delta is unavailable"
      : `daily funding delta is ${input.totalDailyFundingDeltaUsd >= 0 ? "+" : ""}${input.totalDailyFundingDeltaUsd.toFixed(2)} USD`;

  switch (input.label) {
    case "no_positions":
      return "No receipt or current open positions are available for market context.";
    case "position_state_changed":
      return `${focusMarket} needs review because the position set changed. ${fundingCopy}.`;
    case "through_liquidation":
    case "toward_liquidation":
    case "market_moved":
      return `${focusMarket} is the market to inspect first; ${fundingCopy}.`;
    case "funding_more_expensive":
    case "funding_more_favorable":
      return `${focusMarket} is the visible focus market; ${fundingCopy}.`;
    case "little_changed":
      return `Saved and current market context are close; ${fundingCopy}.`;
  }
}

export function buildMarketContext(
  comparison: snapshot_comparison,
): market_context {
  const positions = comparison.positions.map(buildMarketContextPosition);
  const totalDailyFundingDeltaUsd = sumNullableDeltas(
    positions,
    (position) => position.daily_funding_usd,
  );
  const totalOpenInterestDeltaUsd = sumNullableDeltas(
    positions,
    (position) => position.open_interest_usd,
  );
  const mostRelevantPosition = getMostRelevantPosition(positions);
  const label = getMarketContextLabel({
    comparison,
    positions,
    totalDailyFundingDeltaUsd,
  });

  return {
    label,
    headline: getHeadline(label),
    summary: getSummary({
      label,
      mostRelevantPosition,
      totalDailyFundingDeltaUsd,
    }),
    max_abs_mark_price_change_percent:
      comparison.max_abs_mark_price_change_percent,
    total_daily_funding_delta_usd: totalDailyFundingDeltaUsd,
    total_open_interest_delta_usd: totalOpenInterestDeltaUsd,
    most_relevant_position: mostRelevantPosition,
    positions,
  };
}
