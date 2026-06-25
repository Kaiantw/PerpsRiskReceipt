export type account_value_history_point = {
  time_ms: number;
  account_value_usd: number;
  pnl_usd?: number | null;
};

export type account_value_timeline_label =
  | "no_history"
  | "single_point"
  | "higher"
  | "lower"
  | "flat"
  | "drawdown_watch";

export type account_value_timeline = {
  window_id: string;
  points: account_value_history_point[];
  point_count: number;
  first_point: account_value_history_point | null;
  latest_point: account_value_history_point | null;
  peak_account_value_usd: number | null;
  account_value_change_usd: number | null;
  account_value_change_percent: number | null;
  current_drawdown_percent: number | null;
  max_drawdown_percent: number | null;
  volume_usd: number | null;
  label: account_value_timeline_label;
  headline: string;
};

const MATERIAL_ACCOUNT_VALUE_CHANGE_PERCENT = 2;
const DRAWDOWN_WATCH_PERCENT = 10;

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function roundPercent(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizePoints(points: account_value_history_point[]) {
  const pointsByTime = new Map<number, account_value_history_point>();

  points.forEach((point) => {
    if (
      Number.isFinite(point.time_ms) &&
      Number.isFinite(point.account_value_usd)
    ) {
      pointsByTime.set(point.time_ms, point);
    }
  });

  return Array.from(pointsByTime.values()).sort(
    (leftPoint, rightPoint) => leftPoint.time_ms - rightPoint.time_ms,
  );
}

function getChangePercent(input: {
  firstAccountValueUsd: number;
  latestAccountValueUsd: number;
}) {
  if (input.firstAccountValueUsd <= 0) {
    return null;
  }

  return roundPercent(
    ((input.latestAccountValueUsd - input.firstAccountValueUsd) /
      input.firstAccountValueUsd) *
      100,
  );
}

function getDrawdownStats(points: account_value_history_point[]) {
  let peakAccountValueUsd = points[0]?.account_value_usd ?? null;
  let maxDrawdownPercent = 0;
  let currentDrawdownPercent = 0;

  points.forEach((point) => {
    if (
      peakAccountValueUsd === null ||
      point.account_value_usd > peakAccountValueUsd
    ) {
      peakAccountValueUsd = point.account_value_usd;
    }

    if (peakAccountValueUsd > 0) {
      const drawdownPercent =
        ((peakAccountValueUsd - point.account_value_usd) /
          peakAccountValueUsd) *
        100;

      currentDrawdownPercent = Math.max(drawdownPercent, 0);
      maxDrawdownPercent = Math.max(maxDrawdownPercent, currentDrawdownPercent);
    }
  });

  return {
    peak_account_value_usd:
      peakAccountValueUsd === null ? null : roundCurrency(peakAccountValueUsd),
    current_drawdown_percent: roundPercent(currentDrawdownPercent),
    max_drawdown_percent: roundPercent(maxDrawdownPercent),
  };
}

function getTimelineLabel(input: {
  pointCount: number;
  accountValueChangePercent: number | null;
  maxDrawdownPercent: number | null;
}): account_value_timeline_label {
  if (input.pointCount === 0) {
    return "no_history";
  }

  if (input.pointCount === 1) {
    return "single_point";
  }

  if ((input.maxDrawdownPercent ?? 0) >= DRAWDOWN_WATCH_PERCENT) {
    return "drawdown_watch";
  }

  if (
    input.accountValueChangePercent !== null &&
    input.accountValueChangePercent >= MATERIAL_ACCOUNT_VALUE_CHANGE_PERCENT
  ) {
    return "higher";
  }

  if (
    input.accountValueChangePercent !== null &&
    input.accountValueChangePercent <= -MATERIAL_ACCOUNT_VALUE_CHANGE_PERCENT
  ) {
    return "lower";
  }

  return "flat";
}

function getHeadline(label: account_value_timeline_label) {
  switch (label) {
    case "no_history":
      return "No account value history returned for this window.";
    case "single_point":
      return "Only one account value point is available for this window.";
    case "drawdown_watch":
      return "Account value has a meaningful peak-to-trough drawdown in this window.";
    case "higher":
      return "Account value is higher over this history window.";
    case "lower":
      return "Account value is lower over this history window.";
    case "flat":
      return "Account value is nearly flat over this history window.";
  }
}

export function buildAccountValueTimeline(input: {
  window_id: string;
  points: account_value_history_point[];
  volume_usd?: number | null;
}): account_value_timeline {
  const points = normalizePoints(input.points);
  const firstPoint = points[0] ?? null;
  const latestPoint = points.at(-1) ?? null;
  const accountValueChangeUsd =
    firstPoint && latestPoint
      ? roundCurrency(
          latestPoint.account_value_usd - firstPoint.account_value_usd,
        )
      : null;
  const accountValueChangePercent =
    firstPoint && latestPoint
      ? getChangePercent({
          firstAccountValueUsd: firstPoint.account_value_usd,
          latestAccountValueUsd: latestPoint.account_value_usd,
        })
      : null;
  const drawdownStats =
    points.length > 0
      ? getDrawdownStats(points)
      : {
          peak_account_value_usd: null,
          current_drawdown_percent: null,
          max_drawdown_percent: null,
        };
  const label = getTimelineLabel({
    pointCount: points.length,
    accountValueChangePercent,
    maxDrawdownPercent: drawdownStats.max_drawdown_percent,
  });

  return {
    window_id: input.window_id,
    points,
    point_count: points.length,
    first_point: firstPoint,
    latest_point: latestPoint,
    peak_account_value_usd: drawdownStats.peak_account_value_usd,
    account_value_change_usd: accountValueChangeUsd,
    account_value_change_percent: accountValueChangePercent,
    current_drawdown_percent: drawdownStats.current_drawdown_percent,
    max_drawdown_percent: drawdownStats.max_drawdown_percent,
    volume_usd: input.volume_usd ?? null,
    label,
    headline: getHeadline(label),
  };
}
