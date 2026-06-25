import type {
  data_freshness,
  perp_protocol,
  position_side,
  risk_label,
  risk_receipt,
} from "../perps/types.ts";
import { calculateLiquidationDistanceBps } from "../risk/risk-engine.ts";
import { parseRiskReceipt } from "./local-receipts.ts";

export const PORTABLE_RECEIPT_BUNDLE_KIND =
  "perps-risk-receipt.portable.v1";
export const REDACTED_RECEIPT_BUNDLE_KIND =
  "perps-risk-receipt.redacted.v1";

export type portable_receipt_bundle = {
  kind: typeof PORTABLE_RECEIPT_BUNDLE_KIND;
  version: 1;
  privacy_level: "full_snapshot";
  exported_at_iso: string;
  receipt: risk_receipt;
};

export type redacted_receipt_market = {
  market: string;
  side: position_side;
  notional_bucket_usd: string;
  liquidation_distance_bps: number | null;
  funding_8h_bps_user_perspective: number;
  open_interest_bucket_usd?: string;
};

export type redacted_receipt_bundle = {
  kind: typeof REDACTED_RECEIPT_BUNDLE_KIND;
  version: 1;
  privacy_level: "redacted_summary";
  exported_at_iso: string;
  receipt_id: string;
  snapshot_hash: string;
  created_at_iso: string;
  data_time_iso: string;
  protocol: perp_protocol;
  source: "live" | "fixture";
  freshness: data_freshness;
  aggregate: {
    risk_score: number;
    risk_label: risk_label;
    margin_usage_bps: number;
    min_liquidation_distance_bps: number | null;
    account_value_bucket_usd: string;
    total_notional_bucket_usd: string;
    daily_funding_bucket_usd: string;
    thirty_day_funding_bucket_usd: string;
    position_count: number;
  };
  markets: redacted_receipt_market[];
  redacted_fields: string[];
  verification_scope:
    "snapshot_hash_reference_only_full_snapshot_required_to_recompute";
};

export type portable_receipt_bundle_preview = {
  receipt_id: string;
  account: string;
  protocol: string;
  data_time_iso: string;
  snapshot_hash: string;
  risk_score: number;
  risk_label: risk_label;
  position_count: number;
  contains_full_snapshot: true;
  private_fields: string[];
};

export type redacted_receipt_bundle_preview = {
  receipt_id: string;
  protocol: string;
  data_time_iso: string;
  snapshot_hash: string;
  risk_score: number;
  risk_label: risk_label;
  position_count: number;
  contains_full_snapshot: false;
  can_recompute_snapshot_hash: false;
  redacted_fields: string[];
};

export type portable_receipt_bundle_parse_result =
  | { status: "valid"; bundle: portable_receipt_bundle | redacted_receipt_bundle }
  | { status: "invalid"; message: string };

export function createPortableReceiptBundle(
  receipt: risk_receipt,
  exportedAtIso = new Date().toISOString(),
): portable_receipt_bundle {
  return {
    kind: PORTABLE_RECEIPT_BUNDLE_KIND,
    version: 1,
    privacy_level: "full_snapshot",
    exported_at_iso: exportedAtIso,
    receipt,
  };
}

export function createRedactedReceiptBundle(
  receipt: risk_receipt,
  exportedAtIso = new Date().toISOString(),
): redacted_receipt_bundle {
  const snapshot = receipt.snapshot;

  return {
    kind: REDACTED_RECEIPT_BUNDLE_KIND,
    version: 1,
    privacy_level: "redacted_summary",
    exported_at_iso: exportedAtIso,
    receipt_id: receipt.id,
    snapshot_hash: receipt.snapshot_hash,
    created_at_iso: receipt.created_at_iso,
    data_time_iso: snapshot.data_time_iso,
    protocol: snapshot.protocol,
    source: snapshot.source,
    freshness: snapshot.freshness,
    aggregate: {
      risk_score: snapshot.aggregate.risk_score,
      risk_label: snapshot.aggregate.risk_label,
      margin_usage_bps: snapshot.aggregate.margin_usage_bps,
      min_liquidation_distance_bps:
        snapshot.aggregate.min_liquidation_distance_bps,
      account_value_bucket_usd: bucketUsd(snapshot.account_value_usd),
      total_notional_bucket_usd: bucketUsd(
        snapshot.aggregate.total_notional_usd,
      ),
      daily_funding_bucket_usd: bucketSignedUsd(
        snapshot.aggregate.daily_funding_usd,
      ),
      thirty_day_funding_bucket_usd: bucketSignedUsd(
        snapshot.aggregate.thirty_day_funding_usd,
      ),
      position_count: snapshot.positions.length,
    },
    markets: snapshot.positions.map((position) => ({
      market: position.market,
      side: position.side,
      notional_bucket_usd: bucketUsd(position.notional_usd),
      liquidation_distance_bps: calculateLiquidationDistanceBps(position),
      funding_8h_bps_user_perspective:
        position.funding_8h_bps_user_perspective,
      open_interest_bucket_usd:
        position.open_interest_usd === undefined
          ? undefined
          : bucketUsd(position.open_interest_usd),
    })),
    redacted_fields: [
      "account",
      "withdrawable",
      "exact account value",
      "exact total notional",
      "position sizes",
      "entry prices",
      "mark prices",
      "liquidation prices",
      "unrealized pnl",
      "exact funding dollars",
    ],
    verification_scope:
      "snapshot_hash_reference_only_full_snapshot_required_to_recompute",
  };
}

