# portable receipt privacy

## sources checked

- Hyperliquid info endpoint: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint
- Hyperliquid perpetuals info endpoint: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/perpetuals
- EAS homepage: https://attest.org/
- EAS private/offchain overview: https://www.quicknode.com/guides/ethereum-development/smart-contracts/what-is-ethereum-attestation-service-and-how-to-use-it
- EASSCAN privacy policy: https://easscan.org/privacy
- W3C Credentials Community Group data minimization note: https://w3c-ccg.github.io/data-minimization/
- W3C Verifiable Credentials Data Model v2.0: https://www.w3.org/TR/vc-data-model-2.0/

## takeaways

- Hyperliquid read-only info endpoints can fetch current account and market
  context, but a historical receipt needs its captured snapshot if another
  reviewer should see exactly what was hashed.
- A snapshot hash is good for integrity, but it is not a private data transport
  by itself. Someone needs the underlying snapshot to recompute and inspect it.
- EAS supports public, offchain, and private-data patterns. The product should
  continue putting only minimal metadata and hashes into any onchain fallback
  path, while keeping full position data user-controlled.
- EASSCAN warns that public/onchain data is accessible and effectively
  permanent, while offchain/user-shared data can be disclosed by URL, direct
  download, or storage provider choice.
- The W3C privacy framing maps well to this feature: portable bundles are an
  explicit full disclosure for trusted review, while EAS/hash metadata is the
  minimized public proof lane.

## linked feature ideas

- [[../features/portable-receipt-bundle]]
- [[../features/live-receipt-recheck]]
- [[../features/receipt-risk-assistant]]
- [[../features/receipt-change-summary]]
