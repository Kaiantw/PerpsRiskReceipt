# redacted market watchlist

## sources checked

- Hyperliquid liquidations: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/liquidations
- Hyperliquid funding: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/funding
- Hyperliquid robust price indices: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/robust-price-indices
- Coinbase liquidation strategies: https://www.coinbase.com/learn/perpetual-futures/key-strategies-to-avoid-liquidations-in-perpetual-futures
- Coinbase funding rates: https://www.coinbase.com/learn/perpetual-futures/understanding-funding-rates-in-perpetual-futures
- Coinbase perpetuals risk page: https://www.coinbase.com/advanced-perpetuals
- Kraken perpetual futures guide: https://www.kraken.com/learn/trading/perpetual-futures-contracts

## takeaways

- Hyperliquid uses mark price for liquidation and margining context, so current
  mark and recent price movement are relevant when reading a stale receipt.
- Funding is a recurring peer-to-peer cost or credit that can accumulate while a
  perp position stays open.
- Leverage and liquidation buffers make volatility important: a stale snapshot
  with a tight disclosed buffer deserves more review than a stale snapshot with
  a wide disclosed buffer.
- Public current/trend context can help triage a redacted share, but it cannot
  verify hidden saved marks, exact size, account equity, or exact liquidation
  state.

## threshold choices

- Standard thin disclosed liquidation distance: `<= 500` bps.
- Standard tight disclosed liquidation distance: `<= 1000` bps.
- Standard material adverse 24-hour price move: `>= 2%` against the disclosed
  side.
- Standard material funding cost or funding delta: `>= 1` bps from the user's
  disclosed side perspective.
- Standard high funding movement: `>= 3` bps.
- Standard high public range: `>= 8%`, or at least half of the disclosed
  liquidation distance for watch and the full disclosed distance for high.
- Strict and relaxed profiles adjust those same dimensions for reviewer
  sensitivity.

These thresholds are review heuristics, not exchange risk rules.

## linked feature ideas

- [[../features/redacted-market-watchlist]]
- [[../features/redacted-review-packet]]
- [[../features/redacted-market-context]]
- [[../features/redacted-market-trend]]
- [[../features/redacted-receipt-share]]
- [[../features/redacted-review-thresholds]]