export function stringifyPortableReceiptBundle(
  bundle: portable_receipt_bundle | redacted_receipt_bundle,
) {
  return `${JSON.stringify(bundle, null, 2)}\n`;
}

export function parsePortableReceiptBundleJson(
  value: string,
): portable_receipt_bundle_parse_result {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    return { status: "invalid", message: "Bundle must be valid JSON." };
  }

  if (!isRecord(parsed)) {
    return { status: "invalid", message: "Bundle must be a JSON object." };
  }

  if (parsed.kind === REDACTED_RECEIPT_BUNDLE_KIND) {
    return parseRedactedReceiptBundle(parsed);
  }

  if (parsed.kind !== PORTABLE_RECEIPT_BUNDLE_KIND || parsed.version !== 1) {
    return {
      status: "invalid",
      message: "Bundle format is not supported by this version of the app.",
    };
  }

  if (parsed.privacy_level !== "full_snapshot") {
    return {
      status: "invalid",
      message: "Bundle privacy level is missing or unsupported.",
    };
  }

  if (typeof parsed.exported_at_iso !== "string") {
    return {
      status: "invalid",
      message: "Bundle export timestamp is missing.",
    };
  }

  const receipt = parseRiskReceipt(parsed.receipt);

  if (!receipt) {
    return {
      status: "invalid",
      message: "Bundle does not contain a usable risk receipt snapshot.",
    };
  }

  return {
    status: "valid",
    bundle: {
      kind: PORTABLE_RECEIPT_BUNDLE_KIND,
      version: 1,
      privacy_level: "full_snapshot",
      exported_at_iso: parsed.exported_at_iso,
      receipt,
    },
  };
}

export function getPortableReceiptBundlePreview(
  bundle: portable_receipt_bundle,
): portable_receipt_bundle_preview;
export function getPortableReceiptBundlePreview(
  bundle: redacted_receipt_bundle,
): redacted_receipt_bundle_preview;
export function getPortableReceiptBundlePreview(
  bundle: portable_receipt_bundle | redacted_receipt_bundle,
): portable_receipt_bundle_preview | redacted_receipt_bundle_preview {
  if (isRedactedReceiptBundle(bundle)) {
    return getRedactedReceiptBundlePreview(bundle);
  }

  return {
    receipt_id: bundle.receipt.id,
    account: bundle.receipt.snapshot.account,
    protocol: bundle.receipt.snapshot.protocol,
    data_time_iso: bundle.receipt.snapshot.data_time_iso,
    snapshot_hash: bundle.receipt.snapshot_hash,
    risk_score: bundle.receipt.snapshot.aggregate.risk_score,
    risk_label: bundle.receipt.snapshot.aggregate.risk_label,
    position_count: bundle.receipt.snapshot.positions.length,
    contains_full_snapshot: true,
    private_fields: [
      "account",
      "position markets",
      "position sizes",
      "entry prices",
      "mark prices",
      "liquidation prices",
      "funding estimates",
    ],
  };
}

export function isFullReceiptBundle(
  bundle: portable_receipt_bundle | redacted_receipt_bundle,
): bundle is portable_receipt_bundle {
  return bundle.kind === PORTABLE_RECEIPT_BUNDLE_KIND;
}

export function isRedactedReceiptBundle(
  bundle: portable_receipt_bundle | redacted_receipt_bundle,
): bundle is redacted_receipt_bundle {
  return bundle.kind === REDACTED_RECEIPT_BUNDLE_KIND;
}

function getRedactedReceiptBundlePreview(
  bundle: redacted_receipt_bundle,
): redacted_receipt_bundle_preview {
  return {
    receipt_id: bundle.receipt_id,
    protocol: bundle.protocol,
    data_time_iso: bundle.data_time_iso,
    snapshot_hash: bundle.snapshot_hash,
    risk_score: bundle.aggregate.risk_score,
    risk_label: bundle.aggregate.risk_label,
    position_count: bundle.aggregate.position_count,
    contains_full_snapshot: false,
    can_recompute_snapshot_hash: false,
    redacted_fields: bundle.redacted_fields,
  };
}

