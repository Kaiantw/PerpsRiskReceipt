# redacted share assistant

## sources checked

- Hyperliquid liquidations: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/liquidations
- Hyperliquid funding: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/funding
- Hyperliquid robust price indices: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/robust-price-indices
- Hyperliquid perpetual info endpoints: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/perpetuals
- W3C Credentials Community Group data minimization note: https://w3c-ccg.github.io/data-minimization/
- EAS private data attestations: https://docs.attest.org/docs/tutorials/private-data-attestations

## takeaways

- Hyperliquid mark price is useful current-market context because it is used for
  margining, liquidations, TP/SL triggers, and unrealized PnL, but a redacted
  share still hides the saved mark price and exact position state.
- Funding is a peer-to-peer holding-cost signal. A redacted assistant can explain
  whether public funding is costlier or more favorable for the disclosed side,
  but it should not tell the user what trade to make.
- Hyperliquid info endpoints expose public market context such as mark price,
  funding, and open interest without sending a raw account address.
- Redacted sharing should follow data minimization: answer from the visible
  fields needed for review and clearly label what remains hidden.
- A redacted assistant should cite local fields because conversational UI can
  otherwise feel more authoritative than the underlying evidence.
- The original snapshot hash can remain a useful reference, but a full snapshot
  is required to recompute it.

## linked feature ideas

- [[../features/redacted-share-assistant]]
- [[../features/redacted-receipt-share]]
- [[../features/redacted-market-context]]
- [[../features/redacted-market-trend]]
- [[../features/redacted-market-watchlist]]
- [[../features/redacted-review-packet]]
