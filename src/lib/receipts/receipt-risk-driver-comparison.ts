import type { normalized_account_snapshot } from "../perps/types.ts";
import {
  buildPositionRiskDrivers,
  type position_risk_driver,
  type position_risk_driver_category,
  type position_risk_drivers,
} from "../risk/position-risk-drivers.ts";

const MATERIAL_DRIVER_SCORE_DELTA = 10;
const MATERIAL_LIQUIDATION_DISTANCE_BPS_DELTA = 500;
const MATERIAL_DAILY_FUNDING_USD_DELTA = 1;
const POSITION_SIZE_EPSILON = 0.00000001;

export type receipt_risk_driver_comparison_label =
  | "no_live_snapshot"
  | "account_mismatch"
  | "positions_changed"
  | "driver_worsened"
  | "driver_improved"
  | "driver_changed"
  | "little_changed";

export type receipt_risk_driver_comparison_severity =
  | "critical"
  | "changed"
  | "watch"
  | "neutral";

export type receipt_risk_driver_market_status =
  | "same_position"
  | "position_changed"
  | "closed"
  | "new";

export type receipt_risk_driver_market_change = {
  market: string;
  status: receipt_risk_driver_market_status;
  saved_driver: position_risk_driver | null;
  current_driver: position_risk_driver | null;
  driver_score_delta: number | null;
  primary_driver_changed: boolean;
  liquidation_distance_delta_bps: number | null;
  daily_funding_delta_usd: number | null;
  notional_delta_usd: number | null;
  summary: string;
};

export type receipt_risk_driver_comparison = {
  label: receipt_risk_driver_comparison_label;
  severity: receipt_risk_driver_comparison_severity;
  headline: string;
  summary: string;
  account_matches: boolean;
  changed_position_count: number;
  saved_drivers: position_risk_drivers;
  current_drivers: position_risk_drivers | null;
  saved_top_driver_market: string | null;
  current_top_driver_market: string | null;
  saved_top_primary_driver: position_risk_driver_category | null;
  current_top_primary_driver: position_risk_driver_category | null;
  top_driver_score_delta: number | null;
  gross_exposure_delta_bps: number | null;
  largest_position_share_delta_bps: number | null;
  net_directional_notional_delta_usd: number | null;
  closest_liquidation_distance_delta_bps: number | null;
  daily_funding_delta_usd: number | null;
  market_changes: receipt_risk_driver_market_change[];
  review_points: string[];
};

function round(value: number, decimals = 2) {
  const multiplier = 10 ** decimals;

  return Math.round(value * multiplier) / multiplier;
}

function subtractNullableNumbers(
  savedValue: number | null | undefined,
  currentValue: number | null | undefined,
) {
  if (savedValue === null || savedValue === undefined) {
    return null;
  }

  if (currentValue === null || currentValue === undefined) {
    return null;
  }

  return round(currentValue - savedValue);
}

function formatSignedNumber(value: number) {
  if (value === 0) {
    return "0";
  }

  return `${value > 0 ? "+" : "-"}${Math.abs(value).toFixed(2)}`;
}

function formatSignedUsd(value: number) {
  return `${formatSignedNumber(value)} USD/day`;
}

function formatSignedPercentFromBps(value: number) {
  return `${formatSignedNumber(value / 100)} percentage points`;
}

function formatPrimaryDriver(category: position_risk_driver_category | null) {
  switch (category) {
    case "liquidation_buffer":
      return "listed liquidation buffer";
    case "missing_liquidation":
      return "missing liquidation price";
    case "notional_concentration":
      return "notional exposure";
    case "funding_cost":
      return "positive funding cost";
    case "unrealized_loss":
      return "unrealized loss";
    case null:
      return "no driver";
  }
}

function getPositionByMarket(snapshot: normalized_account_snapshot) {
  return new Map(
    snapshot.positions.map((position) => [position.market, position]),
  );
}

function getDriverByMarket(drivers: position_risk_drivers) {
  return new Map(drivers.positions.map((driver) => [driver.market, driver]));
}

