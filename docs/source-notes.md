# source notes

use this file for external protocol assumptions.

## hyperliquid

- use read-only info endpoints only.
- do not use exchange/trading endpoints.
- do not infer response shapes without fixture examples.
- document endpoint, request body, response fields, and mapping into normalized types.

## eas

- use minimal attestation schema.
- store summary metadata + snapshot hash.
- do not put full private trading state onchain by default.

## viem/wagmi

- wallet-based signing only.
- no private keys in repo or env examples.
