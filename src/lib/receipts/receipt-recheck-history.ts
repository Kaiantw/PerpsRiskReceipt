import type {
  data_freshness,
  normalized_account_snapshot,
  risk_label,
} from "../perps/types.ts";
import type {
  receipt_market_regime_label,
  receipt_market_regime_severity,
  receipt_market_regime,
} from "./receipt-market-regime.ts";
import type {
  receipt_market_regime_drilldown,
} from "./receipt-market-regime-drilldown.ts";
import type {
  receipt_recheck_watchlist,
  receipt_recheck_watchlist_label,
} from "./receipt-recheck-watchlist.ts";
import type {
  receipt_snapshot_drift,
  receipt_snapshot_drift_label,
} from "./receipt-snapshot-drift.ts";
import type {
  snapshot_comparison,
  snapshot_comparison_status,
} from "./snapshot-comparison.ts";

export const LOCAL_RECHECK_HISTORY_STORAGE_PREFIX =
  "perps-risk-recheck-history:";
export const MAX_RECEIPT_RECHECK_HISTORY_ENTRIES = 12;

export type receipt_recheck_history_entry = {
  id: string;
  receipt_id: string;
  rechecked_at_iso: string;
  current_data_time_iso: string;
  current_freshness: data_freshness;
  comparison_status: snapshot_comparison_status;
  comparison_headline: string;
  changed_position_count: number;
  max_abs_mark_price_change_percent: number;
  current_risk_score: number;
  current_risk_label: risk_label;
  current_account_value_usd: number;
  current_margin_usage_bps: number;
  current_total_notional_usd: number;
  current_min_liquidation_distance_bps: number | null;
  current_daily_funding_usd: number;
  market_regime_label: receipt_market_regime_label;
  market_regime_severity: receipt_market_regime_severity;
  market_regime_focus_market: string | null;
  market_regime_high_count: number;
  market_regime_watch_count: number;
  market_regime_info_count: number;
  watchlist_label: receipt_recheck_watchlist_label;
  watchlist_high_count: number;
  watchlist_watch_count: number;
  watchlist_info_count: number;
  watchlist_item_count: number;
  top_drilldown_market: string | null;
  top_drilldown_severity: receipt_market_regime_severity | null;
  top_drilldown_primary_cue: string | null;
  top_drilldown_summary: string | null;
  top_drilldown_current_liquidation_distance_bps: number | null;
  top_drilldown_current_funding_burden_bps: number | null;
  snapshot_drift_age_minutes?: number | null;
  snapshot_drift_focus_market?: string | null;
  snapshot_drift_label?: receipt_snapshot_drift_label | null;
  snapshot_drift_score?: number | null;
  volatility_loaded: boolean;
};

export type receipt_recheck_history_trend =
  | "no_history"
  | "single_check"
  | "risk_higher"
  | "risk_lower"
  | "risk_unchanged";

export type receipt_recheck_history_summary = {
  label: receipt_recheck_history_trend;
  headline: string;
  summary: string;
  review_points: string[];
  entry_count: number;
  latest_entry: receipt_recheck_history_entry | null;
  oldest_entry: receipt_recheck_history_entry | null;
  latest_risk_score: number | null;
  latest_risk_label: risk_label | null;
  oldest_risk_score: number | null;
  oldest_risk_label: risk_label | null;
  risk_score_delta: number | null;
  latest_regime_label: receipt_market_regime_label | null;
  oldest_regime_label: receipt_market_regime_label | null;
  most_repeated_focus_market: string | null;
  most_repeated_focus_market_count: number;
  volatility_loaded_count: number;
  latest_watchlist_high_count: number;
  latest_watchlist_watch_count: number;
  latest_watchlist_info_count: number;
  latest_snapshot_drift_label: receipt_snapshot_drift_label | null;
  latest_snapshot_drift_score: number | null;
  oldest_snapshot_drift_label: receipt_snapshot_drift_label | null;
  oldest_snapshot_drift_score: number | null;
  snapshot_drift_score_delta: number | null;
};

export function getLocalRecheckHistoryStorageKey(receiptId: string) {
  return `${LOCAL_RECHECK_HISTORY_STORAGE_PREFIX}${receiptId}`;
}

