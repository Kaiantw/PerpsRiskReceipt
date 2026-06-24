import assert from "node:assert/strict";
import test from "node:test";

import { loadFixtureAccount } from "../perps/fixtures.ts";
import {
  canonicalJson,
  createRiskReceipt,
  hashSnapshot,
  receiptIdFromHash,
  verifyReceipt,
} from "./receipt.ts";

test("canonical json sorts object keys recursively", () => {
  assert.equal(
    canonicalJson({
      b: 2,
      a: {
        d: 4,
        c: 3,
      },
    }),
    '{"a":{"c":3,"d":4},"b":2}',
  );
});

test("snapshot hash is deterministic for the same fixture snapshot", async () => {
  const snapshot = loadFixtureAccount("demo-safe-eth-long");
  const firstHash = await hashSnapshot(snapshot);
  const secondHash = await hashSnapshot({
    ...snapshot,
    aggregate: {
      ...snapshot.aggregate,
    },
  });

  assert.equal(firstHash, secondHash);
  assert.match(firstHash, /^0x[a-f0-9]{64}$/);
});

test("risk receipt id is derived from the snapshot hash and verifies", async () => {
  const snapshot = loadFixtureAccount("demo-near-liquidation-btc-short");
  const receipt = await createRiskReceipt(snapshot);
  const verification = await verifyReceipt(receipt);

  assert.equal(receipt.id, receiptIdFromHash(receipt.snapshot_hash));
  assert.equal(receipt.snapshot.account, "demo-near-liquidation-btc-short");
  assert.equal(verification.matches, true);
});

test("receipt verification fails when snapshot content changes", async () => {
  const snapshot = loadFixtureAccount("demo-mixed-book");
  const receipt = await createRiskReceipt(snapshot);
  const tamperedReceipt = {
    ...receipt,
    snapshot: {
      ...receipt.snapshot,
      account_value_usd: receipt.snapshot.account_value_usd + 1,
    },
  };
  const verification = await verifyReceipt(tamperedReceipt);

  assert.equal(verification.matches, false);
});
