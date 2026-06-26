import {
  formatPercentFromBps,
  formatSignedBps,
  formatSignedUsd,
  formatUsd,
  truncateMiddle,
} from "../formatters.ts";
import type { receipt_account_value_context } from "../history/receipt-account-value-context.ts";
import type {
  market_context,
  market_context_position,
} from "../market/market-context.ts";
import type { risk_receipt } from "../perps/types.ts";
import type { receipt_change_summary } from "../receipts/receipt-change-summary.ts";
import type {
  receipt_risk_driver_comparison,
  receipt_risk_driver_market_change,
} from "../receipts/receipt-risk-driver-comparison.ts";
import type {
  receipt_recheck_watch_item,
  receipt_recheck_watchlist,
} from "../receipts/receipt-recheck-watchlist.ts";
import type {
  receipt_market_regime,
  receipt_market_regime_signal,
} from "../receipts/receipt-market-regime.ts";
import type {
  receipt_volatility_buffer,
  receipt_volatility_buffer_row,
} from "../receipts/receipt-volatility-buffer.ts";
import type {
  position_risk_driver,
  position_risk_driver_category,
} from "../risk/position-risk-drivers.ts";
import type {
  metric_comparison,
  snapshot_comparison,
} from "../receipts/snapshot-comparison.ts";

export type receipt_risk_assistant_context = {
  receipt: risk_receipt;
  comparison: snapshot_comparison;
  marketContext: market_context;
  changeSummary: receipt_change_summary;
  riskDriverComparison?: receipt_risk_driver_comparison | null;
  recheckWatchlist?: receipt_recheck_watchlist | null;
  marketRegime?: receipt_market_regime | null;
  volatilityBuffer?: receipt_volatility_buffer | null;
  accountValueContext?: receipt_account_value_context | null;
  hashVerified?: boolean;
};

export type receipt_risk_assistant_response = {
  answer: string;
  citations: string[];
};

export type receipt_risk_assistant_suggestion = {
  id: string;
  label: string;
  question: string;
};

const advicePatterns = [
  /\bwhat should i do\b/,
  /\bshould i (trade|buy|sell|open|close|increase|reduce|use leverage|add leverage)\b/,
  /\b(buy|sell|ape)\b/,
  /\b(use|add|increase|reduce) leverage\b/,
  /\b(increase|reduce) (my |this |the )?(position|size|exposure|margin)\b/,
  /\b(open|close) (a |my |this |the )?(position|trade|long|short)\b/,
  /\bgo long\b/,
  /\bgo short\b/,
];

function includesAny(value: string, patterns: string[]) {
  return patterns.some((pattern) => value.includes(pattern));
}

function includesAdviceIntent(value: string) {
  return advicePatterns.some((pattern) => pattern.test(value));
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatNullableSignedUsd(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return formatSignedUsd(value);
}

function formatNullableUsd(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return formatUsd(value);
}

function formatNullableSignedBps(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return formatSignedBps(value);
}

function formatSignedNumber(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  if (value === 0) {
    return "0";
  }

  return `${value > 0 ? "+" : "-"}${Math.abs(value).toFixed(2)}`;
}

function formatSignedPercentFromBps(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return `${formatSignedNumber(value / 100)} percentage points`;
}

function formatPercent(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return `${value.toFixed(2)}%`;
}

function formatMultiple(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return `${value.toFixed(2)}x`;
}

function formatMetricMove(
  metric: metric_comparison,
  formatter: (value: number | null) => string,
) {
  return `${formatter(metric.receipt_value)} to ${formatter(metric.current_value)}`;
}

function formatDriverFactor(category: position_risk_driver_category) {
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
  }
}

function formatDriverRow(
  label: "Saved" | "Current",
  driver: position_risk_driver | null,
) {
  if (!driver) {
    return `${label} row: no position driver row.`;
  }

  const componentScores = [
    `L ${driver.liquidation_score}`,
    `N ${driver.notional_score}`,
    `F ${driver.funding_score}`,
    `PnL ${driver.unrealized_loss_score}`,
  ].join(" · ");

  return [
    `${label} row: score ${driver.driver_score} (${driver.driver_label}), primary factor ${formatDriverFactor(driver.primary_driver)}`,
    `components ${componentScores}`,
    `notional ${formatUsd(driver.notional_usd)}`,
    `listed buffer ${formatPercentFromBps(driver.liquidation_distance_bps)}`,
    `daily funding ${formatSignedUsd(driver.daily_funding_usd)}`,
  ].join("; ") + ".";
}

