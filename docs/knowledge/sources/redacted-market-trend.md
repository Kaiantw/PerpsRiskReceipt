# redacted market trend history

## sources checked

- Hyperliquid info endpoint: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint
- Hyperliquid perpetuals info endpoint: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/perpetuals
- Hyperliquid rate limits: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/rate-limits-and-user-limits

## takeaways

- `candleSnapshot` is a read-only info request for OHLCV candles. The app uses
  one-hour candles over a fixed 24-hour public market window.
- `fundingHistory` is a read-only info request for historical market funding
  rates by coin. The app side-adjusts those bps by the disclosed redacted
  receipt side.
- Hyperliquid limits time-range responses and assigns additional rate weight to
  `fundingHistory` and `candleSnapshot`, so redacted trend lookup should stay
  narrow and capped.
- This feature should never send a user address. Its value is showing whether
  current market context looks transient or persistent using public market data
  only.

## live response shape sampled

- `candleSnapshot` returned candle objects with `t`, `T`, `s`, `i`, `o`, `h`,
  `l`, `c`, `v`, and `n`.
- `fundingHistory` returned funding objects with `coin`, `fundingRate`,
  `premium`, and `time`.

## linked feature ideas

- [[../features/redacted-market-trend]]
- [[../features/redacted-market-context]]
- [[../features/redacted-receipt-share]]
