import type {
  account_value_history_point,
  account_value_timeline,
} from "./account-value-timeline.ts";

export type receipt_account_value_context_label =
  | "no_history"
  | "sample_gap_watch"
  | "near_peak"
  | "in_drawdown"
  | "latest_higher"
  | "latest_lower"
  | "little_changed";

export type receipt_account_value_context = {
  label: receipt_account_value_context_label;
  headline: string;
  selected_timeline: account_value_timeline | null;
  receipt_time_ms: number | null;
  nearest_point: account_value_history_point | null;
  nearest_sample_gap_minutes: number | null;
  receipt_vs_nearest_sample_usd: number | null;
  receipt_vs_nearest_sample_percent: number | null;
  latest_vs_receipt_usd: number | null;
  latest_vs_receipt_percent: number | null;
  receipt_drawdown_percent: number | null;
  current_drawdown_percent: number | null;
  max_drawdown_percent: number | null;
};

type nearest_account_value_point = {
  point: account_value_history_point;
  index: number;
  gapMs: number;
};

const PREFERRED_ACCOUNT_VALUE_WINDOWS = [
  "perpDay",
  "perpWeek",
  "perpMonth",
  "perpAllTime",
  "day",
  "week",
  "month",
  "allTime",
];
const MATERIAL_ACCOUNT_VALUE_CHANGE_PERCENT = 2;
const MEANINGFUL_DRAWDOWN_PERCENT = 10;
const NEAR_PEAK_DRAWDOWN_PERCENT = 2;
const SAMPLE_GAP_WATCH_MINUTES = 60;

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function roundPercent(value: number) {
  return Math.round(value * 100) / 100;
}

function getWindowOrder(windowId: string) {
  const preferredIndex = PREFERRED_ACCOUNT_VALUE_WINDOWS.indexOf(windowId);

  return preferredIndex === -1
    ? PREFERRED_ACCOUNT_VALUE_WINDOWS.length
    : preferredIndex;
}

function selectTimeline(timelines: account_value_timeline[]) {
  return (
    timelines
      .filter((timeline) => timeline.point_count > 0)
      .slice()
      .sort(
        (leftTimeline, rightTimeline) =>
          getWindowOrder(leftTimeline.window_id) -
            getWindowOrder(rightTimeline.window_id) ||
          leftTimeline.window_id.localeCompare(rightTimeline.window_id),
      )[0] ?? null
  );
}

function getChangePercent(input: {
  fromAccountValueUsd: number;
  toAccountValueUsd: number;
}) {
  if (input.fromAccountValueUsd <= 0) {
    return null;
  }

  return roundPercent(
    ((input.toAccountValueUsd - input.fromAccountValueUsd) /
      input.fromAccountValueUsd) *
      100,
  );
}

function getNearestPoint(input: {
  points: account_value_history_point[];
  receiptTimeMs: number;
}): nearest_account_value_point | null {
  let nearest: nearest_account_value_point | null = null;

  for (const [index, point] of input.points.entries()) {
    const gapMs = Math.abs(point.time_ms - input.receiptTimeMs);

    if (!nearest || gapMs < nearest.gapMs) {
      nearest = { point, index, gapMs };
    }
  }

  return nearest;
}

function getDrawdownAtPoint(input: {
  points: account_value_history_point[];
  pointIndex: number;
}) {
  let peakAccountValueUsd = input.points[0]?.account_value_usd ?? null;

  for (let index = 0; index <= input.pointIndex; index += 1) {
    const point = input.points[index];

    if (!point) {
      continue;
    }

    if (
      peakAccountValueUsd === null ||
      point.account_value_usd > peakAccountValueUsd
    ) {
      peakAccountValueUsd = point.account_value_usd;
    }
  }

  const currentPoint = input.points[input.pointIndex] ?? null;

  if (!currentPoint || peakAccountValueUsd === null || peakAccountValueUsd <= 0) {
    return null;
  }

  return roundPercent(
    Math.max(
      ((peakAccountValueUsd - currentPoint.account_value_usd) /
        peakAccountValueUsd) *
        100,
      0,
    ),
  );
}