function formatMarketContextRow(position: market_context_position | null) {
  if (!position) {
    return "Market context row: no saved/current market-context row is loaded for this market.";
  }

  const markMove =
    position.mark_price_change_percent === null
      ? "n/a"
      : `${formatSignedNumber(position.mark_price_change_percent)}%`;

  return [
    `Market context row: ${position.summary}`,
    `Mark move: ${formatMetricMove(position.mark_price_usd, formatNullableUsd)} (${markMove}).`,
    `Listed liquidation distance: ${formatMetricMove(position.liquidation_distance_bps, formatPercentFromBps)}.`,
    `8h funding: ${formatMetricMove(position.funding_8h_bps_user_perspective, formatNullableSignedBps)}.`,
    `Daily funding: ${formatMetricMove(position.daily_funding_usd, formatNullableSignedUsd)}.`,
    `Open interest: ${formatMetricMove(position.open_interest_usd, formatNullableUsd)}.`,
  ].join(" ");
}

function formatWatchlistItem(item: receipt_recheck_watch_item) {
  const reviewPoints = item.review_points.join(" ");

  return `${item.severity.toUpperCase()} ${item.market}: ${item.title}. ${item.detail} Review: ${reviewPoints}`;
}

function formatVolatilityBufferRow(row: receipt_volatility_buffer_row) {
  return [
    `${row.severity.toUpperCase()} ${row.market}: ${row.summary}`,
    `Current listed buffer: ${formatPercent(row.current_liquidation_distance_percent)}.`,
    `Public 24h range: ${formatPercent(row.high_low_range_percent)}.`,
    `Hourly ATR: ${formatPercent(row.average_true_range_percent)}.`,
    `ATR buffer multiple: ${formatMultiple(row.atr_buffer_multiple)}.`,
  ].join(" ");
}

function formatMarketRegimeSignal(signal: receipt_market_regime_signal) {
  const reviewPoints = signal.review_points.join(" ");

  return `${signal.severity.toUpperCase()} ${signal.category.replaceAll("_", " ")}: ${signal.title}. ${signal.detail} Review: ${reviewPoints}`;
}

function getRequestedMarketChange(input: {
  normalizedQuestion: string;
  riskDriverComparison: receipt_risk_driver_comparison | null;
}) {
  if (!input.riskDriverComparison) {
    return null;
  }

  const upperQuestion = input.normalizedQuestion.toUpperCase();

  return (
    input.riskDriverComparison.market_changes.find((marketChange) => {
      const market = marketChange.market.toUpperCase();
      const baseCoin = market.replace(/-PERP$/, "");
      const baseCoinPattern = new RegExp(`\\b${escapeRegex(baseCoin)}\\b`);

      return (
        upperQuestion.includes(market) || baseCoinPattern.test(upperQuestion)
      );
    }) ?? null
  );
}

function getMarketContextPositionByMarket(input: {
  market: string;
  marketContext: market_context;
}) {
  const requestedMarket = input.market.toUpperCase();

  return (
    input.marketContext.positions.find(
      (position) => position.market.toUpperCase() === requestedMarket,
    ) ?? null
  );
}

function getMarketContextCitations(
  position: market_context_position | null,
): string[] {
  if (!position) {
    return [];
  }

  return [
    `market_context.positions.${position.market}.summary`,
    `market_context.positions.${position.market}.mark_price_usd`,
    `market_context.positions.${position.market}.mark_price_change_percent`,
    `market_context.positions.${position.market}.liquidation_distance_bps`,
    `market_context.positions.${position.market}.funding_8h_bps_user_perspective`,
    `market_context.positions.${position.market}.daily_funding_usd`,
    `market_context.positions.${position.market}.open_interest_usd`,
  ];
}

function getHashStatus(hashVerified: boolean | undefined) {
  if (hashVerified === true) {
    return "Hash verification is passing on this page.";
  }

  if (hashVerified === false) {
    return "Hash verification is not passing on this page.";
  }

  return "Use the hash verification block above to confirm the recomputed hash.";
}

