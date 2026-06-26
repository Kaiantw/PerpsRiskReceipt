import {
  formatIsoDate,
  formatPercentFromBps,
  formatSignedBps,
  formatSignedUsd,
  formatUsd,
  truncateMiddle,
} from "../formatters.ts";
import type { receipt_risk_assistant_response } from "../assistant/receipt-risk-assistant.ts";
import type {
  market_context,
  market_context_position,
} from "../market/market-context.ts";
import type { risk_receipt } from "../perps/types.ts";
import type { receipt_change_summary } from "./receipt-change-summary.ts";
import type { receipt_risk_driver_comparison } from "./receipt-risk-driver-comparison.ts";
import type {
  receipt_recheck_watch_item,
  receipt_recheck_watchlist,
} from "./receipt-recheck-watchlist.ts";
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
  receipt: risk_receipt;
  riskDriverComparison: receipt_risk_driver_comparison;
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
    "## risk drivers since receipt",
    `- saved top driver: ${input.riskDriverComparison.saved_top_driver_market ?? "n/a"}`,
    `- current top driver: ${input.riskDriverComparison.current_top_driver_market ?? "n/a"}`,
    `- top score delta: ${formatSignedNullableNumber(input.riskDriverComparison.top_driver_score_delta)}`,
    `- gross exposure delta: ${formatSignedPercentFromBps(input.riskDriverComparison.gross_exposure_delta_bps)}`,
    `- closest listed-buffer delta: ${formatSignedPercentFromBps(input.riskDriverComparison.closest_liquidation_distance_delta_bps)}`,
    `- daily funding delta: ${formatSignedNullableUsd(input.riskDriverComparison.daily_funding_delta_usd)}`,
    "",
    "## recheck watchlist",
    `- label: ${input.watchlist.label.replaceAll("_", " ")}`,
    `- counts: ${input.watchlist.high_count} high, ${input.watchlist.watch_count} watch, ${input.watchlist.info_count} info`,
    ...formatWatchlistItems(input.watchlist.items),
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
