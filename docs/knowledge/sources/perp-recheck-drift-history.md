# perp recheck drift history

## sources checked

- Hyperliquid info endpoint: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint
- Chainstack Hyperliquid portfolio info reference: https://docs.chainstack.com/reference/hyperliquid-info-portfolio
- Coinbase liquidation risk management: https://www.coinbase.com/learn/perpetual-futures/key-strategies-to-avoid-liquidations-in-perpetual-futures
- Coinbase funding rates: https://www.coinbase.com/learn/perpetual-futures/understanding-funding-rates-in-perpetual-futures
- Chainalysis perpetual futures overview: https://www.chainalysis.com/blog/perpetual-futures/
- CoinAPI historical perpetual futures data: https://www.coinapi.io/blog/historical-data-for-perpetual-futures

## takeaways

- A receipt remains useful as a point-in-time record, but a reviewer also needs
  repeated current-market checks to see whether the receipt is becoming more or
  less stale.
- Hyperliquid user and market info endpoints provide read-only data for current
  account state, sampled account-value history, candles, funding, and market
  context. Local history should keep derived review fields rather than full raw
  snapshots.
- Liquidation risk can change quickly with leverage, margin requirements, and
  volatility, so drift history should keep the current listed buffer and
  watchlist severity close to the latest row.
- Funding is a recurring holding-cost signal. A local history row should carry
  drift/funding context without implying a strategy or trade recommendation.
- Perp historical analysis often needs timestamped price, funding, open
  interest, and liquidation context. This app stays smaller by storing compact
  browser-local drift summaries instead of building a full market-data journal.

## linked feature ideas

- [[../features/receipt-recheck-drift-history]]
- [[../features/receipt-recheck-history]]
- [[../features/receipt-snapshot-drift]]
- [[../features/receipt-assistant-recheck-history]]
- [[../features/receipt-review-packet-history-summary]]