function buildSummaryAnswer(
  context: receipt_risk_assistant_context,
): receipt_risk_assistant_response {
  return {
    answer: [
      context.changeSummary.headline,
      context.changeSummary.primary_detail,
      `The saved receipt risk score is ${context.receipt.snapshot.aggregate.risk_score} (${context.receipt.snapshot.aggregate.risk_label}), and the live recheck status is ${context.comparison.status.replaceAll("_", " ")}.`,
      `${getHashStatus(context.hashVerified)} I can explain the receipt and live recheck, but I cannot recommend trades or position changes.`,
    ].join(" "),
    citations: [
      "receipt_change_summary.headline",
      "receipt_change_summary.primary_detail",
      "receipt.snapshot.aggregate.risk_score",
      "snapshot_comparison.status",
      "receipt.snapshot_hash",
    ],
  };
}

function buildReviewAnswer(
  context: receipt_risk_assistant_context,
): receipt_risk_assistant_response {
  const reviewPoints = context.changeSummary.review_points
    .map((point) => `- ${point}`)
    .join(" ");
  const driverRead = context.riskDriverComparison
    ? `Risk-driver read: ${context.riskDriverComparison.headline}`
    : "Risk-driver comparison is not loaded in this assistant context.";

  return {
    answer: [
      `Review this receipt as ${context.changeSummary.label.replaceAll("_", " ")}.`,
      context.changeSummary.primary_detail,
      driverRead,
      reviewPoints,
      `Position state changes: ${context.comparison.changed_position_count}. Largest comparable mark move: ${context.comparison.max_abs_mark_price_change_percent.toFixed(2)}%.`,
    ].join(" "),
    citations: [
      "receipt_change_summary.label",
      "receipt_change_summary.review_points",
      ...(context.riskDriverComparison
        ? ["receipt_risk_driver_comparison.headline"]
        : []),
      "snapshot_comparison.changed_position_count",
      "snapshot_comparison.max_abs_mark_price_change_percent",
    ],
  };
}

function buildDriverAnswer(
  context: receipt_risk_assistant_context,
): receipt_risk_assistant_response {
  const driverComparison = context.riskDriverComparison ?? null;

  if (!driverComparison) {
    return {
      answer:
        "Risk-driver comparison is not loaded for this receipt. Run a live recheck to compare saved and current top drivers, exposure, listed buffer, and funding burden.",
      citations: ["receipt_risk_driver_comparison"],
    };
  }

  const reviewPoints = driverComparison.review_points
    .map((point) => `- ${point}`)
    .join(" ");

  return {
    answer: [
      driverComparison.headline,
      driverComparison.summary,
      `Saved top driver: ${driverComparison.saved_top_driver_market ?? "n/a"}. Current top driver: ${driverComparison.current_top_driver_market ?? "n/a"}.`,
      `Top score delta: ${formatSignedNumber(driverComparison.top_driver_score_delta)}. Gross exposure delta: ${formatSignedPercentFromBps(driverComparison.gross_exposure_delta_bps)}. Closest listed-buffer delta: ${formatSignedPercentFromBps(driverComparison.closest_liquidation_distance_delta_bps)}. Daily funding delta: ${formatNullableSignedUsd(driverComparison.daily_funding_delta_usd)}.`,
      reviewPoints,
      "This is heuristic driver attribution from the saved and current snapshots, not a protocol-official liquidation monitor or trade recommendation.",
    ].join(" "),
    citations: [
      "receipt_risk_driver_comparison.headline",
      "receipt_risk_driver_comparison.summary",
      "receipt_risk_driver_comparison.saved_top_driver_market",
      "receipt_risk_driver_comparison.current_top_driver_market",
      "receipt_risk_driver_comparison.top_driver_score_delta",
      "receipt_risk_driver_comparison.gross_exposure_delta_bps",
      "receipt_risk_driver_comparison.closest_liquidation_distance_delta_bps",
      "receipt_risk_driver_comparison.daily_funding_delta_usd",
      "receipt_risk_driver_comparison.review_points",
    ],
  };
}

