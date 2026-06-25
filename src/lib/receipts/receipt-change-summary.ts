import type { market_context } from "../market/market-context.ts";
import type { receipt_account_value_context } from "../history/receipt-account-value-context.ts";
import type {
  metric_comparison,
  snapshot_comparison,
} from "./snapshot-comparison.ts";

export type receipt_change_summary_label =
  | "account_mismatch"
  | "position_changed"
  | "liquidation_watch"
  | "risk_worsened"
  | "risk_improved"
  | "account_history_watch"
  | "funding_watch"
  | "market_moved"
  | "little_changed";

export type receipt_change_summary_severity =
  | "critical"
  | "changed"
  | "watch"
  | "neutral";

export type receipt_change_summary = {
  label: receipt_change_summary_label;
  severity: receipt_change_summary_severity;
  headline: string;
  primary_detail: string;
  review_points: string[];
};

const MATERIAL_FUNDING_DELTA_USD = 1;

function formatSignedNumber(value: number) {
  if (value === 0) {
    return "0";
  }

  return `${value > 0 ? "+" : "-"}${Math.abs(value).toFixed(2)}`;
}

function formatSignedUsd(value: number) {
  return `${formatSignedNumber(value)} USD`;
}

function formatPercentFromBps(value: number) {
  return `${(value / 100).toFixed(2)}%`;
}

function formatMetricMove(
  metric: metric_comparison,
  formatter: (value: number) => string,
) {
  if (metric.receipt_value === null || metric.current_value === null) {
    return null;
  }

  return `${formatter(metric.receipt_value)} to ${formatter(metric.current_value)}`;
}

function getLabel(input: {
  comparison: snapshot_comparison;
  marketContext: market_context;
  accountValueContext: receipt_account_value_context | null;
}): receipt_change_summary_label {
  if (!input.comparison.account_matches) {
    return "account_mismatch";
  }

  if (input.comparison.changed_position_count > 0) {
    return "position_changed";
  }

  if (
    input.marketContext.label === "through_liquidation" ||
    input.marketContext.label === "toward_liquidation"
  ) {
    return "liquidation_watch";
  }

  if (input.comparison.status === "risk_worsened") {
    return "risk_worsened";
  }

  if (input.comparison.status === "risk_improved") {
    return "risk_improved";
  }

  if (
    input.accountValueContext?.label === "in_drawdown" ||
    input.accountValueContext?.label === "latest_lower" ||
    input.accountValueContext?.label === "latest_higher" ||
    input.accountValueContext?.label === "sample_gap_watch"
  ) {
    return "account_history_watch";
  }

  if (
    input.marketContext.label === "funding_more_expensive" ||
    input.marketContext.label === "funding_more_favorable"
  ) {
    return "funding_watch";
  }

  if (
    input.comparison.status === "market_moved" ||
    input.marketContext.label === "market_moved"
  ) {
    return "market_moved";
  }

  return "little_changed";
}

function getSeverity(
  label: receipt_change_summary_label,
): receipt_change_summary_severity {
  switch (label) {
    case "account_mismatch":
    case "liquidation_watch":
    case "risk_worsened":
      return "critical";
    case "position_changed":
    case "account_history_watch":
      return "changed";
    case "risk_improved":
    case "funding_watch":
    case "market_moved":
      return "watch";
    case "little_changed":
      return "neutral";
  }
}

function getHeadline(label: receipt_change_summary_label) {
  switch (label) {
    case "account_mismatch":
      return "This live account does not match the saved receipt.";
    case "position_changed":
      return "The account changed positions after the receipt.";
    case "liquidation_watch":
      return "A comparable position needs liquidation-buffer review.";
    case "risk_worsened":
      return "The live recheck is materially riskier than the receipt.";
    case "risk_improved":
      return "The live recheck is materially less risky than the receipt.";
    case "account_history_watch":
      return "Sampled account-value history changes how this receipt reads.";
    case "funding_watch":
      return "Funding carry changed since the receipt.";
    case "market_moved":
      return "The market moved since the receipt.";
    case "little_changed":
      return "The receipt and live context are close.";
  }
}

