import type { receipt_account_value_context } from "../history/receipt-account-value-context.ts";
import type { market_context } from "../market/market-context.ts";
import type { receipt_risk_driver_comparison } from "./receipt-risk-driver-comparison.ts";
import type { receipt_recheck_watchlist } from "./receipt-recheck-watchlist.ts";
import type { receipt_volatility_buffer } from "./receipt-volatility-buffer.ts";
import type { snapshot_comparison } from "./snapshot-comparison.ts";

export type receipt_market_regime_label =
  | "not_comparable"
  | "calm"
  | "active"
  | "stretched"
  | "stress";

export type receipt_market_regime_severity =
  | "info"
  | "watch"
  | "high"
  | "critical";

export type receipt_market_regime_signal_category =
  | "comparability"
  | "watchlist"
  | "liquidation_buffer"
  | "volatility"
  | "funding"
  | "account_value"
  | "open_interest"
  | "market_move"
  | "data_freshness";

export type receipt_market_regime_signal = {
  id: string;
  category: receipt_market_regime_signal_category;
  severity: receipt_market_regime_severity;
  title: string;
  detail: string;
  review_points: string[];
};

export type receipt_market_regime = {
  label: receipt_market_regime_label;
  severity: receipt_market_regime_severity;
  headline: string;
  summary: string;
  focus_market: string | null;
  signal_count: number;
  critical_count: number;
  high_count: number;
  watch_count: number;
  info_count: number;
  metrics: {
    current_drawdown_percent: number | null;
    current_funding_burden_bps: number | null;
    current_min_liquidation_distance_bps: number | null;
    max_mark_move_percent: number;
    open_interest_delta_usd: number | null;
    volatility_high_count: number | null;
  };
  signals: receipt_market_regime_signal[];
};

const WATCH_FUNDING_BURDEN_BPS = 5;
const HIGH_FUNDING_BURDEN_BPS = 25;
const WATCH_DRAWDOWN_PERCENT = 10;
const HIGH_DRAWDOWN_PERCENT = 20;

export function buildReceiptMarketRegime(input: {
  accountValueContext?: receipt_account_value_context | null;
  comparison: snapshot_comparison;
  marketContext: market_context;
  riskDriverComparison: receipt_risk_driver_comparison;
  volatilityBuffer?: receipt_volatility_buffer | null;
  watchlist: receipt_recheck_watchlist;
}): receipt_market_regime {
  const metrics = getMarketRegimeMetrics(input);
  const signals = [
    ...getComparabilitySignals(input),
    ...getWatchlistSignals(input.watchlist),
    ...getLiquidationBufferSignals(input, metrics),
    ...getVolatilitySignals(input.volatilityBuffer ?? null),
    ...getFundingSignals(input, metrics),
    ...getAccountValueSignals(input.accountValueContext ?? null, metrics),
    ...getOpenInterestSignals(input, metrics),
    ...getMarketMoveSignals(input, metrics),
  ].sort(compareRegimeSignals);
  const label = getRegimeLabel(signals);
  const severity = getRegimeSeverity(label);

  return {
    label,
    severity,
    headline: getHeadline(label),
    summary: getSummary({ label, signals }),
    focus_market: getFocusMarket(input),
    signal_count: signals.length,
    critical_count: signals.filter((signal) => signal.severity === "critical")
      .length,
    high_count: signals.filter((signal) => signal.severity === "high").length,
    watch_count: signals.filter((signal) => signal.severity === "watch").length,
    info_count: signals.filter((signal) => signal.severity === "info").length,
    metrics,
    signals,
  };
}

function getMarketRegimeMetrics(input: {
  accountValueContext?: receipt_account_value_context | null;
  comparison: snapshot_comparison;
  marketContext: market_context;
  volatilityBuffer?: receipt_volatility_buffer | null;
}) {
  const currentDailyFundingUsd =
    input.comparison.metrics.daily_funding_usd.current_value;
  const currentAccountValueUsd =
    input.comparison.metrics.account_value_usd.current_value;
  const currentFundingBurdenBps =
    currentDailyFundingUsd !== null &&
    currentDailyFundingUsd > 0 &&
    currentAccountValueUsd !== null &&
    currentAccountValueUsd > 0
      ? roundBps((currentDailyFundingUsd / currentAccountValueUsd) * 10_000)
      : null;

  return {
    current_drawdown_percent:
      input.accountValueContext?.current_drawdown_percent ?? null,
    current_funding_burden_bps: currentFundingBurdenBps,
    current_min_liquidation_distance_bps:
      input.comparison.metrics.min_liquidation_distance_bps.current_value,
    max_mark_move_percent: input.marketContext.max_abs_mark_price_change_percent,
    open_interest_delta_usd: input.marketContext.total_open_interest_delta_usd,
    volatility_high_count: input.volatilityBuffer?.high_count ?? null,
  };
}

