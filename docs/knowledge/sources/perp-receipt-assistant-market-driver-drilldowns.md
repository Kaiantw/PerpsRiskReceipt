# perp receipt assistant market-driver drilldowns

## sources checked

- Hyperliquid liquidations: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/liquidations
- Hyperliquid funding: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/funding
- MetaMask leverage and margin guide: https://metamask.io/news/leverage-margin-perpetual-futures-trading
- MetaMask perpetual funding guide: https://metamask.io/news/perpetual-futures-funding-frequency-strategies
- Coinbase liquidation-risk guide: https://www.coinbase.com/learn/perpetual-futures/key-strategies-to-avoid-liquidations-in-perpetual-futures
- CME open interest guide: https://www.cmegroup.com/education/courses/introduction-to-futures/open-interest

## takeaways

- Named-market drilldowns should explain liquidation buffer, effective exposure,
  funding burden, and unrealized loss because these are the components the app
  already scores and they map to the source material's margin, leverage, and
  funding concepts.
- If side or size changes, the app should say the row is historical rather than
  pretending the saved and live rows are the same risk object.
- Open interest and market participation are useful context, but the assistant
  should not treat them as standalone direction signals or advice.
- Funding is a recurring position-level cost or credit, so a named-market answer
  should show daily funding and the funding delta when available.
- [[../features/receipt-assistant-market-context-fusion]] expands this answer
  with the matching mark-price, listed-buffer, funding-rate, daily-funding, and
  open-interest movement from `market_context.positions`.

## linked feature ideas

- [[../features/receipt-assistant-market-driver-drilldowns]]
- [[../features/receipt-assistant-market-context-fusion]]
- [[../features/receipt-assistant-driver-citations]]
- [[../features/receipt-risk-driver-comparison]]
