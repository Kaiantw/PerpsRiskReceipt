import type {
  normalized_account_snapshot,
  normalized_position,
} from "../perps/types.ts";
import { calculateLiquidationDistanceBps } from "../risk/risk-engine.ts";

const THIN_BUFFER_BPS = 500;
const TIGHT_BUFFER_BPS = 1_000;
const MODERATE_BUFFER_BPS = 2_500;

export type liquidation_buffer_label =
  | "no_positions"
  | "unavailable"
  | "at_or_through"
  | "thin"
  | "tight"
  | "moderate"
  | "wide";

export type liquidation_buffer_position = {
  market: string;
  side: normalized_position["side"];
  mark_price_usd: number;
  liquidation_price_usd: number | null;
  liquidation_distance_bps: number | null;
  adverse_move_percent: number | null;
  adverse_move_usd: number | null;
  approximate_pnl_to_liquidation_usd: number | null;
  notional_usd: number;
  label: liquidation_buffer_label;
  summary: string;
};

export type liquidation_buffer_ladder = {
  label: liquidation_buffer_label;
  headline: string;
  closest_position: liquidation_buffer_position | null;
  positions: liquidation_buffer_position[];
  unavailable_position_count: number;
};

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function roundPercent(value: number) {
  return Math.round(value * 100) / 100;
}

function getPositionLabel(
  liquidationDistanceBps: number | null,
): liquidation_buffer_label {
  if (liquidationDistanceBps === null) {
    return "unavailable";
  }

  if (liquidationDistanceBps <= 0) {
    return "at_or_through";
  }

  if (liquidationDistanceBps <= THIN_BUFFER_BPS) {
    return "thin";
  }

  if (liquidationDistanceBps <= TIGHT_BUFFER_BPS) {
    return "tight";
  }

  if (liquidationDistanceBps <= MODERATE_BUFFER_BPS) {
    return "moderate";
  }

  return "wide";
}

function getAdverseMoveUsd(position: normalized_position) {
  if (
    position.liquidation_price_usd === null ||
    position.mark_price_usd <= 0
  ) {
    return null;
  }

  const adverseMoveUsd =
    position.side === "long"
      ? position.mark_price_usd - position.liquidation_price_usd
      : position.liquidation_price_usd - position.mark_price_usd;

  return roundCurrency(Math.max(adverseMoveUsd, 0));
}

function getAdverseMovePercent(liquidationDistanceBps: number | null) {
  if (liquidationDistanceBps === null) {
    return null;
  }

  return roundPercent(Math.max(liquidationDistanceBps, 0) / 100);
}

function getApproximatePnlToLiquidationUsd(
  position: normalized_position,
  adverseMoveUsd: number | null,
) {
  if (adverseMoveUsd === null) {
    return null;
  }

  return roundCurrency(Math.abs(position.size) * adverseMoveUsd);
}

function getSummary(input: {
  market: string;
  label: liquidation_buffer_label;
  adverseMovePercent: number | null;
}) {
  switch (input.label) {
    case "unavailable":
      return `${input.market} has no listed liquidation price in this snapshot.`;
    case "at_or_through":
      return `${input.market} is at or through the listed liquidation price.`;
    case "thin":
      return `${input.market} has less than 5% listed liquidation buffer.`;
    case "tight":
      return `${input.market} has less than 10% listed liquidation buffer.`;
    case "moderate":
      return `${input.market} has less than 25% listed liquidation buffer.`;
    case "wide":
      return `${input.market} has ${input.adverseMovePercent?.toFixed(
        2,
      )}% listed liquidation buffer.`;
    case "no_positions":
      return "No open positions.";
  }
}

function buildPositionBuffer(
  position: normalized_position,
): liquidation_buffer_position {
  const liquidationDistanceBps = calculateLiquidationDistanceBps(position);
  const adverseMoveUsd = getAdverseMoveUsd(position);
  const label = getPositionLabel(liquidationDistanceBps);
  const adverseMovePercent = getAdverseMovePercent(liquidationDistanceBps);

  return {
    market: position.market,
    side: position.side,
    mark_price_usd: position.mark_price_usd,
    liquidation_price_usd: position.liquidation_price_usd,
    liquidation_distance_bps: liquidationDistanceBps,
    adverse_move_percent: adverseMovePercent,
    adverse_move_usd: adverseMoveUsd,
    approximate_pnl_to_liquidation_usd: getApproximatePnlToLiquidationUsd(
      position,
      adverseMoveUsd,
    ),
    notional_usd: position.notional_usd,
    label,
    summary: getSummary({
      market: position.market,
      label,
      adverseMovePercent,
    }),
  };
}

function sortPositionsByBuffer(
  positions: liquidation_buffer_position[],
): liquidation_buffer_position[] {
  return positions.slice().sort((leftPosition, rightPosition) => {
    if (
      leftPosition.liquidation_distance_bps === null &&
      rightPosition.liquidation_distance_bps === null
    ) {
      return leftPosition.market.localeCompare(rightPosition.market);
    }

    if (leftPosition.liquidation_distance_bps === null) {
      return 1;
    }

    if (rightPosition.liquidation_distance_bps === null) {
      return -1;
    }

    return (
      leftPosition.liquidation_distance_bps -
      rightPosition.liquidation_distance_bps
    );
  });
}

function getLadderLabel(
  positions: liquidation_buffer_position[],
): liquidation_buffer_label {
  if (positions.length === 0) {
    return "no_positions";
  }

  const closestPosition = positions.find(
    (position) => position.liquidation_distance_bps !== null,
  );

  return closestPosition?.label ?? "unavailable";
}

function getHeadline(input: {
  label: liquidation_buffer_label;
  closestPosition: liquidation_buffer_position | null;
}) {
  switch (input.label) {
    case "no_positions":
      return "No open positions have liquidation buffer.";
    case "unavailable":
      return "No listed liquidation prices are available in this snapshot.";
    case "at_or_through":
      return `${input.closestPosition?.market ?? "A position"} is at or through listed liquidation.`;
    case "thin":
      return `${input.closestPosition?.market ?? "A position"} has a thin listed liquidation buffer.`;
    case "tight":
      return `${input.closestPosition?.market ?? "A position"} has a tight listed liquidation buffer.`;
    case "moderate":
      return `${input.closestPosition?.market ?? "A position"} has a moderate listed liquidation buffer.`;
    case "wide":
      return "All listed liquidation buffers are wide in this snapshot.";
  }
}

export function buildLiquidationBufferLadder(
  snapshot: normalized_account_snapshot,
): liquidation_buffer_ladder {
  const positions = sortPositionsByBuffer(
    snapshot.positions.map(buildPositionBuffer),
  );
  const closestPosition =
    positions.find((position) => position.liquidation_distance_bps !== null) ??
    null;
  const label = getLadderLabel(positions);

  return {
    label,
    headline: getHeadline({
      label,
      closestPosition,
    }),
    closest_position: closestPosition,
    positions,
    unavailable_position_count: positions.filter(
      (position) => position.liquidation_distance_bps === null,
    ).length,
  };
}