export function createReceiptRecheckHistoryEntry(input: {
  comparison: snapshot_comparison;
  currentSnapshot: normalized_account_snapshot;
  marketRegime: receipt_market_regime;
  marketRegimeDrilldown: receipt_market_regime_drilldown;
  receiptId: string;
  recheckedAtIso?: string;
  snapshotDrift?: receipt_snapshot_drift | null;
  volatilityLoaded: boolean;
  watchlist: receipt_recheck_watchlist;
}): receipt_recheck_history_entry {
  const recheckedAtIso = input.recheckedAtIso ?? new Date().toISOString();
  const topDrilldownRow = input.marketRegimeDrilldown.rows[0] ?? null;

  return {
    id: buildReceiptRecheckHistoryEntryId({
      comparisonStatus: input.comparison.status,
      currentDataTimeIso: input.currentSnapshot.data_time_iso,
      recheckedAtIso,
    }),
    receipt_id: input.receiptId,
    rechecked_at_iso: recheckedAtIso,
    current_data_time_iso: input.currentSnapshot.data_time_iso,
    current_freshness: input.currentSnapshot.freshness,
    comparison_status: input.comparison.status,
    comparison_headline: input.comparison.headline,
    changed_position_count: input.comparison.changed_position_count,
    max_abs_mark_price_change_percent:
      input.comparison.max_abs_mark_price_change_percent,
    current_risk_score: input.currentSnapshot.aggregate.risk_score,
    current_risk_label: input.currentSnapshot.aggregate.risk_label,
    current_account_value_usd: input.currentSnapshot.account_value_usd,
    current_margin_usage_bps: input.currentSnapshot.aggregate.margin_usage_bps,
    current_total_notional_usd:
      input.currentSnapshot.aggregate.total_notional_usd,
    current_min_liquidation_distance_bps:
      input.currentSnapshot.aggregate.min_liquidation_distance_bps,
    current_daily_funding_usd:
      input.currentSnapshot.aggregate.daily_funding_usd,
    market_regime_label: input.marketRegime.label,
    market_regime_severity: input.marketRegime.severity,
    market_regime_focus_market: input.marketRegime.focus_market,
    market_regime_high_count: input.marketRegime.high_count,
    market_regime_watch_count: input.marketRegime.watch_count,
    market_regime_info_count: input.marketRegime.info_count,
    watchlist_label: input.watchlist.label,
    watchlist_high_count: input.watchlist.high_count,
    watchlist_watch_count: input.watchlist.watch_count,
    watchlist_info_count: input.watchlist.info_count,
    watchlist_item_count: input.watchlist.item_count,
    top_drilldown_market: topDrilldownRow?.market ?? null,
    top_drilldown_severity: topDrilldownRow?.severity ?? null,
    top_drilldown_primary_cue: topDrilldownRow?.primary_cue ?? null,
    top_drilldown_summary: topDrilldownRow?.summary ?? null,
    top_drilldown_current_liquidation_distance_bps:
      topDrilldownRow?.current_liquidation_distance_bps ?? null,
    top_drilldown_current_funding_burden_bps:
      topDrilldownRow?.current_funding_burden_bps ?? null,
    snapshot_drift_age_minutes: input.snapshotDrift?.age_minutes ?? null,
    snapshot_drift_focus_market: input.snapshotDrift?.focus_market ?? null,
    snapshot_drift_label: input.snapshotDrift?.label ?? null,
    snapshot_drift_score: input.snapshotDrift?.drift_score ?? null,
    volatility_loaded: input.volatilityLoaded,
  };
}

export function parseStoredReceiptRecheckHistory(value: string | null) {
  if (!value) {
    return [];
  }

  try {
    return parseReceiptRecheckHistory(JSON.parse(value));
  } catch {
    return [];
  }
}

export function parseReceiptRecheckHistory(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isReceiptRecheckHistoryEntry);
}

export function stringifyReceiptRecheckHistory(
  entries: receipt_recheck_history_entry[],
) {
  return `${JSON.stringify(entries, null, 2)}\n`;
}

export function upsertReceiptRecheckHistoryEntry(input: {
  entries: receipt_recheck_history_entry[];
  entry: receipt_recheck_history_entry;
  maxEntries?: number;
}) {
  const maxEntries =
    input.maxEntries ?? MAX_RECEIPT_RECHECK_HISTORY_ENTRIES;
  const entriesById = new Map(
    input.entries.map((entry) => [entry.id, entry]),
  );

  entriesById.set(input.entry.id, input.entry);

  return Array.from(entriesById.values())
    .sort(compareReceiptRecheckHistoryEntries)
    .slice(0, maxEntries);
}