function getLabel(input: {
  selectedTimeline: account_value_timeline | null;
  nearestPoint: account_value_history_point | null;
  nearestSampleGapMinutes: number | null;
  receiptDrawdownPercent: number | null;
  latestVsReceiptPercent: number | null;
}): receipt_account_value_context_label {
  if (!input.selectedTimeline || !input.nearestPoint) {
    return "no_history";
  }

  if (
    input.nearestSampleGapMinutes !== null &&
    input.nearestSampleGapMinutes > SAMPLE_GAP_WATCH_MINUTES
  ) {
    return "sample_gap_watch";
  }

  if (
    input.receiptDrawdownPercent !== null &&
    input.receiptDrawdownPercent >= MEANINGFUL_DRAWDOWN_PERCENT
  ) {
    return "in_drawdown";
  }

  if (
    input.latestVsReceiptPercent !== null &&
    input.latestVsReceiptPercent >= MATERIAL_ACCOUNT_VALUE_CHANGE_PERCENT
  ) {
    return "latest_higher";
  }

  if (
    input.latestVsReceiptPercent !== null &&
    input.latestVsReceiptPercent <= -MATERIAL_ACCOUNT_VALUE_CHANGE_PERCENT
  ) {
    return "latest_lower";
  }

  if (
    input.receiptDrawdownPercent !== null &&
    input.receiptDrawdownPercent <= NEAR_PEAK_DRAWDOWN_PERCENT
  ) {
    return "near_peak";
  }

  return "little_changed";
}

function getHeadline(label: receipt_account_value_context_label) {
  switch (label) {
    case "no_history":
      return "No portfolio history could be matched to this receipt.";
    case "sample_gap_watch":
      return "The nearest portfolio sample is far from the receipt timestamp.";
    case "near_peak":
      return "The receipt was near a sampled account-value high in this window.";
    case "in_drawdown":
      return "The receipt was captured during a meaningful sampled drawdown.";
    case "latest_higher":
      return "Latest sampled account value is materially higher than the receipt value.";
    case "latest_lower":
      return "Latest sampled account value is materially lower than the receipt value.";
    case "little_changed":
      return "Latest sampled account value is close to the receipt value.";
  }
}

export function buildReceiptAccountValueContext(input: {
  receipt_data_time_iso: string;
  receipt_account_value_usd: number;
  timelines: account_value_timeline[];
}): receipt_account_value_context {
  const receiptTimeMs = Date.parse(input.receipt_data_time_iso);
  const selectedTimeline = Number.isFinite(receiptTimeMs)
    ? selectTimeline(input.timelines)
    : null;
  const nearestPoint =
    selectedTimeline && Number.isFinite(receiptTimeMs)
      ? getNearestPoint({
          points: selectedTimeline.points,
          receiptTimeMs,
        })
      : null;
  const nearestSampleGapMinutes = nearestPoint
    ? Math.round(nearestPoint.gapMs / 60_000)
    : null;
  const receiptVsNearestSampleUsd = nearestPoint
    ? roundCurrency(
        input.receipt_account_value_usd -
          nearestPoint.point.account_value_usd,
      )
    : null;
  const receiptVsNearestSamplePercent = nearestPoint
    ? getChangePercent({
        fromAccountValueUsd: nearestPoint.point.account_value_usd,
        toAccountValueUsd: input.receipt_account_value_usd,
      })
    : null;
  const latestPoint = selectedTimeline?.latest_point ?? null;
  const latestVsReceiptUsd = latestPoint
    ? roundCurrency(
        latestPoint.account_value_usd - input.receipt_account_value_usd,
      )
    : null;
  const latestVsReceiptPercent = latestPoint
    ? getChangePercent({
        fromAccountValueUsd: input.receipt_account_value_usd,
        toAccountValueUsd: latestPoint.account_value_usd,
      })
    : null;
  const receiptDrawdownPercent =
    selectedTimeline && nearestPoint
      ? getDrawdownAtPoint({
          points: selectedTimeline.points,
          pointIndex: nearestPoint.index,
        })
      : null;
  const label = getLabel({
    selectedTimeline,
    nearestPoint: nearestPoint?.point ?? null,
    nearestSampleGapMinutes,
    receiptDrawdownPercent,
    latestVsReceiptPercent,
  });

  return {
    label,
    headline: getHeadline(label),
    selected_timeline: selectedTimeline,
    receipt_time_ms: Number.isFinite(receiptTimeMs) ? receiptTimeMs : null,
    nearest_point: nearestPoint?.point ?? null,
    nearest_sample_gap_minutes: nearestSampleGapMinutes,
    receipt_vs_nearest_sample_usd: receiptVsNearestSampleUsd,
    receipt_vs_nearest_sample_percent: receiptVsNearestSamplePercent,
    latest_vs_receipt_usd: latestVsReceiptUsd,
    latest_vs_receipt_percent: latestVsReceiptPercent,
    receipt_drawdown_percent: receiptDrawdownPercent,
    current_drawdown_percent: selectedTimeline?.current_drawdown_percent ?? null,
    max_drawdown_percent: selectedTimeline?.max_drawdown_percent ?? null,
  };
}
