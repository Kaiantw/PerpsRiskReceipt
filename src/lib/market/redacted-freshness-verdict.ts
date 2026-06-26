import type {
  redacted_market_context,
  redacted_market_context_row,
} from "./redacted-market-context.ts";
import type {
  redacted_market_trend,
  redacted_market_trend_row,
} from "./redacted-market-trend.ts";
import type {
  redacted_market_watchlist,
} from "./redacted-market-watchlist.ts";
import type {
  redacted_receipt_bundle,
  redacted_receipt_market,
} from "../receipts/portable-receipt-bundle.ts";

const WATCH_AGE_MINUTES = 4 * 60;
const HIGH_AGE_MINUTES = 24 * 60;
const THIN_LIQUIDATION_DISTANCE_BPS = 500;
const TIGHT_LIQUIDATION_DISTANCE_BPS = 1_000;
const MATERIAL_PRICE_MOVE_PERCENT = 2;
const MATERIAL_FUNDING_MOVE_BPS = 1;
const HIGH_FUNDING_MOVE_BPS = 3;
const RANGE_TO_BUFFER_WATCH_RATIO = 0.5;
const RANGE_TO_BUFFER_HIGH_RATIO = 1;

export type redacted_freshness_verdict_label =
  | "reviewable"
  | "stale_but_informative"
  | "needs_full_recheck";

export type redacted_freshness_verdict_severity = "info" | "watch" | "high";

export type redacted_freshness_verdict_category =
  | "receipt_age"
  | "market_context"
  | "trend_context"
  | "watchlist"
  | "liquidation_buffer"
  | "volatility_range"
  | "adverse_trend"
  | "funding_change";

export type redacted_freshness_verdict_driver = {
  id: string;
  severity: redacted_freshness_verdict_severity;
  category: redacted_freshness_verdict_category;
  title: string;
  detail: string;
  citations: string[];
  review_points: string[];
};

export type redacted_freshness_verdict = {
  label: redacted_freshness_verdict_label;
  headline: string;
  summary: string;
  age_minutes: number | null;
  age_label: string;
  signal_score: number;
  driver_count: number;
  high_count: number;
  watch_count: number;
  info_count: number;
  drivers: redacted_freshness_verdict_driver[];
  review_points: string[];
  citations: string[];
};

export function buildRedactedFreshnessVerdict(input: {
  bundle: redacted_receipt_bundle;
  marketContext?: redacted_market_context;
  marketTrend?: redacted_market_trend;
  watchlist: redacted_market_watchlist;
  nowIso?: string;
}): redacted_freshness_verdict {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const ageMinutes = getAgeMinutes({
    dataTimeIso: input.bundle.data_time_iso,
    nowIso,
  });
  const contextRowsByMarket = getRowsByMarket(input.marketContext?.rows ?? []);
  const trendRowsByMarket = getRowsByMarket(input.marketTrend?.rows ?? []);
  const drivers = [
    getAgeDriver({ bundle: input.bundle, ageMinutes, nowIso }),
    getMarketContextDriver(input.marketContext),
    getTrendContextDriver(input.marketTrend),
    getWatchlistDriver(input.watchlist),
    getLiquidationBufferDriver(input.bundle),
    ...input.bundle.markets.flatMap((market) =>
      getMarketDrivers({
        market,
        contextRow: contextRowsByMarket.get(market.market),
        trendRow: trendRowsByMarket.get(market.market),
      }),
    ),
  ]
    .filter(isVerdictDriver)
    .sort(compareDrivers);
  const highCount = drivers.filter((driver) => driver.severity === "high").length;
  const watchCount = drivers.filter(
    (driver) => driver.severity === "watch",
  ).length;
  const infoCount = drivers.filter((driver) => driver.severity === "info").length;
  const label = getVerdictLabel({ highCount, watchCount });

  return {
    label,
    headline: getHeadline(label),
    summary: getSummary(label),
    age_minutes: ageMinutes,
    age_label: formatAge(ageMinutes),
    signal_score: getSignalScore({ highCount, watchCount, infoCount }),
    driver_count: drivers.length,
    high_count: highCount,
    watch_count: watchCount,
    info_count: infoCount,
    drivers,
    review_points: getReviewPoints(label),
    citations: getVerdictCitations(drivers),
  };
}