export function buildReceiptRecheckHistorySummary(
  entries: receipt_recheck_history_entry[],
): receipt_recheck_history_summary {
  const sortedEntries = [...entries].sort(compareReceiptRecheckHistoryEntries);
  const latestEntry = sortedEntries[0] ?? null;
  const oldestEntry = sortedEntries.at(-1) ?? null;
  const entryCount = sortedEntries.length;
  const volatilityLoadedCount = sortedEntries.filter(
    (entry) => entry.volatility_loaded,
  ).length;
  const repeatedFocusMarket = getMostRepeatedFocusMarket(sortedEntries);

  if (!latestEntry || !oldestEntry) {
    return {
      label: "no_history",
      headline: "No local recheck history yet.",
      summary:
        "Run a live recheck to save the first compact local history row for this receipt.",
      review_points: [
        "Run a live recheck before treating this saved receipt as current.",
      ],
      entry_count: 0,
      latest_entry: null,
      oldest_entry: null,
      latest_risk_score: null,
      latest_risk_label: null,
      oldest_risk_score: null,
      oldest_risk_label: null,
      risk_score_delta: null,
      latest_regime_label: null,
      oldest_regime_label: null,
      most_repeated_focus_market: null,
      most_repeated_focus_market_count: 0,
      volatility_loaded_count: 0,
      latest_watchlist_high_count: 0,
      latest_watchlist_watch_count: 0,
      latest_watchlist_info_count: 0,
      latest_snapshot_drift_label: null,
      latest_snapshot_drift_score: null,
      oldest_snapshot_drift_label: null,
      oldest_snapshot_drift_score: null,
      snapshot_drift_score_delta: null,
    };
  }

  if (entryCount === 1) {
    const focusMarket =
      latestEntry.market_regime_focus_market ??
      latestEntry.top_drilldown_market ??
      "n/a";

    return {
      label: "single_check",
      headline: "One local recheck is saved.",
      summary: [
        `Latest saved risk score is ${latestEntry.current_risk_score} (${latestEntry.current_risk_label}).`,
        `Regime is ${latestEntry.market_regime_label}; focus market is ${focusMarket}.`,
        "Run another live recheck later to compare direction over time.",
      ].join(" "),
      review_points: [
        "Use the latest row as a point-in-time recheck only; there is not enough local history for a trend.",
        getVolatilityHistoryReviewPoint({
          entryCount,
          volatilityLoadedCount,
        }),
      ],
      entry_count: entryCount,
      latest_entry: latestEntry,
      oldest_entry: oldestEntry,
      latest_risk_score: latestEntry.current_risk_score,
      latest_risk_label: latestEntry.current_risk_label,
      oldest_risk_score: oldestEntry.current_risk_score,
      oldest_risk_label: oldestEntry.current_risk_label,
      risk_score_delta: null,
      latest_regime_label: latestEntry.market_regime_label,
      oldest_regime_label: oldestEntry.market_regime_label,
      most_repeated_focus_market: repeatedFocusMarket.market,
      most_repeated_focus_market_count: repeatedFocusMarket.count,
      volatility_loaded_count: volatilityLoadedCount,
      latest_watchlist_high_count: latestEntry.watchlist_high_count,
      latest_watchlist_watch_count: latestEntry.watchlist_watch_count,
      latest_watchlist_info_count: latestEntry.watchlist_info_count,
      latest_snapshot_drift_label: latestEntry.snapshot_drift_label ?? null,
      latest_snapshot_drift_score: latestEntry.snapshot_drift_score ?? null,
      oldest_snapshot_drift_label: oldestEntry.snapshot_drift_label ?? null,
      oldest_snapshot_drift_score: oldestEntry.snapshot_drift_score ?? null,
      snapshot_drift_score_delta: null,
    };
  }

  const riskScoreDelta =
    latestEntry.current_risk_score - oldestEntry.current_risk_score;
  const snapshotDriftScoreDelta = getNullableScoreDelta({
    latestScore: latestEntry.snapshot_drift_score ?? null,
    oldestScore: oldestEntry.snapshot_drift_score ?? null,
  });
  const trendLabel = getRiskScoreTrendLabel(riskScoreDelta);
  const trendPhrase = getRiskScoreTrendPhrase(trendLabel);
  const snapshotDriftText = getSnapshotDriftTrendText({
    latestEntry,
    oldestEntry,
    snapshotDriftScoreDelta,
  });
  const focusMarketText = repeatedFocusMarket.market
    ? `${repeatedFocusMarket.market} appeared as focus market in ${repeatedFocusMarket.count} of ${entryCount} saved checks.`
    : "No repeated focus market was captured across saved checks.";
  const latestCue = latestEntry.top_drilldown_market
    ? `Latest top cue: ${latestEntry.top_drilldown_market} - ${latestEntry.top_drilldown_primary_cue ?? "review the latest drilldown row"}.`
    : "Latest top cue is unavailable in the compact history row.";

  return {
    label: trendLabel,
    headline: `Local recheck risk score is ${trendPhrase} across ${entryCount} saved checks.`,
    summary: [
      `Latest risk score is ${latestEntry.current_risk_score} (${latestEntry.current_risk_label}) versus oldest ${oldestEntry.current_risk_score} (${oldestEntry.current_risk_label}).`,
      `Regime moved ${oldestEntry.market_regime_label} to ${latestEntry.market_regime_label}.`,
      snapshotDriftText,
      focusMarketText,
      latestCue,
    ].join(" "),
    review_points: [
      getRiskScoreTrendReviewPoint(trendLabel),
      getSnapshotDriftTrendReviewPoint(snapshotDriftScoreDelta),
      focusMarketText,
      getVolatilityHistoryReviewPoint({
        entryCount,
        volatilityLoadedCount,
      }),
      "Compare the newest row with the oldest row before treating the saved receipt as current.",
    ],
    entry_count: entryCount,
    latest_entry: latestEntry,
    oldest_entry: oldestEntry,
    latest_risk_score: latestEntry.current_risk_score,
    latest_risk_label: latestEntry.current_risk_label,
    oldest_risk_score: oldestEntry.current_risk_score,
    oldest_risk_label: oldestEntry.current_risk_label,
    risk_score_delta: riskScoreDelta,
    latest_regime_label: latestEntry.market_regime_label,
    oldest_regime_label: oldestEntry.market_regime_label,
    most_repeated_focus_market: repeatedFocusMarket.market,
    most_repeated_focus_market_count: repeatedFocusMarket.count,
    volatility_loaded_count: volatilityLoadedCount,
    latest_watchlist_high_count: latestEntry.watchlist_high_count,
    latest_watchlist_watch_count: latestEntry.watchlist_watch_count,
    latest_watchlist_info_count: latestEntry.watchlist_info_count,
    latest_snapshot_drift_label: latestEntry.snapshot_drift_label ?? null,
    latest_snapshot_drift_score: latestEntry.snapshot_drift_score ?? null,
    oldest_snapshot_drift_label: oldestEntry.snapshot_drift_label ?? null,
    oldest_snapshot_drift_score: oldestEntry.snapshot_drift_score ?? null,
    snapshot_drift_score_delta: snapshotDriftScoreDelta,
  };
}