function buildWatchlistAnswer(
  context: receipt_risk_assistant_context,
): receipt_risk_assistant_response {
  const watchlist = context.recheckWatchlist ?? null;

  if (!watchlist) {
    return {
      answer:
        "The recheck watchlist is not loaded in this assistant context. Run a live recheck to rank saved/current receipt review cues.",
      citations: ["receipt_recheck_watchlist"],
    };
  }

  const topItems = watchlist.items.slice(0, 3);
  const topItemSummary =
    topItems.length === 0
      ? "No ranked watchlist items crossed the current app thresholds."
      : topItems.map(formatWatchlistItem).join(" ");

  return {
    answer: [
      watchlist.headline,
      watchlist.summary,
      `Counts: ${watchlist.high_count} high, ${watchlist.watch_count} watch, ${watchlist.info_count} info.`,
      topItemSummary,
      "Use this to decide what to inspect first on the receipt page; it is not a trading recommendation.",
    ].join(" "),
    citations: [
      "receipt_recheck_watchlist.headline",
      "receipt_recheck_watchlist.summary",
      "receipt_recheck_watchlist.high_count",
      "receipt_recheck_watchlist.watch_count",
      "receipt_recheck_watchlist.info_count",
      ...topItems.flatMap((item) => [
        `receipt_recheck_watchlist.items.${item.id}.severity`,
        `receipt_recheck_watchlist.items.${item.id}.detail`,
        `receipt_recheck_watchlist.items.${item.id}.review_points`,
      ]),
    ],
  };
}

function buildMarketRegimeAnswer(
  context: receipt_risk_assistant_context,
): receipt_risk_assistant_response {
  const marketRegime = context.marketRegime ?? null;

  if (!marketRegime) {
    return {
      answer:
        "Market regime context is not loaded for this receipt. Run a live recheck to combine watchlist severity, listed buffers, funding burden, account drawdown, and volatility context.",
      citations: ["receipt_market_regime"],
    };
  }

  const topSignals = marketRegime.signals
    .filter((signal) => signal.severity !== "info")
    .slice(0, 3);
  const signalSummary =
    topSignals.length === 0
      ? "No high or watch regime signals crossed the current app thresholds."
      : topSignals.map(formatMarketRegimeSignal).join(" ");

  return {
    answer: [
      marketRegime.headline,
      marketRegime.summary,
      `Regime label: ${marketRegime.label.replaceAll("_", " ")}. Focus market: ${marketRegime.focus_market ?? "n/a"}. Counts: ${marketRegime.critical_count} critical, ${marketRegime.high_count} high, ${marketRegime.watch_count} watch, ${marketRegime.info_count} info.`,
      signalSummary,
      "This combines local receipt recheck signals and loaded public context; it is not a forecast, liquidation alert, or trade recommendation.",
    ].join(" "),
    citations: [
      "receipt_market_regime.headline",
      "receipt_market_regime.summary",
      "receipt_market_regime.label",
      "receipt_market_regime.focus_market",
      "receipt_market_regime.critical_count",
      "receipt_market_regime.high_count",
      "receipt_market_regime.watch_count",
      "receipt_market_regime.info_count",
      ...topSignals.flatMap((signal) => [
        `receipt_market_regime.signals.${signal.id}.severity`,
        `receipt_market_regime.signals.${signal.id}.detail`,
        `receipt_market_regime.signals.${signal.id}.review_points`,
      ]),
    ],
  };
}

function buildVolatilityAnswer(
  context: receipt_risk_assistant_context,
): receipt_risk_assistant_response {
  const volatilityBuffer = context.volatilityBuffer ?? null;

  if (!volatilityBuffer) {
    return {
      answer:
        "Volatility buffer context is not loaded yet. Use Load 24h volatility after a live recheck to compare public candle range and ATR-style movement with the current listed liquidation buffer.",
      citations: ["receipt_volatility_buffer"],
    };
  }

  const topRows = volatilityBuffer.rows
    .filter((row) => row.severity !== "info")
    .slice(0, 3);
  const rowSummary =
    topRows.length === 0
      ? "No volatility-buffer rows crossed high or watch thresholds."
      : topRows.map(formatVolatilityBufferRow).join(" ");

  return {
    answer: [
      volatilityBuffer.headline,
      volatilityBuffer.summary,
      `Counts: ${volatilityBuffer.high_count} high, ${volatilityBuffer.watch_count} watch, ${volatilityBuffer.info_count} info.`,
      rowSummary,
      "This uses public 24h candles for review context; it is not a liquidation alert, forecast, or trade recommendation.",
    ].join(" "),
    citations: [
      "receipt_volatility_buffer.headline",
      "receipt_volatility_buffer.summary",
      "receipt_volatility_buffer.high_count",
      "receipt_volatility_buffer.watch_count",
      "receipt_volatility_buffer.info_count",
      ...topRows.flatMap((row) => [
        `receipt_volatility_buffer.rows.${row.market}.summary`,
        `receipt_volatility_buffer.rows.${row.market}.current_liquidation_distance_percent`,
        `receipt_volatility_buffer.rows.${row.market}.high_low_range_percent`,
        `receipt_volatility_buffer.rows.${row.market}.average_true_range_percent`,
        `receipt_volatility_buffer.rows.${row.market}.atr_buffer_multiple`,
      ]),
    ],
  };
}

