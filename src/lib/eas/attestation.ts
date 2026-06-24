import type { risk_receipt } from "../perps/types.ts";

export const EAS_SEPOLIA_CHAIN_ID = 11_155_111;
export const EAS_SEPOLIA_CHAIN_NAME = "Sepolia";
export const EAS_SEPOLIA_CONTRACT_ADDRESS =
  "0xC2679fBD37d54388Ce493F1DB75320D236e1815e";
export const EAS_SEPOLIA_SCHEMA_REGISTRY_ADDRESS =
  "0x0a7E2Ff54e76B8E6659aedc9103FB21c038050D0";
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
export const EAS_RISK_RECEIPT_SCHEMA =
  "bytes32 snapshotHash,bytes32 accountHash,bytes32 protocolHash,uint16 riskScore,uint64 dataTimestamp,uint64 accountValueUsd,uint64 totalNotionalUsd,uint64 marginUsageBps";

type eas_static_field = {
  name: string;
  type: "bytes32" | "uint16" | "uint64";
  value: string;
  encoded_value: string;
};

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hashText(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );

  return `0x${bytesToHex(new Uint8Array(digest))}`;
}

function encodeBytes32(value: string) {
  const hex = value.toLowerCase().replace(/^0x/, "");

  if (!/^[a-f0-9]{64}$/.test(hex)) {
    throw new Error("Expected bytes32 hex value.");
  }

  return hex;
}

function encodeUint(value: bigint) {
  if (value < BigInt(0)) {
    throw new Error("Expected unsigned integer value.");
  }

  return value.toString(16).padStart(64, "0");
}

function toUsdCents(value: number) {
  return BigInt(Math.round(value * 100));
}

function toUnixSeconds(iso: string) {
  const timestampMs = Date.parse(iso);

  if (!Number.isFinite(timestampMs)) {
    throw new Error(`Invalid ISO timestamp: ${iso}`);
  }

  return BigInt(Math.floor(timestampMs / 1000));
}

function encodeStaticFields(fields: eas_static_field[]) {
  return `0x${fields.map((field) => field.encoded_value).join("")}`;
}

export async function buildEasAttestationPayload(receipt: risk_receipt) {
  const snapshot = receipt.snapshot;
  const aggregate = snapshot.aggregate;
  const accountHash = await hashText(snapshot.account);
  const protocolHash = await hashText(snapshot.protocol);
  const fields: eas_static_field[] = [
    {
      name: "snapshotHash",
      type: "bytes32",
      value: receipt.snapshot_hash,
      encoded_value: encodeBytes32(receipt.snapshot_hash),
    },
    {
      name: "accountHash",
      type: "bytes32",
      value: accountHash,
      encoded_value: encodeBytes32(accountHash),
    },
    {
      name: "protocolHash",
      type: "bytes32",
      value: protocolHash,
      encoded_value: encodeBytes32(protocolHash),
    },
    {
      name: "riskScore",
      type: "uint16",
      value: String(aggregate.risk_score),
      encoded_value: encodeUint(BigInt(aggregate.risk_score)),
    },
    {
      name: "dataTimestamp",
      type: "uint64",
      value: String(toUnixSeconds(snapshot.data_time_iso)),
      encoded_value: encodeUint(toUnixSeconds(snapshot.data_time_iso)),
    },
    {
      name: "accountValueUsd",
      type: "uint64",
      value: String(toUsdCents(snapshot.account_value_usd)),
      encoded_value: encodeUint(toUsdCents(snapshot.account_value_usd)),
    },
    {
      name: "totalNotionalUsd",
      type: "uint64",
      value: String(toUsdCents(aggregate.total_notional_usd)),
      encoded_value: encodeUint(toUsdCents(aggregate.total_notional_usd)),
    },
    {
      name: "marginUsageBps",
      type: "uint64",
      value: String(aggregate.margin_usage_bps),
      encoded_value: encodeUint(BigInt(aggregate.margin_usage_bps)),
    },
  ];

  return {
    chain_id: EAS_SEPOLIA_CHAIN_ID,
    chain_name: EAS_SEPOLIA_CHAIN_NAME,
    eas_contract_address: EAS_SEPOLIA_CONTRACT_ADDRESS,
    schema_registry_address: EAS_SEPOLIA_SCHEMA_REGISTRY_ADDRESS,
    schema: EAS_RISK_RECEIPT_SCHEMA,
    recipient: ZERO_ADDRESS,
    expiration_time: 0,
    revocable: true,
    ref_uid: ZERO_BYTES32,
    encoded_data: encodeStaticFields(fields),
    decoded_fields: fields,
    manual_steps: [
      "Register the schema on the Sepolia EAS SchemaRegistry if no schema UID exists yet.",
      "Call EAS.attest on Sepolia with the schema UID, zero recipient, no expiration, revocable true, zero refUID, and the encoded data below.",
      "Store the returned attestation UID and transaction hash on the receipt metadata.",
    ],
  };
}
