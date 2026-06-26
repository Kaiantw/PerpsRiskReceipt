import {
  formatIsoDate,
  formatPercentFromBps,
  formatSignedBps,
  formatSignedUsd,
  formatUsd,
  truncateMiddle,
} from "../formatters.ts";
import type { receipt_risk_assistant_response } from "../assistant/receipt-risk-assistant.ts";
import type { funding_carry_watch } from "../funding/funding-watch.ts";
import type { funding_persistence_read } from "../funding/funding-persistence.ts";
import type {
  market_context,
  market_context_position,
} from "../market/market-context.ts";
import type { risk_receipt } from "../perps/types.ts";
import type { receipt_change_summary } from "./receipt-change-summary.ts";
import type { receipt_snapshot_drift } from "./receipt-snapshot-drift.ts";
import type {
  receipt_market_regime,
  receipt_market_regime_signal,
} from "./receipt-market-regime.ts";
import type {
  receipt_market_regime_drilldown,
  receipt_market_regime_drilldown_row,
} from "./receipt-market-regime-drilldown.ts";
import type { receipt_risk_driver_comparison } from "./receipt-risk-driver-comparison.ts";
import type {
  receipt_recheck_watch_item,
  receipt_recheck_watchlist,
} from "./receipt-recheck-watchlist.ts";
import type {
  receipt_recheck_history_summary,
} from "./receipt-recheck-history.ts";
import type {
  receipt_volatility_buffer,
  receipt_volatility_buffer_row,
} from "./receipt-volatility-buffer.ts";
import type { snapshot_comparison } from "./snapshot-comparison.ts";

export type receipt_review_packet = {
  title: string;
  summary: string;
  markdown: string;
};

export function buildReceiptReviewPacket(input: {
  changeSummary: receipt_change_summary;
  comparison: snapshot_comparison;
  hashVerified?: boolean;
  marketContext: market_context;
  marketRegime?: receipt_market_regime | null;
  marketRegimeDrilldown?: receipt_market_regime_drilldown | null;
  fundingCarryWatch?: funding_carry_watch | null;
  fundingPersistence?: funding_persistence_read | null;
  receipt: risk_receipt;
  recheckHistorySummary?: receipt_recheck_history_summary | null;
  riskDriverComparison: receipt_risk_driver_comparison;
  snapshotDrift?: receipt_snapshot_drift | null;
  volatilityBuffer?: receipt_volatility_buffer | null;
  watchlist: receipt_recheck_watchlist;
  watchlistAssistantResponse: receipt_risk_assistant_response;
}): receipt_review_packet {
  const title = `Review packet for ${input.receipt.id}`;
  const summary = `${input.changeSummary.headline} ${input.watchlist.headline}`;
  const markdown = [
    `# ${title}`,
    "",
    "## receipt",
    `- receipt id: ${input.receipt.id}`,
    `- account: ${truncateMiddle(input.receipt.snapshot.account, 12)}`,
    `- protocol: ${input.receipt.snapshot.protocol}`,
    `- created: ${formatIsoDate(input.receipt.created_at_iso)}`,
    `- data timestamp: ${formatIsoDate(input.receipt.snapshot.data_time_iso)}`,
    `- snapshot hash: ${input.receipt.snapshot_hash}`,
    `- hash verification: ${formatHashVerification(input.hashVerified)}`,
    `- saved risk: ${input.receipt.snapshot.aggregate.risk_score} (${input.receipt.snapshot.aggregate.risk_label})`,
    "",
    "## live recheck",
    `- status: ${input.comparison.status.replaceAll("_", " ")}`,
    `- summary: ${input.changeSummary.headline}`,
    `- detail: ${input.changeSummary.primary_detail}`,
    `- changed positions: ${input.comparison.changed_position_count}`,
    `- largest comparable mark move: ${input.comparison.max_abs_mark_price_change_percent.toFixed(2)}%`,
    "",
    ...formatSnapshotDriftSection(input.snapshotDrift ?? null),
    ...formatRecheckHistorySection(input.recheckHistorySummary ?? null),
    ...formatMarketRegimeSection(input.marketRegime ?? null),
    ...formatMarketRegimeDrilldownSection(
      input.marketRegimeDrilldown ?? null,
    ),
    "## risk drivers since receipt",
    `- saved top driver: ${input.riskDriverComparison.saved_top_driver_market ?? "n/a"}`,
    `- current top driver: ${input.riskDriverComparison.current_top_driver_market ?? "n/a"}`,
    `- top score delta: ${formatSignedNullableNumber(input.riskDriverComparison.top_driver_score_delta)}`,
    `- gross exposure delta: ${formatSignedPercentFromBps(input.riskDriverComparison.gross_exposure_delta_bps)}`,
    `- closest listed-buffer delta: ${formatSignedPercentFromBps(input.riskDriverComparison.closest_liquidation_distance_delta_bps)}`,
    `- daily funding delta: ${formatSignedNullableUsd(input.riskDriverComparison.daily_funding_delta_usd)}`,
    "",
    ...formatFundingCarryWatchSection(input.fundingCarryWatch ?? null),
    ...formatFundingPersistenceSection(input.fundingPersistence ?? null),
    ...formatVolatilityBufferSection(input.volatilityBuffer ?? null),
    "## recheck watchlist",
    `- label: ${input.watchlist.label.replaceAll("_", " ")}`,
    `- counts: ${input.watchlist.high_count} high, ${input.watchlist.watch_count} watch, ${input.watchlist.info_count} info`,
    ...formatWatchlistItems(input.watchlist.items),
    "",
    "## review thresholds",
    ...formatReviewThresholds(input.watchlist),
    "",
    "## assistant read",
    input.watchlistAssistantResponse.answer,
    "",
    "citations:",
    ...input.watchlistAssistantResponse.citations.map(
      (citation) => `- ${citation}`,
    ),
    "",
    "## market context",
    `- headline: ${input.marketContext.headline}`,
    `- summary: ${input.marketContext.summary}`,
    ...formatMarketContextRows(input.marketContext.positions),
    "",
    "## limitations",
    "- Read-only review packet. No trading, order placement, leverage, hedging, or position-change recommendation.",
    "- Snapshot hash verifies the saved JSON snapshot, not whether external market data was correct at capture time.",
    "- Listed liquidation distance, risk drivers, watchlist items, and funding deltas are heuristic app context, not Hyperliquid official risk calculations.",
    "- Use a full portable receipt bundle when another browser needs to recompute the snapshot hash.",
  ].join("\n");

  return { title, summary, markdown };
}