function getComparabilitySignals(input: {
  comparison: snapshot_comparison;
  riskDriverComparison: receipt_risk_driver_comparison;
}): receipt_market_regime_signal[] {
  if (!input.riskDriverComparison.account_matches) {
    return [
      {
        id: "comparability:account-mismatch",
        category: "comparability",
        severity: "critical",
        title: "Live account does not match receipt account",
        detail:
          "The current snapshot is not the same account, so the receipt should not be read as current risk context.",
        review_points: [
          "Verify the address before using the rest of the regime read.",
        ],
      },
    ];
  }

  if (input.comparison.changed_position_count > 0) {
    return [
      {
        id: "comparability:position-state",
        category: "comparability",
        severity: "high",
        title: "Position state changed since receipt",
        detail: `${input.comparison.changed_position_count} position row(s) changed state, size, or side.`,
        review_points: [
          "Treat changed-position rows as historical, not the same live risk object.",
        ],
      },
    ];
  }

  return [];
}

function getWatchlistSignals(
  watchlist: receipt_recheck_watchlist,
): receipt_market_regime_signal[] {
  if (watchlist.high_count > 0) {
    return [
      {
        id: "watchlist:high",
        category: "watchlist",
        severity: "high",
        title: "High-attention recheck cues are present",
        detail: `${watchlist.high_count} high and ${watchlist.watch_count} watch cue(s) crossed the active review thresholds.`,
        review_points: [
          "Use the ranked watchlist to inspect the highest-severity cue first.",
        ],
      },
    ];
  }

  if (watchlist.watch_count > 0) {
    return [
      {
        id: "watchlist:watch",
        category: "watchlist",
        severity: "watch",
        title: "Watch-level recheck cues are present",
        detail: `${watchlist.watch_count} watch cue(s) crossed the active review thresholds.`,
        review_points: [
          "Review watch-level cues before treating the receipt as unchanged.",
        ],
      },
    ];
  }

  return [];
}

function getLiquidationBufferSignals(
  input: {
    watchlist: receipt_recheck_watchlist;
  },
  metrics: receipt_market_regime["metrics"],
): receipt_market_regime_signal[] {
  const currentBufferBps = metrics.current_min_liquidation_distance_bps;

  if (currentBufferBps === null) {
    return [];
  }

  if (currentBufferBps <= input.watchlist.thresholds.thin_liquidation_distance_bps) {
    return [
      {
        id: "liquidation-buffer:thin",
        category: "liquidation_buffer",
        severity: "high",
        title: "Current listed liquidation buffer is thin",
        detail: `The smallest current listed liquidation distance is ${formatBpsAsPercent(currentBufferBps)}.`,
        review_points: [
          "Compare the current buffer with recent mark movement and volatility context.",
        ],
      },
    ];
  }

  if (currentBufferBps <= input.watchlist.thresholds.tight_liquidation_distance_bps) {
    return [
      {
        id: "liquidation-buffer:tight",
        category: "liquidation_buffer",
        severity: "watch",
        title: "Current listed liquidation buffer is tight",
        detail: `The smallest current listed liquidation distance is ${formatBpsAsPercent(currentBufferBps)}.`,
        review_points: [
          "Treat tight listed buffers as review context, not exact liquidation proof.",
        ],
      },
    ];
  }

  return [];
}

function getVolatilitySignals(
  volatilityBuffer: receipt_volatility_buffer | null,
): receipt_market_regime_signal[] {
  if (!volatilityBuffer) {
    return [
      {
        id: "volatility:not-loaded",
        category: "data_freshness",
        severity: "info",
        title: "24h volatility context is not loaded",
        detail:
          "Load public 24h volatility to compare recent candle movement with current listed buffers.",
        review_points: [
          "Use this as an optional context gap, not as a blocker for hash verification.",
        ],
      },
    ];
  }

  if (volatilityBuffer.high_count > 0) {
    return [
      {
        id: "volatility:high",
        category: "volatility",
        severity: "high",
        title: "Public volatility is large versus listed buffer",
        detail: `${volatilityBuffer.high_count} volatility-buffer row(s) are high attention.`,
        review_points: [
          "Inspect the volatility-buffer row before treating the saved receipt as calm.",
        ],
      },
    ];
  }

  if (volatilityBuffer.watch_count > 0) {
    return [
      {
        id: "volatility:watch",
        category: "volatility",
        severity: "watch",
        title: "Public volatility is using meaningful buffer",
        detail: `${volatilityBuffer.watch_count} volatility-buffer row(s) crossed watch thresholds.`,
        review_points: [
          "Compare public range and ATR-style movement with current listed buffers.",
        ],
      },
    ];
  }

  return [];
}