function getMarketStatus(input: {
  savedSnapshot: normalized_account_snapshot;
  currentSnapshot: normalized_account_snapshot;
  market: string;
}): receipt_risk_driver_market_status {
  const savedPosition = getPositionByMarket(input.savedSnapshot).get(
    input.market,
  );
  const currentPosition = getPositionByMarket(input.currentSnapshot).get(
    input.market,
  );

  if (savedPosition && !currentPosition) {
    return "closed";
  }

  if (!savedPosition && currentPosition) {
    return "new";
  }

  if (!savedPosition || !currentPosition) {
    return "same_position";
  }

  const sizeDelta = Math.abs(savedPosition.size - currentPosition.size);

  if (
    savedPosition.side !== currentPosition.side ||
    sizeDelta > POSITION_SIZE_EPSILON
  ) {
    return "position_changed";
  }

  return "same_position";
}

function getMarketSummary(input: {
  market: string;
  status: receipt_risk_driver_market_status;
  savedDriver: position_risk_driver | null;
  currentDriver: position_risk_driver | null;
  driverScoreDelta: number | null;
  primaryDriverChanged: boolean;
}) {
  switch (input.status) {
    case "closed":
      return `${input.market} existed on the receipt and is not open in the live snapshot.`;
    case "new":
      return `${input.market} is new in the live snapshot and was not part of the receipt.`;
    case "position_changed":
      return `${input.market} has a different side or size in the live snapshot.`;
    case "same_position":
      if (input.primaryDriverChanged) {
        return `${input.market} changed from ${formatPrimaryDriver(
          input.savedDriver?.primary_driver ?? null,
        )} to ${formatPrimaryDriver(
          input.currentDriver?.primary_driver ?? null,
        )}.`;
      }

      if (input.driverScoreDelta !== null && input.driverScoreDelta !== 0) {
        return `${input.market} driver score moved by ${formatSignedNumber(
          input.driverScoreDelta,
        )}.`;
      }

      return `${input.market} has no material risk-driver change by current app thresholds.`;
  }
}

function compareMarketDrivers(input: {
  market: string;
  status: receipt_risk_driver_market_status;
  savedDriver: position_risk_driver | null;
  currentDriver: position_risk_driver | null;
}): receipt_risk_driver_market_change {
  const driverScoreDelta = subtractNullableNumbers(
    input.savedDriver?.driver_score,
    input.currentDriver?.driver_score,
  );
  const primaryDriverChanged =
    input.savedDriver !== null &&
    input.currentDriver !== null &&
    input.savedDriver.primary_driver !== input.currentDriver.primary_driver;

  return {
    market: input.market,
    status: input.status,
    saved_driver: input.savedDriver,
    current_driver: input.currentDriver,
    driver_score_delta: driverScoreDelta,
    primary_driver_changed: primaryDriverChanged,
    liquidation_distance_delta_bps: subtractNullableNumbers(
      input.savedDriver?.liquidation_distance_bps,
      input.currentDriver?.liquidation_distance_bps,
    ),
    daily_funding_delta_usd: subtractNullableNumbers(
      input.savedDriver?.daily_funding_usd,
      input.currentDriver?.daily_funding_usd,
    ),
    notional_delta_usd: subtractNullableNumbers(
      input.savedDriver?.notional_usd,
      input.currentDriver?.notional_usd,
    ),
    summary: getMarketSummary({
      market: input.market,
      status: input.status,
      savedDriver: input.savedDriver,
      currentDriver: input.currentDriver,
      driverScoreDelta,
      primaryDriverChanged,
    }),
  };
}

function getMarketChanges(input: {
  savedSnapshot: normalized_account_snapshot;
  currentSnapshot: normalized_account_snapshot;
  savedDrivers: position_risk_drivers;
  currentDrivers: position_risk_drivers;
}) {
  const savedDriversByMarket = getDriverByMarket(input.savedDrivers);
  const currentDriversByMarket = getDriverByMarket(input.currentDrivers);
  const markets = Array.from(
    new Set([...savedDriversByMarket.keys(), ...currentDriversByMarket.keys()]),
  ).sort((leftMarket, rightMarket) => leftMarket.localeCompare(rightMarket));

  return markets.map((market) =>
    compareMarketDrivers({
      market,
      status: getMarketStatus({
        savedSnapshot: input.savedSnapshot,
        currentSnapshot: input.currentSnapshot,
        market,
      }),
      savedDriver: savedDriversByMarket.get(market) ?? null,
      currentDriver: currentDriversByMarket.get(market) ?? null,
    }),
  );
}

