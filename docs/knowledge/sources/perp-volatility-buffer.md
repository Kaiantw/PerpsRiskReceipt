# perp volatility buffer

## source-backed notes

- Hyperliquid docs say liquidation uses mark price and that listed liquidation
  price can still differ from exact liquidation behavior because funding,
  liquidity, and other positions can change account state.
- Hyperliquid info endpoints provide public candle history through
  `candleSnapshot`, which is enough to derive 24h high-low range and
  ATR-style context without calling trading endpoints.
- ATR references from Schwab and Fidelity frame average true range as a
  volatility measure, not a directional prediction. This makes it useful for
  asking whether a listed buffer is large relative to recent movement.
- Perp risk references connect high leverage, volatility, funding, and rapid
  liquidation risk, supporting a feature that compares buffer size with recent
  public market movement.

## product assumptions

- The feature uses public candles only; it does not submit orders or inspect
  order-book depth.
- Current listed liquidation distance comes from the already-loaded live
  receipt recheck market context.
- 24h high-low range can show whether recent public movement was large relative
  to the current listed buffer.
- Average true range percent is used as an ATR-style volatility reference over
  the loaded hourly candles. It is not a signal to enter, exit, resize, or hedge.
- Position-state changes disable direct comparison because the saved and current
  rows are no longer the same risk object.
- The panel is a review aid. It is not Hyperliquid's exact liquidation formula,
  an alerting system, a forecast, or financial advice.

## related features

- [[../features/receipt-volatility-buffer]]
- [[../features/mark-price-context]]
- [[../features/receipt-review-packet]]
- [[../features/redacted-market-trend]]
