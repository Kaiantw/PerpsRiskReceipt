import type { risk_receipt } from "../perps/types.ts";

export const LOCAL_RECEIPT_STORAGE_PREFIX = "perps-risk-receipt:";

export function getLocalReceiptStorageKey(receiptId: string) {
  return `${LOCAL_RECEIPT_STORAGE_PREFIX}${receiptId}`;
}

export function parseRiskReceipt(value: unknown) {
  if (!isRiskReceipt(value)) {
    return null;
  }

  return value;
}

export function parseStoredRiskReceipt(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return parseRiskReceipt(JSON.parse(value));
  } catch {
    return null;
  }
}

function isRiskReceipt(value: unknown): value is risk_receipt {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.snapshot_hash === "string" &&
    typeof value.created_at_iso === "string" &&
    isSnapshot(value.snapshot)
  );
}

function isSnapshot(value: unknown) {
  if (!isRecord(value) || !isRecord(value.aggregate)) {
    return false;
  }

  return (
    typeof value.account === "string" &&
    (value.protocol === "hyperliquid" || value.protocol === "fixture") &&
    (value.source === "live" || value.source === "fixture") &&
    typeof value.created_at_iso === "string" &&
    typeof value.data_time_iso === "string" &&
    isFreshness(value.freshness) &&
    (value.stale_reason === undefined ||
      typeof value.stale_reason === "string") &&
    isFiniteNumber(value.account_value_usd) &&
    isFiniteNumber(value.margin_used_usd) &&
    (value.withdrawable_usd === undefined ||
      isFiniteNumber(value.withdrawable_usd)) &&
    Array.isArray(value.positions) &&
    value.positions.every(isPosition) &&
    isFiniteNumber(value.aggregate.total_notional_usd) &&
    isFiniteNumber(value.aggregate.margin_usage_bps) &&
    isNullableFiniteNumber(value.aggregate.min_liquidation_distance_bps) &&
    isFiniteNumber(value.aggregate.daily_funding_usd) &&
    isFiniteNumber(value.aggregate.thirty_day_funding_usd) &&
    isFiniteNumber(value.aggregate.risk_score) &&
    isRiskLabel(value.aggregate.risk_label)
  );
}

function isPosition(value: unknown) {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.market === "string" &&
    (value.side === "long" || value.side === "short") &&
    isFiniteNumber(value.size) &&
    isFiniteNumber(value.entry_price_usd) &&
    isFiniteNumber(value.mark_price_usd) &&
    isNullableFiniteNumber(value.liquidation_price_usd) &&
    isFiniteNumber(value.notional_usd) &&
    isFiniteNumber(value.unrealized_pnl_usd) &&
    isFiniteNumber(value.funding_8h_bps_user_perspective) &&
    (value.open_interest_usd === undefined ||
      isFiniteNumber(value.open_interest_usd))
  );
}

function isFreshness(value: unknown) {
  return (
    value === "live" ||
    value === "stale" ||
    value === "fixture" ||
    value === "error"
  );
}

function isRiskLabel(value: unknown) {
  return (
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "critical"
  );
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