function formatHashVerification(hashVerified: boolean | undefined) {
  if (hashVerified === true) {
    return "verified on this page";
  }

  if (hashVerified === false) {
    return "mismatch on this page";
  }

  return "not checked in this packet context";
}

function formatSignedNullableNumber(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  if (value === 0) {
    return "0";
  }

  return `${value > 0 ? "+" : "-"}${Math.abs(value).toFixed(2)}`;
}

function formatSnapshotDriftSection(
  snapshotDrift: receipt_snapshot_drift | null,
) {
  if (!snapshotDrift) {
    return [];
  }

  return [
    "## snapshot drift",
    `- label: ${snapshotDrift.label.replaceAll("_", " ")}`,
    `- headline: ${snapshotDrift.headline}`,
    `- drift score: ${snapshotDrift.drift_score}/100`,
    `- receipt age: ${formatAgeMinutes(snapshotDrift.age_minutes)}`,
    `- focus market: ${snapshotDrift.focus_market ?? "n/a"}`,
    `- max mark move: ${snapshotDrift.metrics.max_mark_move_percent.toFixed(2)}%`,
    `- current min listed buffer: ${formatPercentFromBps(snapshotDrift.metrics.current_min_liquidation_distance_bps)}`,
    `- daily funding delta: ${formatSignedNullableUsd(snapshotDrift.metrics.total_daily_funding_delta_usd)}`,
    `- watchlist counts: ${snapshotDrift.metrics.high_cue_count} high, ${snapshotDrift.metrics.watch_cue_count} watch`,
    ...snapshotDrift.review_points
      .slice(0, 5)
      .map((point) => `- review: ${point}`),
    "",
  ];
}

function formatSignedRiskScoreDelta(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  if (value === 0) {
    return "0";
  }

  return `${value > 0 ? "+" : "-"}${Math.abs(value)}`;
}

function formatSignedPercentFromBps(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return `${formatSignedNullableNumber(value / 100)} percentage points`;
}