function buildMarketDriverAnswer(input: {
  marketChange: receipt_risk_driver_market_change;
  marketContextPosition: market_context_position | null;
}): receipt_risk_assistant_response {
  const { marketChange, marketContextPosition } = input;
  const comparablePositionText =
    marketChange.status === "same_position"
      ? "This is the same market/side/size, so the app compares the saved and current driver components directly."
      : "This position state changed, so the app treats the receipt row as historical rather than the same live risk object.";

  return {
    answer: [
      marketChange.summary,
      comparablePositionText,
      formatDriverRow("Saved", marketChange.saved_driver),
      formatDriverRow("Current", marketChange.current_driver),
      formatMarketContextRow(marketContextPosition),
      [
        `Score delta: ${formatSignedNumber(marketChange.driver_score_delta)}.`,
        `Notional delta: ${formatNullableSignedUsd(marketChange.notional_delta_usd)}.`,
        `Listed-buffer delta: ${formatSignedPercentFromBps(marketChange.liquidation_distance_delta_bps)}.`,
        `Daily funding delta: ${formatNullableSignedUsd(marketChange.daily_funding_delta_usd)}.`,
      ].join(" "),
      "This is a per-market drilldown from the receipt risk-driver comparison and market context, not protocol-official attribution or a trade recommendation.",
    ].join(" "),
    citations: [
      `receipt_risk_driver_comparison.market_changes.${marketChange.market}.summary`,
      `receipt_risk_driver_comparison.market_changes.${marketChange.market}.status`,
      `receipt_risk_driver_comparison.market_changes.${marketChange.market}.saved_driver`,
      `receipt_risk_driver_comparison.market_changes.${marketChange.market}.current_driver`,
      `receipt_risk_driver_comparison.market_changes.${marketChange.market}.driver_score_delta`,
      `receipt_risk_driver_comparison.market_changes.${marketChange.market}.notional_delta_usd`,
      `receipt_risk_driver_comparison.market_changes.${marketChange.market}.liquidation_distance_delta_bps`,
      `receipt_risk_driver_comparison.market_changes.${marketChange.market}.daily_funding_delta_usd`,
      ...getMarketContextCitations(marketContextPosition),
    ],
  };
}

function buildMarketAnswer(
  context: receipt_risk_assistant_context,
): receipt_risk_assistant_response {
  const focusMarket =
    context.marketContext.most_relevant_position?.market ?? "no single market";
  const openInterestDelta = formatNullableSignedUsd(
    context.marketContext.total_open_interest_delta_usd,
  );

  return {
    answer: [
      context.marketContext.headline,
      context.marketContext.summary,
      `Focus market: ${focusMarket}. Largest comparable mark move: ${context.marketContext.max_abs_mark_price_change_percent.toFixed(2)}%. Total open-interest delta: ${openInterestDelta}.`,
      "This is descriptive market context, not a direction signal or trade recommendation.",
    ].join(" "),
    citations: [
      "market_context.headline",
      "market_context.summary",
      "market_context.most_relevant_position",
      "market_context.max_abs_mark_price_change_percent",
      "market_context.total_open_interest_delta_usd",
    ],
  };
}

function buildLiquidationAnswer(
  context: receipt_risk_assistant_context,
): receipt_risk_assistant_response {
  const focusPosition = context.marketContext.most_relevant_position;

  if (!focusPosition) {
    return {
      answer:
        "There is no comparable open position with market context in this live recheck. The app cannot identify a focus liquidation buffer for this receipt state.",
      citations: [
        "market_context.positions",
        "market_context.most_relevant_position",
      ],
    };
  }

  return {
    answer: `${focusPosition.market} is the current focus market for liquidation review. Its listed liquidation distance moved ${formatMetricMove(focusPosition.liquidation_distance_bps, formatPercentFromBps)}, and the position read is: ${focusPosition.summary} This uses listed liquidation prices and mark-price context, not Hyperliquid's exact liquidation engine.`,
    citations: [
      "market_context.most_relevant_position.market",
      "market_context.most_relevant_position.liquidation_distance_bps",
      "market_context.most_relevant_position.summary",
      "snapshot_comparison.metrics.min_liquidation_distance_bps",
    ],
  };
}

