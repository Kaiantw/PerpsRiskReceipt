import assert from "node:assert/strict";
import test from "node:test";

import { loadFixtureAccount } from "../perps/fixtures.ts";
import { createRiskReceipt } from "../receipts/receipt.ts";
import {
  buildEasAttestationPayload,
  EAS_RISK_RECEIPT_SCHEMA,
  EAS_SEPOLIA_CHAIN_ID,
  EAS_SEPOLIA_CONTRACT_ADDRESS,
  ZERO_ADDRESS,
  ZERO_BYTES32,
} from "./attestation.ts";

test("builds a deterministic static EAS attestation payload", async () => {
  const receipt = await createRiskReceipt(
    loadFixtureAccount("demo-safe-eth-long"),
  );
  const payload = await buildEasAttestationPayload(receipt);
  const repeatedPayload = await buildEasAttestationPayload(receipt);

  assert.equal(payload.chain_id, EAS_SEPOLIA_CHAIN_ID);
  assert.equal(payload.eas_contract_address, EAS_SEPOLIA_CONTRACT_ADDRESS);
  assert.equal(payload.schema, EAS_RISK_RECEIPT_SCHEMA);
  assert.equal(payload.recipient, ZERO_ADDRESS);
  assert.equal(payload.ref_uid, ZERO_BYTES32);
  assert.equal(payload.encoded_data, repeatedPayload.encoded_data);
  assert.equal(payload.encoded_data.startsWith(receipt.snapshot_hash), true);
  assert.equal(payload.encoded_data.length, 2 + 64 * 8);
});

test("does not encode the raw fixture account into the EAS payload", async () => {
  const receipt = await createRiskReceipt(loadFixtureAccount("demo-mixed-book"));
  const payload = await buildEasAttestationPayload(receipt);
  const accountHex = Buffer.from(receipt.snapshot.account, "utf8").toString(
    "hex",
  );

  assert.equal(payload.encoded_data.includes(accountHex), false);
  assert.equal(
    payload.decoded_fields.some(
      (field) => field.name === "accountHash" && field.type === "bytes32",
    ),
    true,
  );
});
