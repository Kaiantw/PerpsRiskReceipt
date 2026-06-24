import type { risk_receipt } from "../perps/types.ts";

export const LOCAL_RECEIPT_STORAGE_PREFIX = "perps-risk-receipt:";

export function getLocalReceiptStorageKey(receiptId: string) {
  return `${LOCAL_RECEIPT_STORAGE_PREFIX}${receiptId}`;
}

export function parseStoredRiskReceipt(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<risk_receipt>;

    if (
      typeof parsed.id !== "string" ||
      typeof parsed.snapshot_hash !== "string" ||
      typeof parsed.created_at_iso !== "string" ||
      !parsed.snapshot
    ) {
      return null;
    }

    return parsed as risk_receipt;
  } catch {
    return null;
  }
}