function buildFundingAnswer(
  context: receipt_risk_assistant_context,
): receipt_risk_assistant_response {
  const fundingDelta = formatNullableSignedUsd(
    context.marketContext.total_daily_funding_delta_usd,
  );

  return {
    answer: [
      `Receipt daily funding was ${formatSignedUsd(context.receipt.snapshot.aggregate.daily_funding_usd)}.`,
      `The live recheck daily funding moved ${formatMetricMove(context.comparison.metrics.daily_funding_usd, formatNullableSignedUsd)}.`,
      `Market-context total daily funding delta is ${fundingDelta}. Funding is a holding-cost signal and can change while the position stays open.`,
    ].join(" "),
    citations: [
      "receipt.snapshot.aggregate.daily_funding_usd",
      "snapshot_comparison.metrics.daily_funding_usd",
      "market_context.total_daily_funding_delta_usd",
    ],
  };
}

function buildAccountHistoryAnswer(
  context: receipt_risk_assistant_context,
): receipt_risk_assistant_response {
  const accountValueContext = context.accountValueContext ?? null;

  if (!accountValueContext) {
    return {
      answer:
        "Sampled account-value context has not loaded for this receipt. Use the receipt account-value context panel when available; it compares the receipt timestamp to the nearest Hyperliquid portfolio-history sample.",
      citations: ["receipt_account_value_context"],
    };
  }

  const latestVsReceipt = formatPercent(
    accountValueContext.latest_vs_receipt_percent,
  );
  const sampleGap =
    accountValueContext.nearest_sample_gap_minutes === null
      ? "n/a"
      : `${accountValueContext.nearest_sample_gap_minutes} minutes`;

  return {
    answer: `${accountValueContext.headline} Latest sampled account value is ${latestVsReceipt} versus the receipt value, and the nearest sample gap is ${sampleGap}. Receipt drawdown is ${formatPercent(accountValueContext.receipt_drawdown_percent)}. This is sampled context, not complete accounting.`,
    citations: [
      "receipt_account_value_context.headline",
      "receipt_account_value_context.latest_vs_receipt_percent",
      "receipt_account_value_context.nearest_sample_gap_minutes",
      "receipt_account_value_context.receipt_drawdown_percent",
    ],
  };
}

function buildHashAnswer(
  context: receipt_risk_assistant_context,
): receipt_risk_assistant_response {
  return {
    answer: `Receipt ${context.receipt.id} saves snapshot hash ${truncateMiddle(context.receipt.snapshot_hash, 14)}. ${getHashStatus(context.hashVerified)} The hash proves the local snapshot content has not changed since receipt creation; it does not prove Hyperliquid's external data was correct at capture time.`,
    citations: [
      "receipt.id",
      "receipt.snapshot_hash",
      "receipt_verification.matches",
    ],
  };
}

function buildAdviceRefusal(
  context: receipt_risk_assistant_context,
): receipt_risk_assistant_response {
  return {
    answer: [
      "I cannot recommend trades, leverage, or position changes.",
      `I can explain the receipt signals: ${context.changeSummary.headline}`,
      `Saved risk score is ${context.receipt.snapshot.aggregate.risk_score}, live recheck status is ${context.comparison.status.replaceAll("_", " ")}, and market context says: ${context.marketContext.headline}`,
    ].join(" "),
    citations: [
      "receipt_change_summary.headline",
      "receipt.snapshot.aggregate.risk_score",
      "snapshot_comparison.status",
      "market_context.headline",
    ],
  };
}

