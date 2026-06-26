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
  volatility_loaded: boolean;
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

function isIsoString(value: unknown) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isNullableString(value: unknown) {
  return value === null || typeof value === "string";
}

function isNullableFiniteNumber(value: unknown) {
  return value === null || isFiniteNumber(value);
}

function isFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
