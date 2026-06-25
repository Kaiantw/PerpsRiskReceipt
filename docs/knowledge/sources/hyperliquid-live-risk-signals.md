# hyperliquid live risk signals

## sources checked

- Hyperliquid info endpoint: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint
- Hyperliquid perpetuals info endpoint: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/perpetuals
- Hyperliquid liquidations: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/liquidations
- Hyperliquid funding: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/funding
- Hyperliquid robust price indices: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/robust-price-indices
- Hyperliquid entry price and PnL: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/entry-price-and-pnl
- Hyperliquid portfolio graphs: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/portfolio-graphs

## takeaways

- The read-only info endpoint is the right boundary for this product. The app
  can query account summaries, open positions, mark prices, funding, and open
  interest without signing or placing orders.
- Liquidation monitoring should focus on account equity, maintenance margin,
  mark price, and the listed liquidation price. Hyperliquid warns that exact
  liquidation price can still move because of funding payments, other cross
  positions, and changing liquidity.
- Mark price is the relevant price for margining, liquidations, TP/SL triggers,
  and unrealized PnL. A receipt that only stores a stale snapshot is more useful
  when it can compare saved mark prices against current mark prices.
- Funding is paid hourly on Hyperliquid even though the formula is expressed as
  an eight-hour rate. Funding cost should be shown as a holding-cost estimate,
  not as a trade recommendation.
- Hyperliquid portfolio/account-value graphs are sampled and not intended for
  precise accounting. A future account-value timeline should label historical
  data as sampled context.

## linked feature ideas

- [[../features/live-receipt-recheck]]
- [[../features/funding-carry-watch]]
- [[../features/mark-price-context]]
- [[../features/account-value-timeline]]
- [[../features/ai-risk-assistant]]
