# perp volatility watchlist

## sources checked

- Hyperliquid liquidations: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/liquidations
- Hyperliquid contract specifications: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/contract-specifications
- Schwab ATR overview: https://www.schwab.com/learn/story/average-true-range-indicator-and-volatility
- MetaMask liquidation mechanics: https://metamask.io/news/perpetual-futures-liquidation-mechanics
- Chainalysis perpetual futures overview: https://www.chainalysis.com/blog/perpetual-futures/

## takeaways

- Hyperliquid liquidations use mark price, and the listed liquidation price can
  still differ from exact liquidation behavior because of funding, liquidity,
  and other open-position PnL.
- Hyperliquid perps are no-expiry derivatives with funding payments, so review
  context should combine price movement, listed buffer, and funding rather than
  treating a receipt as timeless.
- ATR is useful as a volatility reference because it measures movement magnitude
  rather than price direction.
- Perp risk sources tie leverage, volatility, funding, and rapid liquidation
  risk together; that supports ranking public volatility-versus-buffer cues, but
  not making trade recommendations.

## product assumptions

- The watchlist uses volatility rows only after the user loads public 24h market
  history on a local Hyperliquid receipt page.
- High/watch volatility-buffer rows are review cues only. They do not prove
  liquidation, predict price, or prescribe opening/closing/hedging a position.
- Position-state changes still outrank volatility cues because a changed
  position is no longer the same risk object.
- Listed liquidation-buffer cues still outrank volatility cues because the app
  should preserve the clearest direct receipt risk signal first.
- The assistant can answer volatility questions from loaded fields, but must
  keep the no-alert/no-forecast/no-advice boundary.

## linked feature ideas

- [[../features/receipt-volatility-watchlist]]
- [[../features/receipt-volatility-buffer]]
- [[../features/receipt-recheck-watchlist]]
- [[../features/receipt-market-regime]]
- [[../features/receipt-assistant-watchlist-citations]]
- [[../features/receipt-review-packet]]
