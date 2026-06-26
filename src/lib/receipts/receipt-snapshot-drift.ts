import type { market_context } from "../market/market-context.ts";
import type { receipt_recheck_watchlist } from "./receipt-recheck-watchlist.ts";
import type { snapshot_comparison } from "./snapshot-comparison.ts";

export type receipt_snapshot_drift_label =
  | "not_comparable"
  | "stale_snapshot"
  | "drift_watch"
  | "close_snapshot";

export type receipt_snapshot_drift_severity =
  | "critical"
  | "watch"
  | "neutral";

export type receipt_snapshot_drift = {
  label: receipt_snapshot_drift_label;
  severity: receipt_snapshot_drift_severity;
  headline: string;
  summary: string;
  age_minutes: number | null;
  drift_score: number;
  focus_market: string | null;
  metrics: {
    current_min_liquidation_distance_bps: number | null;
    high_cue_count: number;
    max_mark_move_percent: number;
    total_daily_funding_delta_usd: number | null;
    watch_cue_count: number;
  };
  review_points: string[];
};

const WATCH_AGE_MINUTES = 4 * 60;
const STALE_AGE_MINUTES = 24 * 60;
const WATCH_MARK_MOVE_PERCENT = 2;
const STALE_MARK_MOVE_PERCENT = 5;
const WATCH_DAILY_FUNDING_DELTA_USD = 1;

export function buildReceiptSnapshotDrift(input: {
  comparison: snapshot_comparison;
  currentDataTimeIso: string;
  marketContext: market_context;
  receiptDataTimeIso: string;
  watchlist: receipt_recheck_watchlist;
}): receipt_snapshot_drift {
  const ageMinutes = getAgeMinutes({
    currentDataTimeIso: input.currentDataTimeIso,
    receiptDataTimeIso: input.receiptDataTimeIso,
  });
  const metrics = {
    current_min_liquidation_distance_bps:
      input.comparison.metrics.min_liquidation_distance_bps.current_value,
    high_cue_count: input.watchlist.high_count,
    max_mark_move_percent: input.comparison.max_abs_mark_price_change_percent,
    total_daily_funding_delta_usd:
      input.marketContext.total_daily_funding_delta_usd,
    watch_cue_count: input.watchlist.watch_count,
  };
  const driftScore = getDriftScore({ ageMinutes, input, metrics });
  const label = getLabel({ ageMinutes, driftScore, input, metrics });

  return {
    label,
    severity: getSeverity(label),
    headline: getHeadline(label),
    summary: getSummary({ ageMinutes, label, metrics }),
    age_minutes: ageMinutes,
    drift_score: driftScore,
    focus_market: getFocusMarket(input.marketContext),
    metrics,
    review_points: getReviewPoints({ ageMinutes, input, metrics }),
  };
}

function getAgeMinutes(input: {
  currentDataTimeIso: string;
  receiptDataTimeIso: string;
}) {
  const currentTimeMs = Date.parse(input.currentDataTimeIso);
  const receiptTimeMs = Date.parse(input.receiptDataTimeIso);

  if (!Number.isFinite(currentTimeMs) || !Number.isFinite(receiptTimeMs)) {
    return null;
  }

  return Math.max(0, Math.round((currentTimeMs - receiptTimeMs) / 60_000));
}

function getLabel(input: {
  ageMinutes: number | null;
  driftScore: number;
  input: {
    comparison: snapshot_comparison;
    marketContext: market_context;
    watchlist: receipt_recheck_watchlist;
  };
  metrics: receipt_snapshot_drift["metrics"];
}): receipt_snapshot_drift_label {
  if (
    !input.input.comparison.account_matches ||
    input.input.comparison.changed_position_count > 0
  ) {
    return "not_comparable";
  }

  if (
    input.input.marketContext.label === "through_liquidation" ||
    input.input.marketContext.label === "toward_liquidation" ||
    input.metrics.high_cue_count > 0 ||
    input.metrics.max_mark_move_percent >= STALE_MARK_MOVE_PERCENT ||
    isThinCurrentBuffer(input.input, input.metrics) ||
    (input.ageMinutes !== null && input.ageMinutes >= STALE_AGE_MINUTES) ||
    input.driftScore >= 70
  ) {
    return "stale_snapshot";
  }

  if (
    input.metrics.watch_cue_count > 0 ||
    input.input.marketContext.label === "market_moved" ||
    input.input.marketContext.label === "funding_more_expensive" ||
    input.input.marketContext.label === "funding_more_favorable" ||
    input.metrics.max_mark_move_percent >= WATCH_MARK_MOVE_PERCENT ||
    Math.abs(input.metrics.total_daily_funding_delta_usd ?? 0) >=
      WATCH_DAILY_FUNDING_DELTA_USD ||
    (input.ageMinutes !== null && input.ageMinutes >= WATCH_AGE_MINUTES) ||
    input.driftScore >= 35
  ) {
    return "drift_watch";
  }

  return "close_snapshot";
}

function getDriftScore(input: {
  ageMinutes: number | null;
  input: {
    comparison: snapshot_comparison;
    marketContext: market_context;
    watchlist: receipt_recheck_watchlist;
  };
  metrics: receipt_snapshot_drift["metrics"];
}) {
  if (
    !input.input.comparison.account_matches ||
    input.input.comparison.changed_position_count > 0
  ) {
    return 100;
  }

  const ageScore =
    input.ageMinutes === null
      ? 0
      : Math.min(20, (input.ageMinutes / STALE_AGE_MINUTES) * 20);
  const markMoveScore = Math.min(
    30,
    (input.metrics.max_mark_move_percent / 10) * 30,
  );
  const bufferScore = getBufferScore(input.input, input.metrics);
  const fundingScore = Math.min(
    15,
    Math.abs(input.metrics.total_daily_funding_delta_usd ?? 0) * 2,
  );
  const cueScore = Math.min(
    25,
    input.metrics.high_cue_count * 15 + input.metrics.watch_cue_count * 7,
  );

  return round(Math.min(100, ageScore + markMoveScore + bufferScore + fundingScore + cueScore));
}