function getPrimaryDetail(input: {
  label: receipt_change_summary_label;
  comparison: snapshot_comparison;
  marketContext: market_context;
  accountValueContext: receipt_account_value_context | null;
}) {
  switch (input.label) {
    case "account_mismatch":
      return "Use the saved hash as a historical receipt only; the live account response is not comparable.";
    case "position_changed":
      return `${input.comparison.changed_position_count} position state change(s) make this receipt a historical snapshot, not a current-position view.`;
    case "liquidation_watch":
      return input.marketContext.most_relevant_position
        ? `${input.marketContext.most_relevant_position.market} is the focus market in the live market context.`
        : input.marketContext.headline;
    case "risk_worsened": {
      const riskMove = formatMetricMove(
        input.comparison.metrics.risk_score,
        (value) => value.toFixed(0),
      );

      return riskMove
        ? `Risk score moved ${riskMove} on the live recheck.`
        : input.comparison.headline;
    }
    case "risk_improved": {
      const riskMove = formatMetricMove(
        input.comparison.metrics.risk_score,
        (value) => value.toFixed(0),
      );

      return riskMove
        ? `Risk score moved ${riskMove} on the live recheck.`
        : input.comparison.headline;
    }
    case "account_history_watch":
      return input.accountValueContext?.headline ?? "Account-value history is unavailable for this receipt.";
    case "funding_watch":
      return input.marketContext.total_daily_funding_delta_usd === null
        ? input.marketContext.headline
        : `Daily funding estimate changed by ${formatSignedUsd(
            input.marketContext.total_daily_funding_delta_usd,
          )}.`;
    case "market_moved":
      return `Largest comparable mark move is ${input.comparison.max_abs_mark_price_change_percent.toFixed(2)}%.`;
    case "little_changed":
      return "Hash verification, live recheck, and market context do not show a material change by current app thresholds.";
  }
}

function appendIfPresent(points: string[], point: string | null) {
  if (point) {
    points.push(point);
  }
}

function getReviewPoints(input: {
  comparison: snapshot_comparison;
  marketContext: market_context;
  accountValueContext: receipt_account_value_context | null;
}) {
  const points: string[] = [];

  if (!input.comparison.account_matches) {
    points.push("Account mismatch: verify that the live lookup address matches the receipt account.");
  }

  if (input.comparison.changed_position_count > 0) {
    points.push(
      `${input.comparison.changed_position_count} position state change(s) since the receipt.`,
    );
  }

  appendIfPresent(
    points,
    formatMetricMove(
      input.comparison.metrics.min_liquidation_distance_bps,
      formatPercentFromBps,
    )?.replace(/^/, "Minimum listed liquidation distance moved ") ?? null,
  );

  if (
    input.marketContext.total_daily_funding_delta_usd !== null &&
    Math.abs(input.marketContext.total_daily_funding_delta_usd) >=
      MATERIAL_FUNDING_DELTA_USD
  ) {
    points.push(
      `Daily funding estimate changed by ${formatSignedUsd(
        input.marketContext.total_daily_funding_delta_usd,
      )}.`,
    );
  }

  if (input.comparison.max_abs_mark_price_change_percent > 0) {
    points.push(
      `Largest comparable mark move is ${input.comparison.max_abs_mark_price_change_percent.toFixed(2)}%.`,
    );
  }

  if (input.accountValueContext) {
    points.push(input.accountValueContext.headline);
  }

  if (points.length === 0) {
    points.push("No material receipt-vs-live differences crossed the current app thresholds.");
  }

  return points.slice(0, 5);
}

export function buildReceiptChangeSummary(input: {
  comparison: snapshot_comparison;
  marketContext: market_context;
  accountValueContext?: receipt_account_value_context | null;
}): receipt_change_summary {
  const accountValueContext = input.accountValueContext ?? null;
  const label = getLabel({
    comparison: input.comparison,
    marketContext: input.marketContext,
    accountValueContext,
  });

  return {
    label,
    severity: getSeverity(label),
    headline: getHeadline(label),
    primary_detail: getPrimaryDetail({
      label,
      comparison: input.comparison,
      marketContext: input.marketContext,
      accountValueContext,
    }),
    review_points: getReviewPoints({
      comparison: input.comparison,
      marketContext: input.marketContext,
      accountValueContext,
    }),
  };
}