function getComparisonLabel(input: {
  accountMatches: boolean;
  changedPositionCount: number;
  savedDrivers: position_risk_drivers;
  currentDrivers: position_risk_drivers;
  topDriverScoreDelta: number | null;
  closestLiquidationDistanceDeltaBps: number | null;
  dailyFundingDeltaUsd: number | null;
}) {
  if (!input.accountMatches) {
    return "account_mismatch";
  }

  if (input.changedPositionCount > 0) {
    return "positions_changed";
  }

  const topDriverChanged =
    input.savedDrivers.top_driver_position?.market !==
      input.currentDrivers.top_driver_position?.market ||
    input.savedDrivers.top_driver_position?.primary_driver !==
      input.currentDrivers.top_driver_position?.primary_driver;

  const driverScoreDelta = input.topDriverScoreDelta ?? 0;
  const liquidationDistanceDelta =
    input.closestLiquidationDistanceDeltaBps ?? 0;
  const dailyFundingDelta = input.dailyFundingDeltaUsd ?? 0;

  if (
    driverScoreDelta >= MATERIAL_DRIVER_SCORE_DELTA ||
    liquidationDistanceDelta <= -MATERIAL_LIQUIDATION_DISTANCE_BPS_DELTA ||
    dailyFundingDelta >= MATERIAL_DAILY_FUNDING_USD_DELTA
  ) {
    return "driver_worsened";
  }

  if (
    driverScoreDelta <= -MATERIAL_DRIVER_SCORE_DELTA ||
    liquidationDistanceDelta >= MATERIAL_LIQUIDATION_DISTANCE_BPS_DELTA ||
    dailyFundingDelta <= -MATERIAL_DAILY_FUNDING_USD_DELTA
  ) {
    return "driver_improved";
  }

  if (topDriverChanged) {
    return "driver_changed";
  }

  return "little_changed";
}

function getSeverity(
  label: receipt_risk_driver_comparison_label,
): receipt_risk_driver_comparison_severity {
  switch (label) {
    case "account_mismatch":
    case "driver_worsened":
      return "critical";
    case "positions_changed":
      return "changed";
    case "driver_improved":
    case "driver_changed":
      return "watch";
    case "no_live_snapshot":
    case "little_changed":
      return "neutral";
  }
}

function getHeadline(label: receipt_risk_driver_comparison_label) {
  switch (label) {
    case "no_live_snapshot":
      return "Run a live recheck to compare current risk drivers.";
    case "account_mismatch":
      return "The live risk drivers are from a different account.";
    case "positions_changed":
      return "The position set changed, so the receipt drivers are historical.";
    case "driver_worsened":
      return "The live top risk driver is materially higher than the receipt.";
    case "driver_improved":
      return "The live top risk driver is materially lower than the receipt.";
    case "driver_changed":
      return "The leading risk driver moved since the receipt.";
    case "little_changed":
      return "The live top risk driver is close to the saved receipt.";
  }
}

function getSummary(input: {
  label: receipt_risk_driver_comparison_label;
  savedTopDriverMarket: string | null;
  currentTopDriverMarket: string | null;
  topDriverScoreDelta: number | null;
}) {
  if (input.label === "no_live_snapshot") {
    return "This section compares the saved receipt against the next successful live Hyperliquid recheck.";
  }

  const savedTop = input.savedTopDriverMarket ?? "none";
  const currentTop = input.currentTopDriverMarket ?? "none";
  const scoreMove =
    input.topDriverScoreDelta === null
      ? "n/a"
      : formatSignedNumber(input.topDriverScoreDelta);

  return `Top driver moved from ${savedTop} to ${currentTop}; score delta ${scoreMove}.`;
}

function appendPoint(points: string[], point: string | null) {
  if (point) {
    points.push(point);
  }
}

