import assert from "node:assert/strict";
import test from "node:test";

import { loadFixtureAccount } from "../perps/fixtures.ts";
import {
  createPortableReceiptBundle,
  createRedactedReceiptBundle,
  getPortableReceiptBundlePreview,
  isFullReceiptBundle,
  isRedactedReceiptBundle,
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
    assert.equal(isFullReceiptBundle(parsed.bundle), true);

    if (!isFullReceiptBundle(parsed.bundle)) {
      return;
    }

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

test("redacted receipt bundle preserves hash reference while hiding private account and position fields", async () => {
  const receipt = await createRiskReceipt(loadFixtureAccount("demo-mixed-book"));
  const redactedBundle = createRedactedReceiptBundle(
    receipt,
    "2026-06-25T12:00:00.000Z",
  );
  const redactedJson = stringifyPortableReceiptBundle(redactedBundle);

  assert.equal(redactedBundle.snapshot_hash, receipt.snapshot_hash);
  assert.equal(redactedBundle.receipt_id, receipt.id);
  assert.equal(redactedBundle.aggregate.risk_score, 53);
  assert.equal(redactedBundle.aggregate.position_count, 3);
  assert.deepEqual(
    redactedBundle.markets.map((market) => market.market),
    ["BTC-PERP", "SOL-PERP", "ETH-PERP"],
  );
  assert.equal(redactedBundle.aggregate.account_value_bucket_usd, "$50k-$100k");
  assert.equal(redactedJson.includes(receipt.snapshot.account), false);
  assert.equal(redactedJson.includes("\"account\":"), false);
  assert.equal(redactedJson.includes("\"account_value_usd\""), false);
  assert.equal(redactedJson.includes("\"size\""), false);
  assert.equal(redactedJson.includes("entry_price_usd"), false);
  assert.equal(redactedJson.includes("mark_price_usd"), false);
  assert.equal(redactedJson.includes("liquidation_price_usd"), false);
  assert.equal(redactedJson.includes("unrealized_pnl_usd"), false);
});

test("redacted receipt bundle preview explains the hash cannot be recomputed from the redacted payload", async () => {
  const receipt = await createRiskReceipt(
    loadFixtureAccount("demo-safe-eth-long"),
  );
  const preview = getPortableReceiptBundlePreview(
    createRedactedReceiptBundle(receipt),
  );

  assert.equal(preview.contains_full_snapshot, false);

  if (!preview.contains_full_snapshot) {
    assert.equal(preview.can_recompute_snapshot_hash, false);
    assert.ok(preview.redacted_fields.includes("position sizes"));
    assert.ok(preview.redacted_fields.includes("exact account value"));
  }
});

test("redacted receipt bundle round-trips through the bundle parser", async () => {
  const receipt = await createRiskReceipt(
    loadFixtureAccount("demo-near-liquidation-btc-short"),
  );
  const parsed = parsePortableReceiptBundleJson(
    stringifyPortableReceiptBundle(createRedactedReceiptBundle(receipt)),
  );

  assert.equal(parsed.status, "valid");

  if (parsed.status === "valid") {
    assert.equal(isRedactedReceiptBundle(parsed.bundle), true);

    if (isRedactedReceiptBundle(parsed.bundle)) {
      assert.equal(parsed.bundle.snapshot_hash, receipt.snapshot_hash);
      assert.equal(parsed.bundle.aggregate.risk_label, "critical");
      assert.equal(parsed.bundle.markets[0]?.market, "BTC-PERP");
    }
  }
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
    assert.equal(isFullReceiptBundle(parsed.bundle), true);

    if (!isFullReceiptBundle(parsed.bundle)) {
      return;
    }

    const verification = await verifyReceipt(parsed.bundle.receipt);

    assert.equal(verification.matches, true);
  }
});

test("portable receipt parser rejects malformed redacted bundles", () => {
  const parsed = parsePortableReceiptBundleJson(
    JSON.stringify({
      kind: "perps-risk-receipt.redacted.v1",
      version: 1,
      privacy_level: "redacted_summary",
      exported_at_iso: "2026-06-25T12:00:00.000Z",
    }),
  );

  assert.deepEqual(parsed, {
    status: "invalid",
    message: "Redacted bundle is missing required summary fields.",
  });
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