function buildReceiptRecheckHistoryEntryId(input: {
  comparisonStatus: snapshot_comparison_status;
  currentDataTimeIso: string;
  recheckedAtIso: string;
}) {
  return [
    "rrh",
    Date.parse(input.recheckedAtIso).toString(36),
    Date.parse(input.currentDataTimeIso).toString(36),
    input.comparisonStatus,
  ].join("_");
}

function compareReceiptRecheckHistoryEntries(
  firstEntry: receipt_recheck_history_entry,
  secondEntry: receipt_recheck_history_entry,
) {
  return (
    Date.parse(secondEntry.rechecked_at_iso) -
    Date.parse(firstEntry.rechecked_at_iso)
  );
}

function getMostRepeatedFocusMarket(
  entries: receipt_recheck_history_entry[],
): { market: string | null; count: number } {
  const marketCounts = new Map<string, number>();

  for (const entry of entries) {
    const market =
      entry.market_regime_focus_market ?? entry.top_drilldown_market;

    if (!market) {
      continue;
    }

    marketCounts.set(market, (marketCounts.get(market) ?? 0) + 1);
  }

  const [market, count] =
    Array.from(marketCounts.entries()).sort(
      (firstEntry, secondEntry) =>
        secondEntry[1] - firstEntry[1] ||
        firstEntry[0].localeCompare(secondEntry[0]),
    )[0] ?? [];

  return {
    market: market ?? null,
    count: count ?? 0,
  };
}

