# perp receipt assistant market-context fusion

## sources checked

- Hyperliquid robust price indices: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/robust-price-indices
- Hyperliquid funding: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/funding
- Hyperliquid liquidations: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/liquidations
- CME Group open interest primer: https://www.cmegroup.com/education/courses/introduction-to-futures/open-interest

## takeaways

- Named-market assistant answers are more useful when they combine two local
  receipt-page sources: the per-market risk-driver row and the matching
  saved-vs-current market-context row.
- Mark price belongs in the answer because Hyperliquid uses mark price for
  margining, liquidations, TP/SL triggers, and unrealized PnL.
- Funding belongs in the answer because it can turn a flat-price position into
  an ongoing holding-cost or holding-credit review item.
- Listed liquidation-distance movement belongs beside driver scores because a
  score delta without the buffer move is harder to evaluate.
- Open interest belongs as descriptive market participation context only. It
  should not be phrased as a standalone bullish, bearish, or action signal.
- If no matching market-context row is loaded, the assistant should say that
  plainly rather than implying it inspected mark/funding/open-interest context.

## linked feature ideas

- [[../features/receipt-assistant-market-context-fusion]]
- [[../features/receipt-assistant-market-driver-drilldowns]]
- [[../features/mark-price-context]]
- [[../features/receipt-risk-driver-comparison]]