function getReviewPoints(input: {
  label: receipt_risk_driver_comparison_label;
  changedPositionCount: number;
  savedTopDriverMarket: string | null;
  currentTopDriverMarket: string | null;
  savedTopPrimaryDriver: position_risk_driver_category | null;
  currentTopPrimaryDriver: position_risk_driver_category | null;
  topDriverScoreDelta: number | null;
  grossExposureDeltaBps: number | null;
  closestLiquidationDistanceDeltaBps: number | null;
  dailyFundingDeltaUsd: number | null;
}) {
  const points: string[] = [];

  if (input.label === "no_live_snapshot") {
    return [
      "No live snapshot has been loaded for a driver comparison yet.",
    ];
  }

  if (input.label === "account_mismatch") {
    points.push(
      "Account mismatch: compare the saved receipt only with the same live account address.",
    );
  }

  if (input.changedPositionCount > 0) {
    points.push(
      `${input.changedPositionCount} position state change(s) affect the driver comparison.`,
    );
  }

  if (input.savedTopDriverMarket !== input.currentTopDriverMarket) {
    points.push(
      `Top driver changed from ${input.savedTopDriverMarket ?? "none"} to ${input.currentTopDriverMarket ?? "none"}.`,
    );
  }

  if (input.savedTopPrimaryDriver !== input.currentTopPrimaryDriver) {
    points.push(
      `Top driver factor changed from ${formatPrimaryDriver(
        input.savedTopPrimaryDriver,
      )} to ${formatPrimaryDriver(input.currentTopPrimaryDriver)}.`,
    );
  }

  appendPoint(
    points,
    input.topDriverScoreDelta === null || input.topDriverScoreDelta === 0
      ? null
      : `Top driver score moved by ${formatSignedNumber(
          input.topDriverScoreDelta,
        )}.`,
  );
  appendPoint(
    points,
    input.grossExposureDeltaBps === null || input.grossExposureDeltaBps === 0
      ? null
      : `Gross exposure moved by ${formatSignedPercentFromBps(
          input.grossExposureDeltaBps,
        )} of account value.`,
  );
  appendPoint(
    points,
    input.closestLiquidationDistanceDeltaBps === null ||
      input.closestLiquidationDistanceDeltaBps === 0
      ? null
      : `Closest listed liquidation buffer moved by ${formatSignedPercentFromBps(
          input.closestLiquidationDistanceDeltaBps,
        )}.`,
  );
  appendPoint(
    points,
    input.dailyFundingDeltaUsd === null || input.dailyFundingDeltaUsd === 0
      ? null
      : `Daily funding burden moved by ${formatSignedUsd(
          input.dailyFundingDeltaUsd,
        )}.`,
  );

  if (points.length === 0) {
    points.push(
      "No material risk-driver changes crossed the current app thresholds.",
    );
  }

  return points.slice(0, 6);
}