function parseRedactedReceiptBundle(
  parsed: Record<string, unknown>,
): portable_receipt_bundle_parse_result {
  if (
    parsed.version !== 1 ||
    parsed.privacy_level !== "redacted_summary" ||
    typeof parsed.exported_at_iso !== "string" ||
    typeof parsed.receipt_id !== "string" ||
    typeof parsed.snapshot_hash !== "string" ||
    typeof parsed.created_at_iso !== "string" ||
    typeof parsed.data_time_iso !== "string" ||
    !isProtocol(parsed.protocol) ||
    !isSource(parsed.source) ||
    !isFreshness(parsed.freshness) ||
    !isRecord(parsed.aggregate) ||
    !Array.isArray(parsed.markets) ||
    !parsed.markets.every(isRedactedMarket) ||
    !Array.isArray(parsed.redacted_fields) ||
    !parsed.redacted_fields.every((field) => typeof field === "string") ||
    parsed.verification_scope !==
      "snapshot_hash_reference_only_full_snapshot_required_to_recompute"
  ) {
    return {
      status: "invalid",
      message: "Redacted bundle is missing required summary fields.",
    };
  }

  if (
    !isFiniteNumber(parsed.aggregate.risk_score) ||
    !isRiskLabel(parsed.aggregate.risk_label) ||
    !isFiniteNumber(parsed.aggregate.margin_usage_bps) ||
    !isNullableFiniteNumber(
      parsed.aggregate.min_liquidation_distance_bps,
    ) ||
    typeof parsed.aggregate.account_value_bucket_usd !== "string" ||
    typeof parsed.aggregate.total_notional_bucket_usd !== "string" ||
    typeof parsed.aggregate.daily_funding_bucket_usd !== "string" ||
    typeof parsed.aggregate.thirty_day_funding_bucket_usd !== "string" ||
    !isFiniteNumber(parsed.aggregate.position_count)
  ) {
    return {
      status: "invalid",
      message: "Redacted bundle aggregate summary is not usable.",
    };
  }

  return {
    status: "valid",
    bundle: {
      kind: REDACTED_RECEIPT_BUNDLE_KIND,
      version: 1,
      privacy_level: "redacted_summary",
      exported_at_iso: parsed.exported_at_iso,
      receipt_id: parsed.receipt_id,
      snapshot_hash: parsed.snapshot_hash,
      created_at_iso: parsed.created_at_iso,
      data_time_iso: parsed.data_time_iso,
      protocol: parsed.protocol,
      source: parsed.source,
      freshness: parsed.freshness,
      aggregate: {
        risk_score: parsed.aggregate.risk_score,
        risk_label: parsed.aggregate.risk_label,
        margin_usage_bps: parsed.aggregate.margin_usage_bps,
        min_liquidation_distance_bps:
          parsed.aggregate.min_liquidation_distance_bps,
        account_value_bucket_usd:
          parsed.aggregate.account_value_bucket_usd,
        total_notional_bucket_usd:
          parsed.aggregate.total_notional_bucket_usd,
        daily_funding_bucket_usd:
          parsed.aggregate.daily_funding_bucket_usd,
        thirty_day_funding_bucket_usd:
          parsed.aggregate.thirty_day_funding_bucket_usd,
        position_count: parsed.aggregate.position_count,
      },
      markets: parsed.markets,
      redacted_fields: parsed.redacted_fields,
      verification_scope:
        "snapshot_hash_reference_only_full_snapshot_required_to_recompute",
    },
  };
}

function isRedactedMarket(value: unknown): value is redacted_receipt_market {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.market === "string" &&
    (value.side === "long" || value.side === "short") &&
    typeof value.notional_bucket_usd === "string" &&
    isNullableFiniteNumber(value.liquidation_distance_bps) &&
    isFiniteNumber(value.funding_8h_bps_user_perspective) &&
    (value.open_interest_bucket_usd === undefined ||
      typeof value.open_interest_bucket_usd === "string")
  );
}

function bucketSignedUsd(value: number) {
  if (value === 0) {
    return "$0";
  }

  return `${value > 0 ? "cost " : "earn "}${bucketUsd(Math.abs(value))}`;
}

function bucketUsd(value: number) {
  const absoluteValue = Math.abs(value);

  if (absoluteValue === 0) {
    return "$0";
  }

  if (absoluteValue < 1_000) {
    return "$0-$1k";
  }

  if (absoluteValue < 10_000) {
    return "$1k-$10k";
  }

  if (absoluteValue < 50_000) {
    return "$10k-$50k";
  }

  if (absoluteValue < 100_000) {
    return "$50k-$100k";
  }

  if (absoluteValue < 250_000) {
    return "$100k-$250k";
  }

  if (absoluteValue < 1_000_000) {
    return "$250k-$1m";
  }

  return "$1m+";
}

function isProtocol(value: unknown): value is perp_protocol {
  return value === "hyperliquid" || value === "fixture";
}

function isSource(value: unknown): value is "live" | "fixture" {
  return value === "live" || value === "fixture";
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

function isNullableFiniteNumber(value: unknown) {
  return value === null || isFiniteNumber(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