function getAgeMinutes(input: { dataTimeIso: string; nowIso: string }) {
  const dataTimeMs = Date.parse(input.dataTimeIso);
  const nowMs = Date.parse(input.nowIso);

  if (!Number.isFinite(dataTimeMs) || !Number.isFinite(nowMs)) {
    return null;
  }

  return Math.max(0, Math.floor((nowMs - dataTimeMs) / 60_000));
}

function getAgeDriver(input: {
  bundle: redacted_receipt_bundle;
  ageMinutes: number | null;
  nowIso: string;
}): redacted_freshness_verdict_driver {
  if (input.ageMinutes === null) {
    return {
      id: "receipt-age:invalid",
      severity: "watch",
      category: "receipt_age",
      title: "Receipt age could not be computed",
      detail:
        "The redacted share timestamp or local comparison time could not be parsed.",
      citations: [
        "redacted_receipt.data_time_iso",
        "redacted_freshness_verdict.now_iso",
      ],
      review_points: [
        "Confirm the receipt timestamp before treating the share as current context.",
      ],
    };
  }

  if (input.ageMinutes >= HIGH_AGE_MINUTES) {
    return {
      id: "receipt-age:high",
      severity: "high",
      category: "receipt_age",
      title: "Receipt is older than 24 hours",
      detail: `The redacted data timestamp is ${formatAge(
        input.ageMinutes,
      )} behind the review time.`,
      citations: [
        "redacted_receipt.data_time_iso",
        "redacted_receipt.exported_at_iso",
        "redacted_freshness_verdict.now_iso",
      ],
      review_points: [
        "Use the full bundle or live account lookup when exact current risk matters.",
      ],
    };
  }

  if (input.ageMinutes >= WATCH_AGE_MINUTES) {
    return {
      id: "receipt-age:watch",
      severity: "watch",
      category: "receipt_age",
      title: "Receipt is more than four hours old",
      detail: `The redacted data timestamp is ${formatAge(
        input.ageMinutes,
      )} behind the review time.`,
      citations: [
        "redacted_receipt.data_time_iso",
        "redacted_receipt.exported_at_iso",
        "redacted_freshness_verdict.now_iso",
      ],
      review_points: [
        "Read the share as a historical snapshot unless loaded public context still looks calm.",
      ],
    };
  }

  return {
    id: "receipt-age:recent",
    severity: "info",
    category: "receipt_age",
    title: "Receipt timestamp is recent",
    detail: `The redacted data timestamp is ${formatAge(
      input.ageMinutes,
    )} behind the review time.`,
    citations: [
      "redacted_receipt.data_time_iso",
      "redacted_receipt.exported_at_iso",
      "redacted_freshness_verdict.now_iso",
    ],
    review_points: [
      "Freshness still depends on public market movement and disclosed liquidation buffer.",
    ],
  };
}

function getMarketContextDriver(
  marketContext: redacted_market_context | undefined,
): redacted_freshness_verdict_driver {
  if (!marketContext) {
    return {
      id: "market-context:not-loaded",
      severity: "watch",
      category: "market_context",
      title: "Current public market context is not loaded",
      detail:
        "The verdict has no current public mark, funding, open-interest, or volume context for disclosed markets.",
      citations: ["redacted_market_context"],
      review_points: [
        "Load current markets before comparing a stale redacted share with today's public market state.",
      ],
    };
  }

  if (marketContext.matched_market_count === 0 && marketContext.rows.length > 0) {
    return {
      id: "market-context:none-matched",
      severity: "watch",
      category: "market_context",
      title: "Current public market context did not match disclosed markets",
      detail:
        "The app tried to load current Hyperliquid context, but no disclosed market rows were matched.",
      citations: [
        "redacted_market_context.matched_market_count",
        "redacted_market_context.rows",
      ],
      review_points: [
        "Treat current mark, funding, and open-interest comparison as unavailable for this share.",
      ],
    };
  }

  if (marketContext.matched_market_count < marketContext.rows.length) {
    return {
      id: "market-context:partial",
      severity: "info",
      category: "market_context",
      title: "Current public market context is partially loaded",
      detail: `Matched ${marketContext.matched_market_count}/${marketContext.rows.length} disclosed markets.`,
      citations: [
        "redacted_market_context.matched_market_count",
        "redacted_market_context.rows",
      ],
      review_points: [
        "Review unmatched markets manually if they drive the redacted risk summary.",
      ],
    };
  }

  return {
    id: "market-context:loaded",
    severity: "info",
    category: "market_context",
    title: "Current public market context is loaded",
    detail: `Matched ${marketContext.matched_market_count}/${marketContext.rows.length} disclosed markets.`,
    citations: [
      "redacted_market_context.fetched_at_iso",
      "redacted_market_context.matched_market_count",
    ],
    review_points: [
      "Current context is public market context only; hidden account fields remain unavailable.",
    ],
  };
}

