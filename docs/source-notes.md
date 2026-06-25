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
- docs checked on 2026-06-25 for live receipt recheck:
  - https://hyperliquid.gitbook.io/hyperliquid-docs/trading/liquidations
  - https://hyperliquid.gitbook.io/hyperliquid-docs/trading/funding
  - https://hyperliquid.gitbook.io/hyperliquid-docs/trading/robust-price-indices
  - https://hyperliquid.gitbook.io/hyperliquid-docs/trading/entry-price-and-pnl
  - https://hyperliquid.gitbook.io/hyperliquid-docs/trading/portfolio-graphs
- docs checked on 2026-06-25 for funding carry watch:
  - https://hyperliquid.gitbook.io/hyperliquid-docs/trading/funding
  - https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/perpetuals
  - https://www.coinbase.com/learn/perpetual-futures/understanding-funding-rates-in-perpetual-futures
- docs checked on 2026-06-25 for market context:
  - https://hyperliquid.gitbook.io/hyperliquid-docs/trading/robust-price-indices
  - https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/perpetuals
  - https://www.britannica.com/money/futures-volume-open-interest
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
- live receipt recheck assumptions:
  - a saved receipt remains a historical snapshot even when live market data changes.
  - live recheck compares the receipt account against a fresh read-only Hyperliquid snapshot.
  - mark-price movement is a useful comparison because Hyperliquid uses mark price for margining, liquidations, TP/SL triggers, and unrealized pnl.
  - the recheck is not an exact liquidation monitor because listed liquidation prices can change with funding, cross-position pnl, and liquidity changes.
  - funding deltas are displayed as estimated holding-cost changes, not strategy recommendations.
- funding carry watch assumptions:
  - current funding comes from the existing `metaAndAssetCtxs` mapping.
  - historical `userFunding`, `fundingHistory`, and `predictedFundings` endpoints exist but are not called in this slice.
  - the watch assumes current funding and notional stay unchanged for daily and 30-day estimates.
  - Hyperliquid actual funding uses position size and oracle price; this app estimates from normalized mark-price notional.
  - positive user-perspective funding is shown as cost; negative is shown as earned funding.
- market context assumptions:
  - market context compares saved receipt positions to a fresh read-only snapshot after a local live receipt recheck.
  - mark price is the comparison price because Hyperliquid uses mark price for margining, liquidations, TP/SL triggers, and unrealized PnL.
  - a long position moving down is treated as moving toward listed liquidation; a short position moving up is treated as moving toward listed liquidation.
  - open interest is displayed as descriptive participation context only, not as a standalone bullish or bearish signal.
  - position-state changes take priority over mark/funding interpretation because a closed, new, resized, or side-changed position is no longer the same risk object.

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
