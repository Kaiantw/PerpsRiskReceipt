import assert from "node:assert/strict";
import test from "node:test";

import { loadFixtureAccount } from "../perps/fixtures.ts";
import {
  createPortableReceiptBundle,
  getPortableReceiptBundlePreview,
  parsePortableReceiptBundleJson,
  stringifyPortableReceiptBundle,
} from "./portable-receipt-bundle.ts";
import { createRiskReceipt, verifyReceipt } from "./receipt.ts";

test("portable receipt bundle round-trips a full risk receipt", async () => {
  const receipt = await createRiskReceipt(loadFixtureAccount("demo-mixed-book"));
  const bundle = createPortableReceiptBundle(
    receipt,
    "2026-06-25T12:00:00.000Z",
  );
  const parsed = parsePortableReceiptBundleJson(
    stringifyPortableReceiptBundle(bundle),
  );

  assert.equal(parsed.status, "valid");

  if (parsed.status === "valid") {
    assert.equal(parsed.bundle.receipt.id, receipt.id);
    assert.equal(parsed.bundle.receipt.snapshot_hash, receipt.snapshot_hash);
    assert.equal(parsed.bundle.exported_at_iso, "2026-06-25T12:00:00.000Z");
  }
});

test("portable receipt bundle preview calls out private snapshot fields", async () => {
  const receipt = await createRiskReceipt(
    loadFixtureAccount("demo-safe-eth-long"),
  );
  const preview = getPortableReceiptBundlePreview(
    createPortableReceiptBundle(receipt),
  );

  assert.equal(preview.receipt_id, receipt.id);
  assert.equal(preview.position_count, 1);
  assert.equal(preview.contains_full_snapshot, true);
  assert.ok(preview.private_fields.includes("position sizes"));
  assert.ok(preview.private_fields.includes("liquidation prices"));
});

test("imported portable receipt still verifies against its snapshot hash", async () => {
  const receipt = await createRiskReceipt(
    loadFixtureAccount("demo-near-liquidation-btc-short"),
  );
  const parsed = parsePortableReceiptBundleJson(
    stringifyPortableReceiptBundle(createPortableReceiptBundle(receipt)),
  );

  assert.equal(parsed.status, "valid");

  if (parsed.status === "valid") {
    const verification = await verifyReceipt(parsed.bundle.receipt);

    assert.equal(verification.matches, true);
  }
});

test("portable receipt parser rejects unsupported bundle envelopes", () => {
  assert.deepEqual(parsePortableReceiptBundleJson("not json"), {
    status: "invalid",
    message: "Bundle must be valid JSON.",
  });
  assert.deepEqual(parsePortableReceiptBundleJson("[]"), {
    status: "invalid",
    message: "Bundle must be a JSON object.",
  });
  assert.deepEqual(
    parsePortableReceiptBundleJson(
      JSON.stringify({
        kind: "perps-risk-receipt.portable.v0",
        version: 0,
      }),
    ),
    {
      status: "invalid",
      message: "Bundle format is not supported by this version of the app.",
    },
  );
});

test("portable receipt parser rejects unusable receipt snapshots", () => {
  const parsed = parsePortableReceiptBundleJson(
    JSON.stringify({
      kind: "perps-risk-receipt.portable.v1",
      version: 1,
      privacy_level: "full_snapshot",
      exported_at_iso: "2026-06-25T12:00:00.000Z",
      receipt: {
        id: "rr_bad",
        snapshot_hash: "0xabc",
        created_at_iso: "2026-06-25T12:00:00.000Z",
        snapshot: {
          account: "missing aggregate",
        },
      },
    }),
  );

  assert.deepEqual(parsed, {
    status: "invalid",
    message: "Bundle does not contain a usable risk receipt snapshot.",
  });
});