function formatSignedNullableUsd(value: number | null) {
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

function formatWatchlistItems(items: receipt_recheck_watch_item[]) {
  if (items.length === 0) {
    return ["- no ranked watchlist items crossed the current app thresholds"];
  }

  return items.slice(0, 5).flatMap((item) => [
    `- [${item.severity}] ${item.market}: ${item.title}`,
    `  - detail: ${item.detail}`,
    ...item.review_points.map((point) => `  - review: ${point}`),
  ]);
}

function formatRecheckHistorySection(
  historySummary: receipt_recheck_history_summary | null,
) {
  if (!historySummary || historySummary.entry_count === 0) {
    return [];
  }

  const repeatedFocusMarket = historySummary.most_repeated_focus_market
    ? `${historySummary.most_repeated_focus_market} (${historySummary.most_repeated_focus_market_count}/${historySummary.entry_count} saved checks)`
    : "n/a";

  return [
    "## local recheck history",
    `- trend: ${historySummary.label.replaceAll("_", " ")}`,
    `- headline: ${historySummary.headline}`,
    `- summary: ${historySummary.summary}`,
    `- saved checks: ${historySummary.entry_count}`,
    `- latest risk: ${formatNullableRiskScore(historySummary.latest_risk_score, historySummary.latest_risk_label)}`,
    `- oldest risk: ${formatNullableRiskScore(historySummary.oldest_risk_score, historySummary.oldest_risk_label)}`,
    `- risk-score delta: ${formatSignedRiskScoreDelta(historySummary.risk_score_delta)}`,
    `- latest snapshot drift: ${formatNullableDriftScore(historySummary.latest_snapshot_drift_score, historySummary.latest_snapshot_drift_label)}`,
    `- oldest snapshot drift: ${formatNullableDriftScore(historySummary.oldest_snapshot_drift_score, historySummary.oldest_snapshot_drift_label)}`,
    `- snapshot-drift delta: ${formatSignedRiskScoreDelta(historySummary.snapshot_drift_score_delta)}`,
    `- regime: ${historySummary.oldest_regime_label ?? "n/a"} -> ${historySummary.latest_regime_label ?? "n/a"}`,
    `- repeated focus market: ${repeatedFocusMarket}`,
    `- latest watchlist counts: ${historySummary.latest_watchlist_high_count} high, ${historySummary.latest_watchlist_watch_count} watch, ${historySummary.latest_watchlist_info_count} info`,
    `- volatility context: loaded in ${historySummary.volatility_loaded_count} of ${historySummary.entry_count} saved rows`,
    ...historySummary.review_points
      .slice(0, 4)
      .map((point) => `- review: ${point}`),
    "- note: compact browser-local trend only; full history rows and full private snapshots are not included in this packet.",
    "",
  ];
}

function formatFundingCarryWatchSection(
  fundingCarryWatch: funding_carry_watch | null,
) {
  if (!fundingCarryWatch) {
    return [];
  }

  const lines = [
    "## current funding window",
    `- label: ${fundingCarryWatch.label.replaceAll("_", " ")}`,
    `- summary: ${fundingCarryWatch.summary}`,
    `- next hourly net: ${formatSignedUsd(fundingCarryWatch.next_hour_net_funding_usd)}`,
    `- 8h rate basis net: ${formatSignedUsd(fundingCarryWatch.eight_hour_rate_net_funding_usd)}`,
    `- daily net: ${formatSignedUsd(fundingCarryWatch.daily_net_funding_usd)}`,
    `- hourly burden: ${formatNullableBps(fundingCarryWatch.next_hour_funding_bps_of_account_value)}`,
    `- largest next cost: ${formatFundingPosition(fundingCarryWatch.top_cost_position)}`,
    `- largest next earn: ${formatFundingPosition(fundingCarryWatch.top_earning_position)}`,
    ...fundingCarryWatch.review_points
      .slice(0, 5)
      .map((point) => `- review: ${point}`),
  ];

  if (fundingCarryWatch.positions.length > 0) {
    lines.push(
      "- positions:",
      ...fundingCarryWatch.positions.slice(0, 5).map((position) =>
        [
          `  - ${position.market} ${position.side}`,
          `funding 8h ${formatSignedBps(position.funding_8h_bps_user_perspective)}`,
          `next hour ${formatSignedUsd(position.next_hour_funding_usd)}`,
          `daily ${formatSignedUsd(position.daily_funding_usd)}`,
        ].join("; "),
      ),
    );
  }

  lines.push("");

  return lines;
}

function formatFundingPosition(
  position: funding_carry_watch["top_cost_position"],
) {
  if (!position) {
    return "n/a";
  }

  return `${position.market} ${formatSignedUsd(position.next_hour_funding_usd)}`;
}

function formatFundingPersistenceSection(
  fundingPersistence: funding_persistence_read | null,
) {
  if (!fundingPersistence) {
    return [];
  }

  const lines = [
    "## recent funding persistence",
    `- label: ${fundingPersistence.label.replaceAll("_", " ")}`,
    `- headline: ${fundingPersistence.headline}`,
    `- summary: ${fundingPersistence.summary}`,
    `- focus market: ${fundingPersistence.focus_market ?? "n/a"}`,
    `- matched markets: ${fundingPersistence.matched_market_count}/${fundingPersistence.positions.length}`,
    `- window: ${fundingPersistence.window_hours}h ${fundingPersistence.interval}`,
    `- fetched: ${formatIsoDate(fundingPersistence.fetched_at_iso)}`,
    ...fundingPersistence.review_points
      .slice(0, 5)
      .map((point) => `- review: ${point}`),
  ];

  if (fundingPersistence.positions.length > 0) {
    lines.push(
      "- positions:",
      ...fundingPersistence.positions.slice(0, 5).map((position) =>
        [
          `  - ${position.market} ${position.side}`,
          `label ${position.label.replaceAll("_", " ")}`,
          `avg 8h ${formatNullableSignedBps(position.average_funding_8h_bps_user_perspective)}`,
          `latest 8h ${formatNullableSignedBps(position.latest_funding_8h_bps_user_perspective)}`,
          `avg daily ${formatSignedNullableUsd(position.estimated_average_daily_funding_usd)}`,
        ].join("; "),
      ),
    );
  }

  lines.push("");

  return lines;
}

function formatVolatilityBufferSection(
  volatilityBuffer: receipt_volatility_buffer | null,
) {
  if (!volatilityBuffer) {
    return [];
  }

  return [
    "## volatility buffer",
    `- label: ${volatilityBuffer.label.replaceAll("_", " ")}`,
    `- headline: ${volatilityBuffer.headline}`,
    `- focus market: ${volatilityBuffer.focus_market ?? "n/a"}`,
    `- counts: ${volatilityBuffer.high_count} high, ${volatilityBuffer.watch_count} watch, ${volatilityBuffer.info_count} info`,
    `- window: ${volatilityBuffer.window_hours}h ${volatilityBuffer.interval}`,
    ...formatVolatilityBufferRows(volatilityBuffer.rows),
    "",
  ];
}

function formatMarketRegimeSection(marketRegime: receipt_market_regime | null) {
  if (!marketRegime) {
    return [];
  }

  return [
    "## market regime",
    `- label: ${marketRegime.label.replaceAll("_", " ")}`,
    `- headline: ${marketRegime.headline}`,
    `- focus market: ${marketRegime.focus_market ?? "n/a"}`,
    `- counts: ${marketRegime.critical_count} critical, ${marketRegime.high_count} high, ${marketRegime.watch_count} watch, ${marketRegime.info_count} info`,
    ...formatMarketRegimeSignals(marketRegime.signals),
    "",
  ];
}

function formatMarketRegimeSignals(signals: receipt_market_regime_signal[]) {
  if (signals.length === 0) {
    return ["- no market-regime signals crossed the current app thresholds"];
  }

  return signals.slice(0, 5).flatMap((signal) => [
    `- [${signal.severity}] ${signal.category.replaceAll("_", " ")}: ${signal.title}`,
    `  - detail: ${signal.detail}`,
    ...signal.review_points.map((point) => `  - review: ${point}`),
  ]);
}

function formatMarketRegimeDrilldownSection(
  drilldown: receipt_market_regime_drilldown | null,
) {
  if (!drilldown) {
    return [];
  }

  return [
    "## regime by market",
    `- focus market: ${drilldown.focus_market ?? "n/a"}`,
    `- counts: ${drilldown.critical_count} critical, ${drilldown.high_count} high, ${drilldown.watch_count} watch, ${drilldown.info_count} info`,
    ...formatMarketRegimeDrilldownRows(drilldown.rows),
    "",
  ];
}

function formatMarketRegimeDrilldownRows(
  rows: receipt_market_regime_drilldown_row[],
) {
  if (rows.length === 0) {
    return ["- no per-market regime rows are available"];
  }

  return rows.slice(0, 5).flatMap((row) => [
    `- [${row.severity}] ${row.market}: ${row.primary_cue}`,
    `  - summary: ${row.summary}`,
    `  - current listed buffer: ${formatPercentFromBps(row.current_liquidation_distance_bps)}`,
    `  - funding burden: ${formatNullableBps(row.current_funding_burden_bps)}/day`,
    `  - mark move: ${formatSignedNullablePercent(row.mark_price_change_percent)}`,
    `  - volatility: ${row.volatility_severity ?? "not loaded"}`,
    `  - open-interest delta: ${formatSignedNullableUsd(row.open_interest_delta_usd)}`,
    ...row.review_points.slice(0, 2).map((point) => `  - review: ${point}`),
  ]);
}

function formatVolatilityBufferRows(rows: receipt_volatility_buffer_row[]) {
  if (rows.length === 0) {
    return ["- no volatility-buffer rows are available"];
  }

  return rows.slice(0, 5).flatMap((row) => [
    `- [${row.severity}] ${row.market}: ${row.summary}`,
    `  - current listed buffer: ${formatNullablePercent(row.current_liquidation_distance_percent)}`,
    `  - 24h range: ${formatNullablePercent(row.high_low_range_percent)}`,
    `  - average true range: ${formatNullablePercent(row.average_true_range_percent)}`,
    `  - ATR buffer multiple: ${formatNullableMultiple(row.atr_buffer_multiple)}`,
  ]);
}

function formatReviewThresholds(watchlist: receipt_recheck_watchlist) {
  const thresholds = watchlist.thresholds;

  return [
    `- thin listed buffer: ${formatPercentFromBps(thresholds.thin_liquidation_distance_bps)}`,
    `- tight listed buffer: ${formatPercentFromBps(thresholds.tight_liquidation_distance_bps)}`,
    `- adverse mark move: ${formatPlainNumber(thresholds.material_mark_move_percent)}%`,
    `- driver score delta: ${formatPlainNumber(thresholds.material_driver_score_delta)} points`,
    `- daily funding delta: ${formatUsd(thresholds.material_daily_funding_usd)}`,
    `- 8h funding delta: ${formatPlainNumber(thresholds.material_funding_8h_bps)} bps`,
    `- open-interest delta: ${formatUsd(thresholds.material_open_interest_delta_usd)}`,
  ];
}

function formatNullablePercent(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return `${value.toFixed(2)}%`;
}

function formatSignedNullablePercent(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return `${formatSignedNullableNumber(value)}%`;
}

function formatNullableBps(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return `${value.toFixed(2)} bps`;
}

function formatNullableMultiple(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return `${value.toFixed(2)}x`;
}

function formatNullableRiskScore(
  score: number | null,
  label: string | null,
) {
  if (score === null) {
    return "n/a";
  }

  return `${score} (${label ?? "n/a"})`;
}

function formatNullableDriftScore(
  score: number | null,
  label: string | null,
) {
  if (score === null) {
    return "n/a";
  }

  return `${score}/100 (${label?.replaceAll("_", " ") ?? "n/a"})`;
}

function formatAgeMinutes(value: number | null) {
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

function formatPlainNumber(value: number) {
  if (Number.isInteger(value)) {
    return value.toFixed(0);
  }

  return value.toFixed(2);
}

function formatMetricMove(
  input: {
    current_value: number | null;
    delta: number | null;
    receipt_value: number | null;
  },
  formatter: (value: number | null) => string,
) {
  return `${formatter(input.receipt_value)} -> ${formatter(input.current_value)} (delta ${formatter(input.delta)})`;
}

function formatMarketContextRows(positions: market_context_position[]) {
  if (positions.length === 0) {
    return ["- no saved/current market-context rows are available"];
  }

  return positions.slice(0, 5).flatMap((position) => [
    `- ${position.market}: ${position.summary}`,
    `  - mark: ${formatMetricMove(position.mark_price_usd, formatNullableUsd)}`,
    `  - listed liquidation distance: ${formatMetricMove(position.liquidation_distance_bps, formatPercentFromBps)}`,
    `  - 8h funding: ${formatMetricMove(position.funding_8h_bps_user_perspective, formatNullableSignedBps)}`,
    `  - daily funding: ${formatMetricMove(position.daily_funding_usd, formatSignedNullableUsd)}`,
    `  - open interest: ${formatMetricMove(position.open_interest_usd, formatNullableUsd)}`,
  ]);
}
