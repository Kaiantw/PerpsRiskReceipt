# redacted comparison assistant packet

## sources checked

- Binance Academy trading journal: https://www.binance.com/en/academy/articles/what-is-a-trading-journal-and-how-to-use-one
- CME position and risk management: https://www.cmegroup.com/education/courses/things-to-know-before-trading-cme-futures/position-and-risk-management
- Coinbase perpetual futures liquidation risk: https://www.coinbase.com/learn/perpetual-futures/key-strategies-to-avoid-liquidations-in-perpetual-futures
- MetaMask cross versus isolated margin in perpetual trading: https://metamask.io/news/cross-vs-isolated-margin-perps
- MetaMask perpetual futures liquidation mechanics: https://metamask.io/news/perpetual-futures-liquidation-mechanics
- W3C Verifiable Credentials Data Model 2.0: https://www.w3.org/TR/vc-data-model-2.0/
- W3C Privacy Principles: https://www.w3.org/TR/privacy-principles/

## takeaways

- Trading journals become useful through repeated review, not only capture.
  A comparison answer should therefore summarize what changed between two
  timestamped records and point at the fields behind the claim.
- Futures risk review benefits from tracking real-time or recent PnL, margin,
  liquidation exposure, and whether position risk is better or worse than the
  prior state.
- Perpetual futures compress risk through leverage, margin mode, funding, and
  volatility, so the comparison answer should call out liquidation buffer,
  margin usage, risk score, funding, and market-row changes.
- Selective disclosure and privacy principles support copying only the
  comparison fields needed for review instead of requiring the full private
  account snapshot.
- The assistant and packet should say when comparison context is not loaded and
  should not imply cryptographic proof, exact account movement, or trading
  advice.

## linked feature ideas

- [[../features/redacted-comparison-assistant-packet]]
- [[../features/redacted-snapshot-comparison]]
- [[../features/redacted-share-assistant]]
- [[../features/redacted-review-packet]]
- [[../features/redacted-receipt-share]]
