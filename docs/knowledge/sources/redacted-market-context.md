# redacted market context

## sources checked

- Hyperliquid perpetuals info endpoint: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/perpetuals
- Hyperliquid robust price indices: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/robust-price-indices
- Hyperliquid funding: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/funding
- CME Group open interest primer: https://www.cmegroup.com/education/courses/introduction-to-futures/open-interest

## takeaways

- `metaAndAssetCtxs` is enough for a market-only read: mark price, current
  funding, open interest, day volume, oracle price, and premium are public
  market fields.
- The feature should not send a user account address, because the point of a
  redacted share is to avoid reopening private account context.
- Hyperliquid mark price is the right current price to show because it is used
  for margining, liquidations, TP/SL triggers, and unrealized PnL.
- Hyperliquid funding is an 8-hour rate, paid hourly at one eighth of the rate;
  this app should keep showing it as holding-cost context.
- Open interest should be described as current market participation/liquidity
  context, not a standalone direction signal.

## linked feature ideas

- [[../features/redacted-market-context]]
- [[../features/redacted-receipt-share]]
- [[../features/mark-price-context]]
