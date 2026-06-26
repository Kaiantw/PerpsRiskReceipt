# perp receipt recheck history

## sources checked

- Hyperliquid portfolio graphs: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/portfolio-graphs
- Chainstack Hyperliquid portfolio info reference: https://docs.chainstack.com/reference/hyperliquid-info-portfolio
- MetaMask funding-trend strategies: https://metamask.io/news/perpetual-futures-funding-frequency-strategies
- CoinAPI historical perpetual futures data: https://www.coinapi.io/blog/historical-data-for-perpetual-futures
- Chainalysis perpetual futures overview: https://www.chainalysis.com/blog/perpetual-futures/

## takeaways

- A live perp snapshot moves quickly, so a stale receipt is useful only when it
  is treated as evidence of what was true at capture time and compared against
  newer reads.
- Hyperliquid portfolio/account-value history is sampled context, so local
  recheck history should not claim to be precise accounting.
- Funding trends, open-interest movement, liquidation distance, mark movement,
  and recent volatility are useful review context when comparing a saved state
  with the current market.
- The history should save compact derived review fields rather than full
  private trading snapshots by default.
- Local history should not become a trade journal, alert feed, exact
  liquidation monitor, or recommendation engine.

## linked feature ideas

- [[../features/receipt-recheck-history]]
- [[../features/receipt-market-regime]]
- [[../features/receipt-market-regime-drilldown]]
- [[../features/receipt-recheck-watchlist]]
- [[../features/receipt-review-packet]]
