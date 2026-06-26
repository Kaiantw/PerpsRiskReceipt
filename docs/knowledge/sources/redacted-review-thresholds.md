# redacted review thresholds

## sources checked

- Hyperliquid margining: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/margining
- Hyperliquid liquidations: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/liquidations
- MetaMask perpetual futures liquidation mechanics: https://metamask.io/news/perpetual-futures-liquidation-mechanics
- Coinbase liquidation strategies: https://www.coinbase.com/learn/perpetual-futures/key-strategies-to-avoid-liquidations-in-perpetual-futures
- Bybit risk limits for perpetual and expiry contracts: https://www.bybit.com/en/help-center/article/Risk-Limit-Perpetual-and-Expiry-Contracts

## takeaways

- Perp risk is not only a saved position state. It changes as mark price, margin
  usage, maintenance requirements, funding, volatility, and liquidity change.
- A redacted receipt is still valuable as a timestamped historical artifact, but
  public current-market context decides whether it is calm enough to read or old
  enough to require a full recheck.
- Reviewers need different sensitivity levels. A hiring manager demo may want a
  strict profile that surfaces risk quickly; a noisy-market review may want a
  relaxed profile that avoids over-escalating ordinary movement.
- Public-only thresholds must never mutate the receipt, hidden full snapshot,
  redacted bundle, snapshot hash, or protocol risk model.

## threshold profiles

- `strict`: shorter age windows, wider thin/tight buffer thresholds, smaller
  adverse-move and funding thresholds, and lower public-range-versus-buffer
  ratios.
- `standard`: the balanced defaults previously used by the redacted market
  watchlist and freshness verdict.
- `relaxed`: older age windows, narrower buffer thresholds, larger adverse-move
  and funding thresholds, and higher public-range-versus-buffer ratios.

These profiles are local review heuristics, not exchange risk rules.

## linked feature ideas

- [[../features/redacted-review-thresholds]]
- [[../features/redacted-market-watchlist]]
- [[../features/redacted-freshness-verdict]]
- [[../features/redacted-snapshot-comparison]]
- [[../features/redacted-share-assistant]]
- [[../features/redacted-review-packet]]
