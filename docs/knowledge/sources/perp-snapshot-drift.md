# perp snapshot drift

## sources checked

- Hyperliquid info endpoint docs: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint
- Hyperliquid perpetuals info endpoint docs: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/perpetuals
- MetaMask perpetual futures liquidation mechanics: https://metamask.io/news/perpetual-futures-liquidation-mechanics
- MetaMask perpetual futures funding mechanics and timing: https://metamask.io/news/perpetual-futures-funding-frequency-strategies
- DEXTools perpetual futures funding, mark price, and liquidations: https://www.dextools.io/tutorials/perpetual-futures-funding-mark-price-liquidations
- Chainlink perpetual futures explainer: https://chain.link/article/what-are-perpetual-futures
- Investopedia perpetual futures guide: https://www.investopedia.com/what-are-perpetual-futures-7494870

## takeaways

- A receipt is useful as a historical snapshot, but a perp reviewer also needs
  to know whether current mark price, funding, and listed-buffer context have
  moved far enough that the snapshot should be treated as stale.
- Hyperliquid's read-only info endpoint already provides the current account
  snapshot, mark price, current funding, and open-interest context needed for a
  drift read; no exchange/trading endpoint is required.
- Mark price matters because it is used for unrealized PnL and liquidation
  context, so saved-vs-current mark movement is a strong receipt drift input.
- Funding applies to notional exposure over time, so a materially different
  funding estimate can make an old receipt read differently even when position
  size has not changed.
- Open interest is useful participation context, but it should not by itself
  decide whether the snapshot is stale or actionable.
- The feature should clearly separate snapshot integrity from freshness: the
  hash can remain verified while market context has drifted.

## linked feature ideas

- [[../features/receipt-snapshot-drift]]
- [[../features/receipt-change-summary]]
- [[../features/mark-price-context]]
- [[../features/receipt-recheck-watchlist]]
- [[../features/receipt-market-regime]]
- [[../features/receipt-review-packet]]