function getFundingSignals(
  input: {
    marketContext: market_context;
    watchlist: receipt_recheck_watchlist;
  },
  metrics: receipt_market_regime["metrics"],
): receipt_market_regime_signal[] {
  const signals: receipt_market_regime_signal[] = [];
  const fundingBurdenBps = metrics.current_funding_burden_bps;

  if (fundingBurdenBps !== null && fundingBurdenBps >= HIGH_FUNDING_BURDEN_BPS) {
    signals.push({
      id: "funding:burden-high",
      category: "funding",
      severity: "high",
      title: "Current funding burden is heavy",
      detail: `Positive daily funding cost is ${fundingBurdenBps.toFixed(2)} bps of current account value.`,
      review_points: [
        "Funding can drain margin while a position stays open.",
      ],
    });
  } else if (
    fundingBurdenBps !== null &&
    fundingBurdenBps >= WATCH_FUNDING_BURDEN_BPS
  ) {
    signals.push({
      id: "funding:burden-watch",
      category: "funding",
      severity: "watch",
      title: "Current funding burden is elevated",
      detail: `Positive daily funding cost is ${fundingBurdenBps.toFixed(2)} bps of current account value.`,
      review_points: [
        "Check whether funding cost is material to the receipt review window.",
      ],
    });
  }

  const fundingDelta = input.marketContext.total_daily_funding_delta_usd;

  if (
    fundingDelta !== null &&
    fundingDelta >= input.watchlist.thresholds.material_daily_funding_usd
  ) {
    signals.push({
      id: "funding:delta-watch",
      category: "funding",
      severity: "watch",
      title: "Daily funding cost is higher now",
      detail: `Market-context daily funding moved by ${formatSignedUsd(fundingDelta)}.`,
      review_points: [
        "Funding deltas are holding-cost context, not a trade instruction.",
      ],
    });
  }

  return dedupeSignals(signals);
}

function getAccountValueSignals(
  accountValueContext: receipt_account_value_context | null,
  metrics: receipt_market_regime["metrics"],
): receipt_market_regime_signal[] {
  const currentDrawdownPercent = metrics.current_drawdown_percent;

  if (!accountValueContext || currentDrawdownPercent === null) {
    return [];
  }

  if (currentDrawdownPercent >= HIGH_DRAWDOWN_PERCENT) {
    return [
      {
        id: "account-value:drawdown-high",
        category: "account_value",
        severity: "high",
        title: "Current sampled drawdown is large",
        detail: `Current drawdown is ${currentDrawdownPercent.toFixed(2)}% in the selected sampled account-value window.`,
        review_points: [
          "Sampled drawdown is account context, not a complete accounting record.",
        ],
      },
    ];
  }

  if (currentDrawdownPercent >= WATCH_DRAWDOWN_PERCENT) {
    return [
      {
        id: "account-value:drawdown-watch",
        category: "account_value",
        severity: "watch",
        title: "Current sampled drawdown is meaningful",
        detail: `Current drawdown is ${currentDrawdownPercent.toFixed(2)}% in the selected sampled account-value window.`,
        review_points: [
          "Review account-value drift alongside position-level risk cues.",
        ],
      },
    ];
  }

  if (
    accountValueContext.latest_vs_receipt_percent !== null &&
    accountValueContext.latest_vs_receipt_percent <= -2
  ) {
    return [
      {
        id: "account-value:latest-lower",
        category: "account_value",
        severity: "watch",
        title: "Latest sampled account value is lower",
        detail: `Latest sampled account value is ${accountValueContext.latest_vs_receipt_percent.toFixed(2)}% versus the receipt value.`,
        review_points: [
          "Use sampled account-value context to frame the receipt timing.",
        ],
      },
    ];
  }

  return [];
}

function getOpenInterestSignals(
  input: {
    watchlist: receipt_recheck_watchlist;
  },
  metrics: receipt_market_regime["metrics"],
): receipt_market_regime_signal[] {
  const openInterestDeltaUsd = metrics.open_interest_delta_usd;

  if (
    openInterestDeltaUsd === null ||
    Math.abs(openInterestDeltaUsd) <
      input.watchlist.thresholds.material_open_interest_delta_usd
  ) {
    return [];
  }

  return [
    {
      id: "open-interest:material",
      category: "open_interest",
      severity: "info",
      title: "Open interest moved materially",
      detail: `Total comparable open interest moved by ${formatSignedUsd(openInterestDeltaUsd)}.`,
      review_points: [
        "Open interest is participation context, not a standalone direction signal.",
      ],
    },
  ];
}

function getMarketMoveSignals(
  input: {
    watchlist: receipt_recheck_watchlist;
  },
  metrics: receipt_market_regime["metrics"],
): receipt_market_regime_signal[] {
  if (
    metrics.max_mark_move_percent <
    input.watchlist.thresholds.material_mark_move_percent
  ) {
    return [];
  }

  return [
    {
      id: "market-move:material",
      category: "market_move",
      severity: "info",
      title: "Comparable mark price moved materially",
      detail: `Largest comparable mark move is ${metrics.max_mark_move_percent.toFixed(2)}%.`,
      review_points: [
        "Direction matters; review market-context rows before interpreting the move.",
      ],
    },
  ];
}