function getTrendContextDriver(
  marketTrend: redacted_market_trend | undefined,
): redacted_freshness_verdict_driver {
  if (!marketTrend) {
    return {
      id: "trend-context:not-loaded",
      severity: "watch",
      category: "trend_context",
      title: "Public 24h trend context is not loaded",
      detail:
        "The verdict has no 24h candle range or funding-history context for disclosed markets.",
      citations: ["redacted_market_trend"],
      review_points: [
        "Load 24h trends before deciding whether a redacted snapshot has aged through meaningful public movement.",
      ],
    };
  }

  if (marketTrend.matched_market_count === 0 && marketTrend.rows.length > 0) {
    return {
      id: "trend-context:none-matched",
      severity: "watch",
      category: "trend_context",
      title: "Public 24h trend context did not match disclosed markets",
      detail:
        "The app tried to load 24h Hyperliquid history, but no disclosed market rows were matched.",
      citations: [
        "redacted_market_trend.matched_market_count",
        "redacted_market_trend.rows",
      ],
      review_points: [
        "Treat recent range, adverse trend, and funding-history checks as unavailable.",
      ],
    };
  }

  if (marketTrend.matched_market_count < marketTrend.rows.length) {
    return {
      id: "trend-context:partial",
      severity: "info",
      category: "trend_context",
      title: "Public 24h trend context is partially loaded",
      detail: `Matched ${marketTrend.matched_market_count}/${marketTrend.rows.length} disclosed markets.`,
      citations: [
        "redacted_market_trend.matched_market_count",
        "redacted_market_trend.rows",
      ],
      review_points: [
        "Review unmatched markets manually if they are near the disclosed liquidation buffer.",
      ],
    };
  }

  return {
    id: "trend-context:loaded",
    severity: "info",
    category: "trend_context",
    title: "Public 24h trend context is loaded",
    detail: `Matched ${marketTrend.matched_market_count}/${marketTrend.rows.length} disclosed markets.`,
    citations: [
      "redacted_market_trend.fetched_at_iso",
      "redacted_market_trend.matched_market_count",
    ],
    review_points: [
      "Trend context can show public movement, but not the hidden saved mark or exact account equity.",
    ],
  };
}

function getWatchlistDriver(
  watchlist: redacted_market_watchlist,
): redacted_freshness_verdict_driver | null {
  if (watchlist.high_count > 0) {
    return {
      id: "watchlist:high",
      severity: "high",
      category: "watchlist",
      title: "High-attention review cues are present",
      detail: `${watchlist.high_count} high and ${watchlist.watch_count} watch cues are ranked in the redacted market watchlist.`,
      citations: [
        "redacted_market_watchlist.high_count",
        "redacted_market_watchlist.watch_count",
        "redacted_market_watchlist.headline",
      ],
      review_points: [
        "Inspect the top watchlist cues before treating the redacted share as current.",
      ],
    };
  }

  if (watchlist.watch_count > 0) {
    return {
      id: "watchlist:watch",
      severity: "watch",
      category: "watchlist",
      title: "Watch-level review cues are present",
      detail: `${watchlist.watch_count} watch cues are ranked in the redacted market watchlist.`,
      citations: [
        "redacted_market_watchlist.watch_count",
        "redacted_market_watchlist.headline",
      ],
      review_points: [
        "Use the watchlist as the first-pass checklist for reading stale public context.",
      ],
    };
  }

  return null;
}

