# perp receipt assistant driver citations

## sources checked

- Hyperliquid liquidations: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/liquidations
- Hyperliquid funding: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/funding
- Hyperliquid robust price indices: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/robust-price-indices
- Coinbase liquidation-risk guide: https://www.coinbase.com/learn/perpetual-futures/key-strategies-to-avoid-liquidations-in-perpetual-futures
- MetaMask leverage and margin guide: https://metamask.io/news/leverage-margin-perpetual-futures-trading

## takeaways

- Driver questions are a natural bridge between a historical receipt and the
  current market: the user wants to know what is now driving risk, not just
  whether one raw metric changed.
- Useful assistant answers should cite top driver, gross exposure, closest
  listed buffer, and funding burden because those map to leverage, liquidation,
  and carry-cost concepts in the source material.
- The assistant should preserve the same guardrails as the receipt page: explain
  what changed, but do not advise a trade, leverage change, hedge, close, or
  position resize.

## linked feature ideas

- [[../features/receipt-assistant-driver-citations]]
- [[../features/receipt-assistant-market-driver-drilldowns]]
- [[../features/receipt-risk-assistant]]
- [[../features/receipt-risk-driver-comparison]]
