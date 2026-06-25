# perp risk review checklist

## sources checked

- Hyperliquid liquidations: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/liquidations
- Hyperliquid funding: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/funding
- Coinbase liquidation-risk guide: https://www.coinbase.com/learn/perpetual-futures/key-strategies-to-avoid-liquidations-in-perpetual-futures
- Investopedia perpetual futures guide: https://www.investopedia.com/what-are-perpetual-futures-7494870

## takeaways

- A receipt review should prioritize whether the live account is still the same
  account and position set before interpreting market movement.
- Hyperliquid liquidations depend on account equity, maintenance margin, mark
  price, funding, cross-position PnL, and liquidity. A summary should avoid
  claiming exact liquidation monitoring unless it implements the exact formula.
- Funding can drain or credit margin over time. A receipt summary should call
  out meaningful funding-cost changes separately from mark-price movement.
- Risk-review framing should highlight leverage/margin, liquidation buffer,
  funding, volatility, and changing market conditions without recommending a
  trade.

## linked feature ideas

- [[../features/receipt-change-summary]]
- [[../features/live-receipt-recheck]]
- [[../features/mark-price-context]]
- [[../features/funding-carry-watch]]
- [[../features/liquidation-buffer-ladder]]
