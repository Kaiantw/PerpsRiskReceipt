# source notes

use this file for external protocol assumptions.

## hyperliquid

- use read-only info endpoints only.
- do not use exchange/trading endpoints.
- do not infer response shapes without fixture examples.
- document endpoint, request body, response fields, and mapping into normalized types.
- docs checked on 2026-06-24:
  - https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint
  - https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/perpetuals
- implemented endpoint:
  - `POST https://api.hyperliquid.xyz/info`
- request bodies:
  - `{ "type": "clearinghouseState", "user": "0x..." }`
  - `{ "type": "metaAndAssetCtxs" }`
- normalized mapping:
  - `marginSummary.accountValue` -> `account_value_usd`
  - `marginSummary.totalMarginUsed` -> `margin_used_usd`
  - `withdrawable` -> `withdrawable_usd`
  - `time` -> `data_time_iso`
  - `assetPositions[].position.coin` -> `${coin}-PERP`
  - signed `assetPositions[].position.szi` -> side and absolute size
  - `assetPositions[].position.entryPx` -> `entry_price_usd`
  - `assetPositions[].position.liquidationPx` -> `liquidation_price_usd`
  - `metaAndAssetCtxs[0].universe` + `metaAndAssetCtxs[1]` -> mark price, funding, and open interest by coin
  - asset context `markPx` -> `mark_price_usd`
  - asset context `funding` -> funding bps from user perspective; positive means user pays, negative means user earns
  - asset context `openInterest * markPx` -> `open_interest_usd`
- stale rule:
  - live responses older than five minutes are marked `stale`.

## eas

- use minimal attestation schema.
- store summary metadata + snapshot hash.
- do not put full private trading state onchain by default.
- docs checked on 2026-06-24:
  - https://docs.attest.org/docs/developer-tools/eas-sdk
  - https://github.com/ethereum-attestation-service/eas-sdk
  - https://raw.githubusercontent.com/ethereum-attestation-service/eas-contracts/master/deployments/sepolia/EAS.json
  - https://raw.githubusercontent.com/ethereum-attestation-service/eas-contracts/master/deployments/sepolia/SchemaRegistry.json
- Sepolia addresses used for fallback payload:
  - EAS: `0xC2679fBD37d54388Ce493F1DB75320D236e1815e`
  - SchemaRegistry: `0x0a7E2Ff54e76B8E6659aedc9103FB21c038050D0`
- fallback schema:
  - `bytes32 snapshotHash,bytes32 accountHash,bytes32 protocolHash,uint16 riskScore,uint64 dataTimestamp,uint64 accountValueUsd,uint64 totalNotionalUsd,uint64 marginUsageBps`
- fallback privacy note:
  - the encoded payload stores account/protocol hashes rather than the raw account identifier.
- manual fallback steps:
  - register the schema on Sepolia if no schema UID exists.
  - call `EAS.attest` with zero recipient, no expiration, revocable true, zero refUID, and the encoded payload.
  - store the returned attestation UID and tx hash on receipt metadata.

## viem/wagmi

- wallet-based signing only.
- no private keys in repo or env examples.