function getRegimeLabel(
  signals: receipt_market_regime_signal[],
): receipt_market_regime_label {
  if (signals.some((signal) => signal.category === "comparability")) {
    return "not_comparable";
  }

  if (signals.some((signal) => signal.severity === "high")) {
    return "stress";
  }

  const watchCount = signals.filter((signal) => signal.severity === "watch").length;

  if (watchCount >= 2) {
    return "stretched";
  }

  const activeInfoSignals = signals.filter(
    (signal) =>
      signal.severity === "info" && signal.category !== "data_freshness",
  );

  if (watchCount === 1 || activeInfoSignals.length > 0) {
    return "active";
  }

  return "calm";
}

function getRegimeSeverity(
  label: receipt_market_regime_label,
): receipt_market_regime_severity {
  switch (label) {
    case "not_comparable":
      return "critical";
    case "stress":
      return "high";
    case "stretched":
      return "watch";
    case "active":
      return "watch";
    case "calm":
      return "info";
  }
}

function getHeadline(label: receipt_market_regime_label) {
  switch (label) {
    case "not_comparable":
      return "Current regime is not directly comparable to the receipt.";
    case "stress":
      return "Current market regime looks stressed for this receipt.";
    case "stretched":
      return "Current market regime looks stretched for this receipt.";
    case "active":
      return "Current market regime is active but not high-stress by current cues.";
    case "calm":
      return "Current market regime looks calm by current receipt cues.";
  }
}

function getSummary(input: {
  label: receipt_market_regime_label;
  signals: receipt_market_regime_signal[];
}) {
  const topSignals = input.signals
    .filter((signal) => signal.severity !== "info")
    .slice(0, 2)
    .map((signal) => signal.title.toLowerCase());

  if (topSignals.length > 0) {
    return `Main read: ${topSignals.join("; ")}. This is a read-only review regime, not a forecast or trade recommendation.`;
  }

  switch (input.label) {
    case "calm":
      return "No high or watch regime signals crossed the current app thresholds. This is still a historical receipt review, not a risk guarantee.";
    case "active":
      return "Only informational context crossed the current app thresholds. Review the rows before treating the receipt as unchanged.";
    case "not_comparable":
    case "stress":
    case "stretched":
      return "This is a read-only review regime, not a forecast or trade recommendation.";
  }
}

function getFocusMarket(input: {
  marketContext: market_context;
  riskDriverComparison: receipt_risk_driver_comparison;
  volatilityBuffer?: receipt_volatility_buffer | null;
}) {
  return (
    input.riskDriverComparison.current_top_driver_market ??
    input.volatilityBuffer?.focus_market ??
    input.marketContext.most_relevant_position?.market ??
    null
  );
}

function dedupeSignals(
  signals: receipt_market_regime_signal[],
): receipt_market_regime_signal[] {
  const seenIds = new Set<string>();

  return signals.filter((signal) => {
    if (seenIds.has(signal.id)) {
      return false;
    }

    seenIds.add(signal.id);
    return true;
  });
}

function compareRegimeSignals(
  firstSignal: receipt_market_regime_signal,
  secondSignal: receipt_market_regime_signal,
) {
  const severityDifference =
    getSeverityRank(secondSignal.severity) -
    getSeverityRank(firstSignal.severity);

  if (severityDifference !== 0) {
    return severityDifference;
  }

  const categoryDifference =
    getCategoryRank(secondSignal.category) -
    getCategoryRank(firstSignal.category);

  if (categoryDifference !== 0) {
    return categoryDifference;
  }

  return firstSignal.title.localeCompare(secondSignal.title);
}

function getSeverityRank(severity: receipt_market_regime_severity) {
  switch (severity) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "watch":
      return 2;
    case "info":
      return 1;
  }
}

function getCategoryRank(category: receipt_market_regime_signal_category) {
  switch (category) {
    case "comparability":
      return 9;
    case "watchlist":
      return 8;
    case "liquidation_buffer":
      return 7;
    case "volatility":
      return 6;
    case "funding":
      return 5;
    case "account_value":
      return 4;
    case "open_interest":
      return 3;
    case "market_move":
      return 2;
    case "data_freshness":
      return 1;
  }
}

function roundBps(value: number) {
  return Math.round(value * 100) / 100;
}

function formatBpsAsPercent(value: number) {
  return `${(value / 100).toFixed(2)}%`;
}

function formatSignedUsd(value: number) {
  if (value === 0) {
    return "$0.00";
  }

  const sign = value > 0 ? "+" : "-";

  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}
