# perp market context

## sources checked

- Hyperliquid robust price indices: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/robust-price-indices
- Hyperliquid perpetuals info endpoints: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/perpetuals
- Britannica Money on volume and open interest: https://www.britannica.com/money/futures-volume-open-interest
- CME Group open interest primer: https://www.cmegroup.com/education/courses/introduction-to-futures/open-interest

## takeaways

- Hyperliquid mark price is the relevant comparison price for this product
  because Hyperliquid uses mark price for margining, liquidations, TP/SL
  triggers, and unrealized PnL.
- The read-only `metaAndAssetCtxs` endpoint exposes market-level fields such as
  mark price, current funding, and open interest.
- Open interest is useful market context because it shows how much position
  commitment is still open in a derivatives market, but it should not be treated
  as a standalone direction signal.
- Receipt market context should answer whether the saved receipt is still
  representative, not whether the user should trade.
- Redacted market context can reuse the same public market fields without a
  user address, but it cannot compare hidden saved mark price or exact size.

## linked feature ideas

- [[../features/mark-price-context]]
- [[../features/redacted-market-context]]
- [[../features/live-receipt-recheck]]
- [[../features/funding-carry-watch]]
