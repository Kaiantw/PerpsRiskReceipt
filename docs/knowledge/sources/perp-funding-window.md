# perp funding window

## sources checked

- Hyperliquid funding docs: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/funding
- Hyperliquid perpetuals info endpoint docs: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/perpetuals
- Coinbase funding-rate explainer: https://www.coinbase.com/learn/perpetual-futures/understanding-funding-rates-in-perpetual-futures

## takeaways

- Funding is a recurring transfer between long and short perp holders, so the
  current funding rate is a live holding-cost signal even when a receipt is a
  historical snapshot.
- Hyperliquid expresses the funding calculation as an 8-hour rate and pays it
  hourly at one eighth of that computed rate.
- The next funding payment estimate is useful because daily and 30-day carry can
  feel abstract; the next hourly estimate shows the immediate cost or earn rate
  if the position state remains open.
- Hyperliquid's exact payment uses oracle-price notional. The app estimates from
  normalized mark-price notional and must say so.
- `predictedFundings`, `fundingHistory`, and `userFunding` exist as read-only
  context sources, but this feature deliberately uses only the current funding
  already present in the loaded snapshot.

## product constraint

The funding-window read is review context only. It can say cost, earn, largest
driver, and estimate assumptions; it cannot tell a trader to enter, exit, hedge,
resize, or time a position.

## linked feature ideas

- [[../features/funding-window-read]]
- [[../features/funding-carry-watch]]
- [[../features/live-receipt-recheck]]
- [[../features/receipt-risk-assistant]]
