# known limitations

- risk score is heuristic, not official protocol liquidation risk.
- fixture data may not reflect live market/account state.
- live hyperliquid adapter is read-only.
- no trading, order placement, or strategy recommendations.
- receipt hash proves snapshot integrity, not correctness of the external data source.
- eas attestation should store summary metadata and snapshot hash only, not full private trading state.
- scenario results apply the same percentage move to every position and do not model exchange-specific cross-margin behavior.
- liquidation distance uses the listed fixture liquidation price and should not be treated as an exact Hyperliquid liquidation calculation.
- receipt pages are deterministic fixture routes only; arbitrary pasted addresses are not persisted or shareable yet.
- eas receipt fields remain placeholders until a wallet submits the documented Sepolia attestation.
- receipt market-summary rows should be reviewed before relying on multi-position row-level liquidation/funding values.
- live hyperliquid lookup depends on Hyperliquid API availability and may fail gracefully back to fixture mode.
- live hyperliquid receipts are not persisted or shareable in this build.
- eas fallback payload is generated, but no schema registration or attestation transaction is sent by the app.
