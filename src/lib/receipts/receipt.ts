import { listFixtureAccounts } from "../perps/fixtures.ts";
import type {
  normalized_account_snapshot,
  receipt_verification,
  risk_receipt,
} from "../perps/types.ts";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([entryKey, entryValue]) => [entryKey, canonicalize(entryValue)]),
    );
  }

  return value;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function canonicalJson(value: unknown) {
  return JSON.stringify(canonicalize(value));
}

export async function hashSnapshot(snapshot: normalized_account_snapshot) {
  const encodedSnapshot = new TextEncoder().encode(canonicalJson(snapshot));
  const digest = await crypto.subtle.digest("SHA-256", encodedSnapshot);

  return `0x${bytesToHex(new Uint8Array(digest))}`;
}

export function receiptIdFromHash(snapshotHash: string) {
  return `rr_${snapshotHash.slice(2, 18)}`;
}

export async function createRiskReceipt(
  snapshot: normalized_account_snapshot,
): Promise<risk_receipt> {
  const snapshotHash = await hashSnapshot(snapshot);

  return {
    id: receiptIdFromHash(snapshotHash),
    snapshot_hash: snapshotHash,
    snapshot,
    created_at_iso: snapshot.created_at_iso,
  };
}

export async function verifyReceipt(
  receipt: risk_receipt,
): Promise<receipt_verification> {
  const recomputedHash = await hashSnapshot(receipt.snapshot);

  return {
    expected_hash: receipt.snapshot_hash,
    recomputed_hash: recomputedHash,
    matches: receipt.snapshot_hash === recomputedHash,
  };
}

export async function getFixtureReceipts() {
  return Promise.all(listFixtureAccounts().map(createRiskReceipt));
}

export async function getFixtureReceiptById(id: string) {
  const receipts = await getFixtureReceipts();

  return receipts.find((receipt) => receipt.id === id) ?? null;
}
