# perp receipt assistant watchlist citations

## sources checked

- Hyperliquid liquidations: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/liquidations
- Hyperliquid funding: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/funding
- Hyperliquid robust price indices: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/robust-price-indices
- Coinbase liquidation-risk guide: https://www.coinbase.com/learn/perpetual-futures/key-strategies-to-avoid-liquidations-in-perpetual-futures
- CME Group open interest primer: https://www.cmegroup.com/education/courses/introduction-to-futures/open-interest

## takeaways

- A receipt assistant becomes more useful when it can answer "what should I
  inspect first?" from ranked review cues rather than only broad summaries.
- The answer should cite the same local watchlist fields shown on the page so a
  reviewer can audit the explanation.
- Watchlist answers should preserve the no-advice boundary: they can rank review
  cues, but cannot recommend opening, closing, increasing, reducing, hedging, or
  adding leverage.
- The top item should be treated as an inspection priority, not a trade signal.

## linked feature ideas

- [[../features/receipt-assistant-watchlist-citations]]
- [[../features/receipt-recheck-watchlist]]
- [[../features/receipt-risk-assistant]]
- [[../features/receipt-assistant-market-context-fusion]]