function getRiskScoreTrendLabel(
  riskScoreDelta: number,
): receipt_recheck_history_trend {
  if (riskScoreDelta > 0) {
    return "risk_higher";
  }

  if (riskScoreDelta < 0) {
    return "risk_lower";
  }

  return "risk_unchanged";
}

function getRiskScoreTrendPhrase(label: receipt_recheck_history_trend) {
  switch (label) {
    case "risk_higher":
      return "higher";
    case "risk_lower":
      return "lower";
    case "risk_unchanged":
      return "unchanged";
    case "single_check":
      return "based on one saved check";
    case "no_history":
      return "unavailable";
  }
}

function getRiskScoreTrendReviewPoint(
  label: receipt_recheck_history_trend,
) {
  switch (label) {
    case "risk_higher":
      return "Risk score is higher than the oldest local recheck; inspect the latest high/watch cues first.";
    case "risk_lower":
      return "Risk score is lower than the oldest local recheck; confirm the newest live row still matches the account being reviewed.";
    case "risk_unchanged":
      return "Risk score is unchanged across the oldest and newest local rechecks; inspect regime, focus-market, and volatility context for movement not captured by the score.";
    case "single_check":
      return "Only one local recheck is saved; run another later to compare direction.";
    case "no_history":
      return "No local recheck rows are saved yet.";
  }
}

function getNullableScoreDelta(input: {
  latestScore: number | null;
  oldestScore: number | null;
}) {
  if (input.latestScore === null || input.oldestScore === null) {
    return null;
  }

  return input.latestScore - input.oldestScore;
}

function getSnapshotDriftTrendText(input: {
  latestEntry: receipt_recheck_history_entry;
  oldestEntry: receipt_recheck_history_entry;
  snapshotDriftScoreDelta: number | null;
}) {
  const latestScore = input.latestEntry.snapshot_drift_score ?? null;
  const oldestScore = input.oldestEntry.snapshot_drift_score ?? null;

  if (latestScore === null || oldestScore === null) {
    return "Snapshot-drift trend is unavailable for at least one saved check.";
  }

  return `Snapshot drift moved ${oldestScore} (${input.oldestEntry.snapshot_drift_label ?? "n/a"}) to ${latestScore} (${input.latestEntry.snapshot_drift_label ?? "n/a"}), delta ${formatSignedInteger(input.snapshotDriftScoreDelta)}.`;
}

function getSnapshotDriftTrendReviewPoint(
  snapshotDriftScoreDelta: number | null,
) {
  if (snapshotDriftScoreDelta === null) {
    return "Snapshot-drift trend is unavailable for older rows saved before drift history fields existed.";
  }

  if (snapshotDriftScoreDelta > 0) {
    return "Snapshot drift score is higher than the oldest local recheck; inspect current-market movement and freshness cues before treating the receipt as current.";
  }

  if (snapshotDriftScoreDelta < 0) {
    return "Snapshot drift score is lower than the oldest local recheck; confirm the latest live read still matches the receipt account and positions.";
  }

  return "Snapshot drift score is unchanged across the oldest and newest local rechecks; inspect label, watchlist, and market-regime details for movement the score did not capture.";
}

function formatSignedInteger(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  if (value === 0) {
    return "0";
  }

  return `${value > 0 ? "+" : "-"}${Math.abs(value)}`;
}

function getVolatilityHistoryReviewPoint(input: {
  entryCount: number;
  volatilityLoadedCount: number;
}) {
  if (input.volatilityLoadedCount === 0) {
    return "No saved history row includes loaded 24h volatility context.";
  }

  return `${input.volatilityLoadedCount} of ${input.entryCount} saved history rows include loaded 24h volatility context.`;
}

