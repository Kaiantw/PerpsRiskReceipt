# mark price context

## status

Implemented in this slice.

## product idea

Add compact context explaining that liquidation, unrealized PnL, and live
receipt movement are based on mark price rather than last traded price. The
feature should help a receipt viewer decide whether a saved receipt still
resembles the current market without turning into a trading UI.

## source links

- [[../sources/hyperliquid-live-risk-signals]]
- [[../sources/perp-market-context]]
- [[../sources/perp-volatility-buffer]]
- [[live-receipt-recheck]]
- [[funding-carry-watch]]
- [[receipt-volatility-buffer]]

## implemented behavior

- Adds a `Market context since receipt` section inside local live receipt
  rechecks.
- Shows saved mark price, current mark price, and mark move percentage.
- Labels comparable long/short moves as toward liquidation, away from
  liquidation, flat, or not comparable.
- Shows current liquidation distance, 8-hour funding change, and open interest
  change where both receipt and live values exist.
- Summarizes the focus market and whether the most important context is position
  state, liquidation pressure, market movement, or funding movement.
- Keep the explanation short and source-linked in docs, not loud in the app.

## next connected feature

[[account-value-timeline]] can make this more useful by showing whether repeated
receipts point to a persistent deterioration or just a one-off market move.
[[receipt-volatility-buffer]] connects current listed buffer distance to public
24h candle movement.