export function compareReceiptRiskDrivers(input: {
  savedSnapshot: normalized_account_snapshot;
  currentSnapshot?: normalized_account_snapshot | null;
}): receipt_risk_driver_comparison {
  const savedDrivers = buildPositionRiskDrivers(input.savedSnapshot);

  if (!input.currentSnapshot) {
    const label = "no_live_snapshot";

    return {
      label,
      severity: getSeverity(label),
      headline: getHeadline(label),
      summary: getSummary({
        label,
        savedTopDriverMarket: savedDrivers.top_driver_position?.market ?? null,
        currentTopDriverMarket: null,
        topDriverScoreDelta: null,
      }),
      account_matches: false,
      changed_position_count: 0,
      saved_drivers: savedDrivers,
      current_drivers: null,
      saved_top_driver_market: savedDrivers.top_driver_position?.market ?? null,
      current_top_driver_market: null,
      saved_top_primary_driver:
        savedDrivers.top_driver_position?.primary_driver ?? null,
      current_top_primary_driver: null,
      top_driver_score_delta: null,
      gross_exposure_delta_bps: null,
      largest_position_share_delta_bps: null,
      net_directional_notional_delta_usd: null,
      closest_liquidation_distance_delta_bps: null,
      daily_funding_delta_usd: null,
      market_changes: [],
      review_points: getReviewPoints({
        label,
        changedPositionCount: 0,
        savedTopDriverMarket: savedDrivers.top_driver_position?.market ?? null,
        currentTopDriverMarket: null,
        savedTopPrimaryDriver:
          savedDrivers.top_driver_position?.primary_driver ?? null,
        currentTopPrimaryDriver: null,
        topDriverScoreDelta: null,
        grossExposureDeltaBps: null,
        closestLiquidationDistanceDeltaBps: null,
        dailyFundingDeltaUsd: null,
      }),
    };
  }

  const currentDrivers = buildPositionRiskDrivers(input.currentSnapshot);
  const marketChanges = getMarketChanges({
    savedSnapshot: input.savedSnapshot,
    currentSnapshot: input.currentSnapshot,
    savedDrivers,
    currentDrivers,
  });
  const changedPositionCount = marketChanges.filter(
    (marketChange) => marketChange.status !== "same_position",
  ).length;
  const accountMatches =
    input.savedSnapshot.account.toLowerCase() ===
    input.currentSnapshot.account.toLowerCase();
  const savedTopDriverMarket =
    savedDrivers.top_driver_position?.market ?? null;
  const currentTopDriverMarket =
    currentDrivers.top_driver_position?.market ?? null;
  const savedTopPrimaryDriver =
    savedDrivers.top_driver_position?.primary_driver ?? null;
  const currentTopPrimaryDriver =
    currentDrivers.top_driver_position?.primary_driver ?? null;
  const topDriverScoreDelta = subtractNullableNumbers(
    savedDrivers.top_driver_position?.driver_score,
    currentDrivers.top_driver_position?.driver_score,
  );
  const grossExposureDeltaBps = subtractNullableNumbers(
    savedDrivers.gross_notional_to_account_value_bps,
    currentDrivers.gross_notional_to_account_value_bps,
  );
  const largestPositionShareDeltaBps = subtractNullableNumbers(
    savedDrivers.largest_notional_share_bps,
    currentDrivers.largest_notional_share_bps,
  );
  const netDirectionalNotionalDeltaUsd = round(
    currentDrivers.net_directional_notional_usd -
      savedDrivers.net_directional_notional_usd,
  );
  const closestLiquidationDistanceDeltaBps = subtractNullableNumbers(
    savedDrivers.top_liquidation_position?.liquidation_distance_bps,
    currentDrivers.top_liquidation_position?.liquidation_distance_bps,
  );
  const dailyFundingDeltaUsd = subtractNullableNumbers(
    input.savedSnapshot.aggregate.daily_funding_usd,
    input.currentSnapshot.aggregate.daily_funding_usd,
  );
  const label = getComparisonLabel({
    accountMatches,
    changedPositionCount,
    savedDrivers,
    currentDrivers,
    topDriverScoreDelta,
    closestLiquidationDistanceDeltaBps,
    dailyFundingDeltaUsd,
  });

  return {
    label,
    severity: getSeverity(label),
    headline: getHeadline(label),
    summary: getSummary({
      label,
      savedTopDriverMarket,
      currentTopDriverMarket,
      topDriverScoreDelta,
    }),
    account_matches: accountMatches,
    changed_position_count: changedPositionCount,
    saved_drivers: savedDrivers,
    current_drivers: currentDrivers,
    saved_top_driver_market: savedTopDriverMarket,
    current_top_driver_market: currentTopDriverMarket,
    saved_top_primary_driver: savedTopPrimaryDriver,
    current_top_primary_driver: currentTopPrimaryDriver,
    top_driver_score_delta: topDriverScoreDelta,
    gross_exposure_delta_bps: grossExposureDeltaBps,
    largest_position_share_delta_bps: largestPositionShareDeltaBps,
    net_directional_notional_delta_usd: netDirectionalNotionalDeltaUsd,
    closest_liquidation_distance_delta_bps:
      closestLiquidationDistanceDeltaBps,
    daily_funding_delta_usd: dailyFundingDeltaUsd,
    market_changes: marketChanges,
    review_points: getReviewPoints({
      label,
      changedPositionCount,
      savedTopDriverMarket,
      currentTopDriverMarket,
      savedTopPrimaryDriver,
      currentTopPrimaryDriver,
      topDriverScoreDelta,
      grossExposureDeltaBps,
      closestLiquidationDistanceDeltaBps,
      dailyFundingDeltaUsd,
    }),
  };
}
