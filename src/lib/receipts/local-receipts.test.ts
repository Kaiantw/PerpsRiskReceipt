import assert from "node:assert/strict";
import test from "node:test";

import { loadFixtureAccount } from "../perps/fixtures.ts";
import { createRiskReceipt } from "./receipt.ts";
import {
  getLocalReceiptStorageKey,
  parseStoredRiskReceipt,
} from "./local-receipts.ts";

test("local receipt storage key is scoped by receipt id", () => {
  assert.equal(
    getLocalReceiptStorageKey("rr_abc123"),
    "perps-risk-receipt:rr_abc123",
  );
});

test("stored receipt parser accepts valid receipt json", async () => {
  const receipt = await createRiskReceipt(loadFixtureAccount("demo-safe-eth-long"));
  const parsed = parseStoredRiskReceipt(JSON.stringify(receipt));

  assert.equal(parsed?.id, receipt.id);
  assert.equal(parsed?.snapshot_hash, receipt.snapshot_hash);
});

test("stored receipt parser rejects missing or malformed values", () => {
  assert.equal(parseStoredRiskReceipt(null), null);
  assert.equal(parseStoredRiskReceipt("not json"), null);
  assert.equal(parseStoredRiskReceipt(JSON.stringify({ id: "rr_missing" })), null);
});
