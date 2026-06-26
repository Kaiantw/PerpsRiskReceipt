# perp funding persistence

## sources checked

- Hyperliquid funding docs: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/funding
- Hyperliquid perpetuals info endpoint docs: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/perpetuals
- Hyperliquid info endpoint docs: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint

## takeaways

- Hyperliquid funding is a periodic transfer between long and short perp holders.
  Positive public funding means longs pay shorts; app reads are side-adjusted so
  positive means cost to the current position side and negative means credit.
- `fundingHistory` provides bounded public market funding points for a coin and
  time window. It is useful for answering whether the latest funding cost looks
  isolated, persistent, mixed, or favorable over the loaded window.
- The existing `market-history` route already calls public `fundingHistory`
  beside public candles, capped to five markets, so the persistence read can
  reuse that route without adding a new endpoint or sending a user address.
- `userFunding` is account-specific ledger history and is deliberately not used
  in this slice.
- `predictedFundings` exists, but this slice avoids it because recent actual
  funding history is enough for a bounded no-advice persistence read.

## product constraint

The funding-persistence read is descriptive review context only. It can say
whether public funding-history points show repeated cost, recent cost,
persistent credit, mixed funding, neutral funding, or no history. It cannot
forecast funding, time a trade, recommend opening/closing/changing exposure, or
claim exact Hyperliquid settlement accounting.

## linked feature ideas

- [[../features/funding-persistence-read]]
- [[../features/funding-window-read]]
- [[../features/funding-carry-watch]]
- [[../features/receipt-risk-assistant]]
- [[../features/receipt-review-packet]]