function getBufferScore(
  input: { watchlist: receipt_recheck_watchlist },
  metrics: receipt_snapshot_drift["metrics"],
) {
  const currentBufferBps = metrics.current_min_liquidation_distance_bps;

  if (currentBufferBps === null) {
    return 0;
  }

  if (currentBufferBps <= 0) {
    return 35;
  }

  if (currentBufferBps <= input.watchlist.thresholds.thin_liquidation_distance_bps) {
    return 30;
  }

  if (currentBufferBps <= input.watchlist.thresholds.tight_liquidation_distance_bps) {
    return 18;
  }

  return 0;
}

function isThinCurrentBuffer(
  input: { watchlist: receipt_recheck_watchlist },
  metrics: receipt_snapshot_drift["metrics"],
) {
  return (
    metrics.current_min_liquidation_distance_bps !== null &&
    metrics.current_min_liquidation_distance_bps <=
      input.watchlist.thresholds.thin_liquidation_distance_bps
  );
}

function getSeverity(
  label: receipt_snapshot_drift_label,
): receipt_snapshot_drift_severity {
  switch (label) {
    case "not_comparable":
    case "stale_snapshot":
      return "critical";
    case "drift_watch":
      return "watch";
    case "close_snapshot":
      return "neutral";
  }
}

function getHeadline(label: receipt_snapshot_drift_label) {
  switch (label) {
    case "not_comparable":
      return "This receipt is historical, not directly comparable.";
    case "stale_snapshot":
      return "The saved snapshot is stale versus current market context.";
    case "drift_watch":
      return "The saved snapshot has meaningful market drift.";
    case "close_snapshot":
      return "The saved snapshot is still close to the live recheck.";
  }
}

function getSummary(input: {
  ageMinutes: number | null;
  label: receipt_snapshot_drift_label;
  metrics: receipt_snapshot_drift["metrics"];
}) {
  const age = formatAge(input.ageMinutes);
  const markMove = `${input.metrics.max_mark_move_percent.toFixed(2)}%`;
  const fundingDelta =
    input.metrics.total_daily_funding_delta_usd === null
      ? "n/a"
      : `${formatSignedNumber(input.metrics.total_daily_funding_delta_usd)} USD/day`;
  const cues = `${input.metrics.high_cue_count} high and ${input.metrics.watch_cue_count} watch cue(s)`;

  switch (input.label) {
    case "not_comparable":
      return `The receipt age is ${age}, but position/account state changed, so market drift should be read as historical context.`;
    case "stale_snapshot":
      return `The receipt age is ${age}; max mark move is ${markMove}, funding delta is ${fundingDelta}, and ${cues} crossed review thresholds.`;
    case "drift_watch":
      return `The receipt age is ${age}; current market context moved enough to review before treating the snapshot as current.`;
    case "close_snapshot":
      return `The receipt age is ${age}; mark, funding, and listed-buffer context remain close by current app thresholds.`;
  }
}

function getReviewPoints(input: {
  ageMinutes: number | null;
  input: {
    comparison: snapshot_comparison;
    marketContext: market_context;
    watchlist: receipt_recheck_watchlist;
  };
  metrics: receipt_snapshot_drift["metrics"];
}) {
  const points: string[] = [
    `Receipt age at recheck: ${formatAge(input.ageMinutes)}.`,
    `Largest comparable mark move: ${input.metrics.max_mark_move_percent.toFixed(2)}%.`,
  ];

  if (!input.input.comparison.account_matches) {
    points.push("Live account mismatch means the receipt cannot be read as current account risk.");
  }

  if (input.input.comparison.changed_position_count > 0) {
    points.push(
      `${input.input.comparison.changed_position_count} position state change(s) make same-position drift unavailable for those rows.`,
    );
  }

  if (input.metrics.current_min_liquidation_distance_bps !== null) {
    points.push(
      `Current minimum listed liquidation distance: ${formatBpsAsPercent(
        input.metrics.current_min_liquidation_distance_bps,
      )}.`,
    );
  }

  if (input.metrics.total_daily_funding_delta_usd !== null) {
    points.push(
      `Daily funding estimate delta: ${formatSignedNumber(
        input.metrics.total_daily_funding_delta_usd,
      )} USD/day.`,
    );
  }

  points.push(
    `Recheck watchlist counts: ${input.metrics.high_cue_count} high and ${input.metrics.watch_cue_count} watch cue(s).`,
  );

  if (input.input.marketContext.most_relevant_position) {
    points.push(
      `Focus market: ${input.input.marketContext.most_relevant_position.market}.`,
    );
  }

  return points;
}

function getFocusMarket(marketContext: market_context) {
  return marketContext.most_relevant_position?.market ?? null;
}

function formatAge(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  if (value < 60) {
    return `${value}m`;
  }

  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

function formatBpsAsPercent(value: number) {
  return `${(value / 100).toFixed(2)}%`;
}

function formatSignedNumber(value: number) {
  if (value === 0) {
    return "0.00";
  }

  return `${value > 0 ? "+" : "-"}${Math.abs(value).toFixed(2)}`;
}

function round(value: number, decimals = 2) {
  const multiplier = 10 ** decimals;

  return Math.round(value * multiplier) / multiplier;
}
