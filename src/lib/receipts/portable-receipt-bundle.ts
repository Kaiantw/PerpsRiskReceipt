import type { risk_label, risk_receipt } from "../perps/types.ts";
import { parseRiskReceipt } from "./local-receipts.ts";

export const PORTABLE_RECEIPT_BUNDLE_KIND =
  "perps-risk-receipt.portable.v1";

export type portable_receipt_bundle = {
  kind: typeof PORTABLE_RECEIPT_BUNDLE_KIND;
  version: 1;
  privacy_level: "full_snapshot";
  exported_at_iso: string;
  receipt: risk_receipt;
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

export type portable_receipt_bundle_parse_result =
  | { status: "valid"; bundle: portable_receipt_bundle }
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

export function stringifyPortableReceiptBundle(
  bundle: portable_receipt_bundle,
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
): portable_receipt_bundle_preview {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