function getLiquidationBufferDriver(
  bundle: redacted_receipt_bundle,
): redacted_freshness_verdict_driver | null {
  const liquidationDistanceBps =
    bundle.aggregate.min_liquidation_distance_bps;

  if (bundle.aggregate.position_count > 0 && liquidationDistanceBps === null) {
    return {
      id: "liquidation-buffer:missing",
      severity: "watch",
      category: "liquidation_buffer",
      title: "No disclosed liquidation buffer is available",
      detail:
        "The redacted share has positions but no minimum disclosed liquidation distance.",
      citations: [
        "redacted_receipt.aggregate.position_count",
        "redacted_receipt.aggregate.min_liquidation_distance_bps",
      ],
      review_points: [
        "Use the full bundle if liquidation-distance review is required.",
      ],
    };
  }

  if (liquidationDistanceBps === null) {
    return null;
  }

  if (liquidationDistanceBps <= THIN_LIQUIDATION_DISTANCE_BPS) {
    return {
      id: "liquidation-buffer:thin",
      severity: "high",
      category: "liquidation_buffer",
      title: "Minimum disclosed liquidation buffer is thin",
      detail: `The redacted aggregate minimum liquidation distance is ${formatBpsAsPercent(
        liquidationDistanceBps,
      )}.`,
      citations: [
        "redacted_receipt.aggregate.min_liquidation_distance_bps",
      ],
      review_points: [
        "Compare this buffer with public price range before treating the snapshot as representative.",
      ],
    };
  }

  if (liquidationDistanceBps <= TIGHT_LIQUIDATION_DISTANCE_BPS) {
    return {
      id: "liquidation-buffer:tight",
      severity: "watch",
      category: "liquidation_buffer",
      title: "Minimum disclosed liquidation buffer is tight",
      detail: `The redacted aggregate minimum liquidation distance is ${formatBpsAsPercent(
        liquidationDistanceBps,
      )}.`,
      citations: [
        "redacted_receipt.aggregate.min_liquidation_distance_bps",
      ],
      review_points: [
        "Review whether recent public movement used a meaningful share of the disclosed buffer.",
      ],
    };
  }

  return null;
}

function getMarketDrivers(input: {
  market: redacted_receipt_market;
  contextRow: redacted_market_context_row | undefined;
  trendRow: redacted_market_trend_row | undefined;
}) {
  return [
    getRangeDriver(input),
    getAdverseTrendDriver(input),
    getFundingChangeDriver(input),
  ].filter(isVerdictDriver);
}

function getRangeDriver(input: {
  market: redacted_receipt_market;
  trendRow: redacted_market_trend_row | undefined;
}): redacted_freshness_verdict_driver | null {
  const rangePercent = input.trendRow?.high_low_range_percent;
  const liquidationDistanceBps = input.market.liquidation_distance_bps;

  if (
    rangePercent === null ||
    rangePercent === undefined ||
    liquidationDistanceBps === null
  ) {
    return null;
  }

  const rangeBps = rangePercent * 100;
  const highThresholdBps =
    liquidationDistanceBps * RANGE_TO_BUFFER_HIGH_RATIO;
  const watchThresholdBps =
    liquidationDistanceBps * RANGE_TO_BUFFER_WATCH_RATIO;

  if (rangeBps >= highThresholdBps) {
    return {
      id: `${input.market.market}:range:exceeded-buffer`,
      severity: "high",
      category: "volatility_range",
      title: "24h range reached the disclosed buffer",
      detail: `${input.market.market} public 24h high/low range is ${formatPercent(
        rangePercent,
      )}, versus a ${formatBpsAsPercent(
        liquidationDistanceBps,
      )} disclosed liquidation distance.`,
      citations: [
        `redacted_market_trend.rows.${input.market.market}.high_low_range_percent`,
        `redacted_receipt.markets.${input.market.market}.liquidation_distance_bps`,
      ],
      review_points: [
        "Use full receipt or live account context before treating the redacted liquidation read as current.",
      ],
    };
  }

  if (rangeBps >= watchThresholdBps) {
    return {
      id: `${input.market.market}:range:used-half-buffer`,
      severity: "watch",
      category: "volatility_range",
      title: "24h range used a meaningful share of the disclosed buffer",
      detail: `${input.market.market} public 24h high/low range is ${formatPercent(
        rangePercent,
      )}, versus a ${formatBpsAsPercent(
        liquidationDistanceBps,
      )} disclosed liquidation distance.`,
      citations: [
        `redacted_market_trend.rows.${input.market.market}.high_low_range_percent`,
        `redacted_receipt.markets.${input.market.market}.liquidation_distance_bps`,
      ],
      review_points: [
        "Read the saved risk score alongside the 24h range, not as a live score.",
      ],
    };
  }

  return null;
}