export function answerReceiptRiskQuestion(input: {
  context: receipt_risk_assistant_context;
  question: string;
}): receipt_risk_assistant_response {
  const normalizedQuestion = input.question.trim().toLowerCase();
  const requestedMarketChange = getRequestedMarketChange({
    normalizedQuestion,
    riskDriverComparison: input.context.riskDriverComparison ?? null,
  });

  if (normalizedQuestion.length === 0) {
    return buildSummaryAnswer(input.context);
  }

  if (includesAdviceIntent(normalizedQuestion)) {
    return buildAdviceRefusal(input.context);
  }

  if (
    includesAny(normalizedQuestion, [
      "hash",
      "verify",
      "verified",
      "proof",
      "receipt id",
      "snapshot",
    ])
  ) {
    return buildHashAnswer(input.context);
  }

  if (requestedMarketChange) {
    return buildMarketDriverAnswer({
      marketChange: requestedMarketChange,
      marketContextPosition: getMarketContextPositionByMarket({
        market: requestedMarketChange.market,
        marketContext: input.context.marketContext,
      }),
    });
  }

  if (
    includesAny(normalizedQuestion, [
      "regime",
      "conditions",
      "environment",
      "stretched",
      "stress",
      "calm",
    ])
  ) {
    return buildMarketRegimeAnswer(input.context);
  }

  if (
    includesAny(normalizedQuestion, [
      "watchlist",
      "inspect first",
      "review first",
      "look at first",
      "focus first",
      "priority",
      "prioritize",
      "attention",
      "urgent",
    ])
  ) {
    return buildWatchlistAnswer(input.context);
  }

  if (
    includesAny(normalizedQuestion, [
      "volatility",
      "atr",
      "range",
      "24h",
      "candle",
      "runway",
    ])
  ) {
    return buildVolatilityAnswer(input.context);
  }

  if (
    includesAny(normalizedQuestion, [
      "driver",
      "drivers",
      "top risk",
      "risk factor",
      "factor",
      "exposure",
      "gross exposure",
      "attribution",
      "what is driving",
    ])
  ) {
    return buildDriverAnswer(input.context);
  }

  if (
    includesAny(normalizedQuestion, [
      "liquidation",
      "liq",
      "buffer",
      "distance",
      "maintenance",
    ])
  ) {
    return buildLiquidationAnswer(input.context);
  }

  if (includesAny(normalizedQuestion, ["funding", "carry", "cost", "earn"])) {
    return buildFundingAnswer(input.context);
  }

  if (
    includesAny(normalizedQuestion, [
      "market",
      "mark",
      "price",
      "open interest",
      "oi",
    ])
  ) {
    return buildMarketAnswer(input.context);
  }

  if (
    includesAny(normalizedQuestion, [
      "history",
      "drawdown",
      "account value",
      "portfolio",
      "sample",
    ])
  ) {
    return buildAccountHistoryAnswer(input.context);
  }

  if (
    includesAny(normalizedQuestion, [
      "change",
      "changed",
      "different",
      "review",
      "summary",
      "what happened",
    ])
  ) {
    return buildReviewAnswer(input.context);
  }

  return buildSummaryAnswer(input.context);
}

export function getReceiptRiskAssistantSuggestions(
  context: receipt_risk_assistant_context,
): receipt_risk_assistant_suggestion[] {
  const currentTopDriverMarket =
    context.riskDriverComparison?.current_top_driver_market ?? null;
  const hasRecheckWatchlist = Boolean(context.recheckWatchlist);
  const hasMarketRegime = Boolean(context.marketRegime);
  const hasVolatilityBuffer = Boolean(context.volatilityBuffer);
  const suggestions = [
    {
      id: "review",
      label: "Review",
      question: "What should I review in this receipt?",
    },
    {
      id: "market",
      label: "Market",
      question: "What changed in the current market context?",
    },
    {
      id: "drivers",
      label: "Drivers",
      question: "Which risk drivers changed since the receipt?",
    },
    ...(hasRecheckWatchlist
      ? [
          {
            id: "watchlist",
            label: "Watchlist",
            question: "What should I inspect first in the recheck watchlist?",
          },
        ]
      : []),
    ...(hasMarketRegime
      ? [
          {
            id: "regime",
            label: "Regime",
            question: "What market regime is this receipt in?",
          },
        ]
      : []),
    ...(hasVolatilityBuffer
      ? [
          {
            id: "volatility",
            label: "Volatility",
            question: "What does the volatility buffer say?",
          },
        ]
      : []),
    ...(currentTopDriverMarket
      ? [
          {
            id: "top-driver-market",
            label: "Top market",
            question: `Why is ${currentTopDriverMarket} the current risk driver?`,
          },
        ]
      : []),
    {
      id: "liquidation",
      label: "Liquidation",
      question: "What changed around liquidation distance?",
    },
    {
      id: "funding",
      label: "Funding",
      question: "What changed around funding carry?",
    },
    {
      id: "hash",
      label: "Hash",
      question: "What does the receipt hash verify?",
    },
  ];

  if (context.accountValueContext) {
    return [
      ...suggestions,
      {
        id: "history",
        label: "History",
        question: "How does account-value history change the read?",
      },
    ];
  }

  return suggestions;
}