function isReceiptRecheckHistoryEntry(
  value: unknown,
): value is receipt_recheck_history_entry {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.receipt_id === "string" &&
    isIsoString(value.rechecked_at_iso) &&
    isIsoString(value.current_data_time_iso) &&
    isFreshness(value.current_freshness) &&
    isComparisonStatus(value.comparison_status) &&
    typeof value.comparison_headline === "string" &&
    isFiniteNumber(value.changed_position_count) &&
    isFiniteNumber(value.max_abs_mark_price_change_percent) &&
    isFiniteNumber(value.current_risk_score) &&
    isRiskLabel(value.current_risk_label) &&
    isFiniteNumber(value.current_account_value_usd) &&
    isFiniteNumber(value.current_margin_usage_bps) &&
    isFiniteNumber(value.current_total_notional_usd) &&
    isNullableFiniteNumber(value.current_min_liquidation_distance_bps) &&
    isFiniteNumber(value.current_daily_funding_usd) &&
    isMarketRegimeLabel(value.market_regime_label) &&
    isMarketRegimeSeverity(value.market_regime_severity) &&
    isNullableString(value.market_regime_focus_market) &&
    isFiniteNumber(value.market_regime_high_count) &&
    isFiniteNumber(value.market_regime_watch_count) &&
    isFiniteNumber(value.market_regime_info_count) &&
    isWatchlistLabel(value.watchlist_label) &&
    isFiniteNumber(value.watchlist_high_count) &&
    isFiniteNumber(value.watchlist_watch_count) &&
    isFiniteNumber(value.watchlist_info_count) &&
    isFiniteNumber(value.watchlist_item_count) &&
    isNullableString(value.top_drilldown_market) &&
    isNullableMarketRegimeSeverity(value.top_drilldown_severity) &&
    isNullableString(value.top_drilldown_primary_cue) &&
    isNullableString(value.top_drilldown_summary) &&
    isNullableFiniteNumber(
      value.top_drilldown_current_liquidation_distance_bps,
    ) &&
    isNullableFiniteNumber(value.top_drilldown_current_funding_burden_bps) &&
    isOptionalNullableFiniteNumber(value.snapshot_drift_age_minutes) &&
    isOptionalNullableString(value.snapshot_drift_focus_market) &&
    isOptionalNullableSnapshotDriftLabel(value.snapshot_drift_label) &&
    isOptionalNullableFiniteNumber(value.snapshot_drift_score) &&
    typeof value.volatility_loaded === "boolean"
  );
}

function isComparisonStatus(value: unknown): value is snapshot_comparison_status {
  return (
    value === "account_mismatch" ||
    value === "position_state_changed" ||
    value === "risk_worsened" ||
    value === "risk_improved" ||
    value === "market_moved" ||
    value === "little_changed"
  );
}

function isFreshness(value: unknown): value is data_freshness {
  return (
    value === "live" ||
    value === "stale" ||
    value === "fixture" ||
    value === "error"
  );
}

function isRiskLabel(value: unknown): value is risk_label {
  return (
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "critical"
  );
}

function isMarketRegimeLabel(
  value: unknown,
): value is receipt_market_regime_label {
  return (
    value === "not_comparable" ||
    value === "calm" ||
    value === "active" ||
    value === "stretched" ||
    value === "stress"
  );
}

function isMarketRegimeSeverity(
  value: unknown,
): value is receipt_market_regime_severity {
  return (
    value === "info" ||
    value === "watch" ||
    value === "high" ||
    value === "critical"
  );
}

function isNullableMarketRegimeSeverity(
  value: unknown,
): value is receipt_market_regime_severity | null {
  return value === null || isMarketRegimeSeverity(value);
}

function isWatchlistLabel(
  value: unknown,
): value is receipt_recheck_watchlist_label {
  return (
    value === "no_live_recheck" ||
    value === "no_watch_items" ||
    value === "watch_items_loaded" ||
    value === "high_attention"
  );
}

function isSnapshotDriftLabel(
  value: unknown,
): value is receipt_snapshot_drift_label {
  return (
    value === "not_comparable" ||
    value === "stale_snapshot" ||
    value === "drift_watch" ||
    value === "close_snapshot"
  );
}

function isIsoString(value: unknown) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isNullableString(value: unknown) {
  return value === null || typeof value === "string";
}

function isOptionalNullableString(value: unknown) {
  return value === undefined || isNullableString(value);
}

function isNullableFiniteNumber(value: unknown) {
  return value === null || isFiniteNumber(value);
}

function isOptionalNullableFiniteNumber(value: unknown) {
  return value === undefined || isNullableFiniteNumber(value);
}

function isOptionalNullableSnapshotDriftLabel(value: unknown) {
  return value === undefined || value === null || isSnapshotDriftLabel(value);
}

function isFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