function getAdverseTrendDriver(input: {
  market: redacted_receipt_market;
  trendRow: redacted_market_trend_row | undefined;
}): redacted_freshness_verdict_driver | null {
  const priceChangePercent = input.trendRow?.price_change_percent;

  if (
    priceChangePercent === null ||
    priceChangePercent === undefined ||
    !isAdversePriceMove(input.market, priceChangePercent)
  ) {
    return null;
  }

  const hasTightBuffer =
    input.market.liquidation_distance_bps !== null &&
    input.market.liquidation_distance_bps <= TIGHT_LIQUIDATION_DISTANCE_BPS;

  return {
    id: `${input.market.market}:adverse-trend`,
    severity: hasTightBuffer ? "high" : "watch",
    category: "adverse_trend",
    title: hasTightBuffer
      ? "Adverse 24h trend is near a disclosed buffer"
      : "Adverse 24h trend is present",
    detail: `${input.market.market} public 24h close-to-close move is ${formatSignedPercent(
      priceChangePercent,
    )}, adverse for the disclosed ${input.market.side} side.`,
    citations: [
      `redacted_market_trend.rows.${input.market.market}.price_change_percent`,
      `redacted_receipt.markets.${input.market.market}.side`,
      `redacted_receipt.markets.${input.market.market}.liquidation_distance_bps`,
    ],
    review_points: [
      "Review this against the receipt timestamp and disclosed buffer before treating the share as current.",
    ],
  };
}

function getFundingChangeDriver(input: {
  market: redacted_receipt_market;
  contextRow: redacted_market_context_row | undefined;
}): redacted_freshness_verdict_driver | null {
  const fundingDeltaBps = input.contextRow?.funding_delta_bps_user_perspective;

  if (
    fundingDeltaBps === null ||
    fundingDeltaBps === undefined ||
    Math.abs(fundingDeltaBps) <= MATERIAL_FUNDING_MOVE_BPS
  ) {
    return null;
  }

  const moreExpensive = fundingDeltaBps > 0;
  const isHigh =
    moreExpensive && fundingDeltaBps >= HIGH_FUNDING_MOVE_BPS;

  return {
    id: `${input.market.market}:funding-change`,
    severity: isHigh ? "high" : "watch",
    category: "funding_change",
    title: moreExpensive
      ? "Current funding is more expensive than the receipt"
      : "Current funding is more favorable than the receipt",
    detail: `${input.market.market} current side-adjusted funding moved ${formatSignedBps(
      fundingDeltaBps,
    )} versus the redacted receipt.`,
    citations: [
      `redacted_market_context.rows.${input.market.market}.funding_delta_bps_user_perspective`,
      `redacted_receipt.markets.${input.market.market}.funding_8h_bps_user_perspective`,
    ],
    review_points: [
      "Treat saved funding buckets as timestamped estimates when current funding has moved.",
    ],
  };
}

function getVerdictLabel(input: {
  highCount: number;
  watchCount: number;
}): redacted_freshness_verdict_label {
  if (input.highCount > 0) {
    return "needs_full_recheck";
  }

  if (input.watchCount > 0) {
    return "stale_but_informative";
  }

  return "reviewable";
}

function getHeadline(label: redacted_freshness_verdict_label) {
  switch (label) {
    case "reviewable":
      return "Redacted receipt is reviewable against loaded public context.";
    case "stale_but_informative":
      return "Redacted receipt is stale but still informative.";
    case "needs_full_recheck":
      return "Full receipt or live recheck is needed before relying on this share.";
  }
}

