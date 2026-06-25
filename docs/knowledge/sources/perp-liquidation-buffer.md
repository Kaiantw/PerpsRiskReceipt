# perp liquidation buffer

## sources checked

- Hyperliquid liquidations: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/liquidations
- Hyperliquid margining: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/margining
- Hyperliquid robust price indices: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/robust-price-indices

## takeaways

- Liquidation is tied to account equity falling below maintenance margin, not
  just a single position price crossing in isolation.
- Hyperliquid uses mark price for liquidations; mark price can differ from the
  instantaneous book or last-trade price during volatility.
- Hyperliquid shows a liquidation price after a position is opened, but the docs
  warn the actual liquidation price may still change due to funding payments,
  liquidity changes, and unrealized PnL in other cross-margin positions.
- A product can still make the listed liquidation price useful by ranking the
  visible buffer, as long as the UI says it is a listed-buffer estimate.

## linked feature ideas

- [[../features/liquidation-buffer-ladder]]
- [[../features/mark-price-context]]
- [[../features/live-receipt-recheck]]
