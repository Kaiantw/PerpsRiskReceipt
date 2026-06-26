# redacted snapshot comparison

## sources checked

- Binance Academy trading journal: https://www.binance.com/en/academy/articles/what-is-a-trading-journal-and-how-to-use-one
- CME position and risk management: https://www.cmegroup.com/education/courses/things-to-know-before-trading-cme-futures/position-and-risk-management
- Coinbase margin ratio and liquidation risk management: https://help.coinbase.com/en/coinbase/derivatives/us-derivatives-risk-management-and-liquidations
- Coinbase perpetual futures liquidation framing: https://www.coinbase.com/learn/perpetual-futures/key-strategies-to-avoid-liquidations-in-perpetual-futures
- Coinbase funding-rate framing: https://www.coinbase.com/learn/perpetual-futures/understanding-funding-rates-in-perpetual-futures
- Coinbase Advanced perpetuals risk overview: https://www.coinbase.com/advanced-perpetuals
- Hyperliquid liquidations: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/liquidations
- Hyperliquid funding: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/funding
- Hyperliquid robust price indices: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/robust-price-indices
- W3C Credentials Community Group data minimization note: https://w3c-ccg.github.io/data-minimization/

## takeaways

- Trading journals are valuable because comparing timestamped records helps a
  trader see progress, repeated patterns, and risk-management drift.
- Futures risk review should track account-appropriate exposure, volatile
  markets, and whether the current position profile can absorb adverse moves.
- Liquidation risk is tied to margin buffer and market movement, but redacted
  snapshots must not imply exact liquidation proof without hidden account state.
- Funding can materially change the read of a perp position, so side-adjusted
  funding buckets and funding bps deserve explicit compare rows.
- Redacted comparison should focus on visible, minimized fields: risk score,
  risk label, margin usage, disclosed liquidation buffer, funding buckets,
  position count, disclosed market rows, and redacted-only freshness.
- Data minimization requires the comparison to avoid raw account identity, exact
  position size, entry price, saved mark price, liquidation price, PnL, and
  exact account value.

## linked feature ideas

- [[../features/redacted-snapshot-comparison]]
- [[../features/redacted-receipt-share]]
- [[../features/redacted-freshness-verdict]]
- [[../features/redacted-market-watchlist]]
- [[../features/redacted-review-packet]]
- [[../features/redacted-share-assistant]]