function getSummary(label: redacted_freshness_verdict_label) {
  switch (label) {
    case "reviewable":
      return "No high or watch freshness cues crossed thresholds from receipt age, disclosed buffer, watchlist, and loaded public context.";
    case "stale_but_informative":
      return "One or more watch-level cues changed enough that a reviewer should read this as historical context, not a live account state.";
    case "needs_full_recheck":
      return "At least one high cue suggests the redacted snapshot may no longer represent current risk; hidden full snapshot or live account context is required for exact verification.";
  }
}

function getReviewPoints(label: redacted_freshness_verdict_label) {
  switch (label) {
    case "reviewable":
      return [
        "Use the receipt as a shareable risk snapshot with loaded public context attached.",
        "Keep the hash scope in mind: redacted shares cannot recompute the original snapshot hash.",
      ];
    case "stale_but_informative":
      return [
        "Use the share to understand what was disclosed at the receipt timestamp.",
        "Load or refresh current market and 24h trend context before comparing it with today's market.",
      ];
    case "needs_full_recheck":
      return [
        "Use a full portable bundle or live read-only account lookup for exact risk review.",
        "Treat the redacted share as an audit artifact, not as current account state.",
      ];
  }
}

function getSignalScore(input: {
  highCount: number;
  watchCount: number;
  infoCount: number;
}) {
  return Math.min(
    100,
    input.highCount * 45 + input.watchCount * 20 + input.infoCount * 5,
  );
}

function getVerdictCitations(drivers: redacted_freshness_verdict_driver[]) {
  return Array.from(
    new Set([
      "redacted_freshness_verdict.label",
      "redacted_freshness_verdict.signal_score",
      ...drivers.flatMap((driver) => driver.citations),
    ]),
  );
}

function compareDrivers(
  firstDriver: redacted_freshness_verdict_driver,
  secondDriver: redacted_freshness_verdict_driver,
) {
  const severityDifference =
    getSeverityRank(secondDriver.severity) -
    getSeverityRank(firstDriver.severity);

  if (severityDifference !== 0) {
    return severityDifference;
  }

  return firstDriver.id.localeCompare(secondDriver.id);
}

function getRowsByMarket<Row extends { market: string }>(rows: Row[]) {
  return new Map(rows.map((row) => [row.market, row]));
}

function isAdversePriceMove(
  market: redacted_receipt_market,
  priceChangePercent: number,
) {
  return market.side === "long"
    ? priceChangePercent <= -MATERIAL_PRICE_MOVE_PERCENT
    : priceChangePercent >= MATERIAL_PRICE_MOVE_PERCENT;
}

function isVerdictDriver(
  driver: redacted_freshness_verdict_driver | null,
): driver is redacted_freshness_verdict_driver {
  return driver !== null;
}

function getSeverityRank(severity: redacted_freshness_verdict_severity) {
  switch (severity) {
    case "high":
      return 3;
    case "watch":
      return 2;
    case "info":
      return 1;
  }
}

function formatAge(ageMinutes: number | null) {
  if (ageMinutes === null) {
    return "unknown age";
  }

  if (ageMinutes < 60) {
    return `${ageMinutes}m`;
  }

  const hours = Math.floor(ageMinutes / 60);
  const minutes = ageMinutes % 60;

  if (hours < 24) {
    return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return remainingHours === 0
    ? `${days}d`
    : `${days}d ${remainingHours}h`;
}

function formatBpsAsPercent(value: number) {
  return `${(value / 100).toFixed(2)}%`;
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function formatSignedPercent(value: number) {
  const roundedValue = Math.round(value * 100) / 100;

  if (roundedValue === 0) {
    return "0.00%";
  }

  return `${roundedValue > 0 ? "+" : "-"}${Math.abs(roundedValue).toFixed(
    2,
  )}%`;
}

function formatSignedBps(value: number) {
  if (value === 0) {
    return "0.00 bps";
  }

  return `${value > 0 ? "+" : "-"}${Math.abs(value).toFixed(2)} bps`;
}
