# perp receipt assistant recheck history

## sources checked

- Hyperliquid portfolio graphs: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/portfolio-graphs
- Chainstack Hyperliquid portfolio info reference: https://docs.chainstack.com/reference/hyperliquid-info-portfolio
- MetaMask perpetual futures funding frequency: https://metamask.io/news/perpetual-futures-funding-frequency-strategies
- CoinAPI historical perpetual futures data: https://www.coinapi.io/blog/historical-data-for-perpetual-futures
- CME open interest overview: https://www.cmegroup.com/education/courses/introduction-to-futures/open-interest

## takeaways

- Hyperliquid portfolio/account-value history is sampled context, so assistant
  history answers should say local recheck history is compact review context
  rather than precise accounting.
- Funding, liquidation distance, volatility, and open-interest context can
  change while a receipt remains hash-valid, so a useful assistant should
  explain current-market trend without turning it into advice.
- Open interest is participation context, not a standalone direction signal.
- Local history answers should compare derived rows and cite their fields
  instead of implying the app retained a full private snapshot archive.
- A trader-facing assistant should separate "what changed over my saved
  checks" from "what should I trade."

## linked feature ideas

- [[../features/receipt-assistant-recheck-history]]
- [[../features/receipt-recheck-history]]
- [[../features/receipt-risk-assistant]]
- [[../features/receipt-review-packet]]
