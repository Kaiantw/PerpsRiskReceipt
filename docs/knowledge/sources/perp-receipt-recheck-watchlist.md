# perp receipt recheck watchlist

## sources checked

- Hyperliquid liquidations: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/liquidations
- Hyperliquid funding: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/funding
- Hyperliquid robust price indices: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/robust-price-indices
- Coinbase liquidation-risk guide: https://www.coinbase.com/learn/perpetual-futures/key-strategies-to-avoid-liquidations-in-perpetual-futures
- CME Group open interest primer: https://www.cmegroup.com/education/courses/introduction-to-futures/open-interest
- Schwab ATR overview: https://www.schwab.com/learn/story/average-true-range-indicator-and-volatility

## takeaways

- A full receipt recheck can rank review cues more precisely than a redacted
  share because it can use exact saved/current driver rows and market-context
  rows.
- Thin listed liquidation distance, adverse mark movement toward liquidation,
  materially higher driver score, and higher funding cost are review cues that
  deserve priority.
- Position-state changes should be treated as high-attention historical-context
  cues because a closed, new, resized, or side-changed position is no longer the
  same risk object.
- Open-interest movement is useful as market participation context, but should
  stay informational rather than high severity or directional.
- Loaded volatility-buffer rows are useful watchlist inputs when public 24h
  range is large relative to current listed buffer, because they combine public
  movement magnitude with the receipt's current liquidation-buffer context.
- The watchlist should not recommend opening, closing, reducing, increasing, or
  hedging positions. It only ranks what to inspect first.

## linked feature ideas

- [[../features/receipt-recheck-watchlist]]
- [[../features/receipt-risk-driver-comparison]]
- [[../features/receipt-assistant-market-context-fusion]]
- [[../features/receipt-volatility-watchlist]]
- [[../features/redacted-market-watchlist]]
