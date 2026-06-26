# redacted freshness verdict

## sources checked

- Hyperliquid liquidations: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/liquidations
- Hyperliquid funding: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/funding
- Hyperliquid robust price indices: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/robust-price-indices
- Hyperliquid perpetual info endpoints: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/perpetuals
- Coinbase liquidation risk framing: https://www.coinbase.com/learn/perpetual-futures/key-strategies-to-avoid-liquidations-in-perpetual-futures
- Coinbase funding-rate framing: https://www.coinbase.com/learn/perpetual-futures/understanding-funding-rates-in-perpetual-futures
- Chainalysis perpetual futures overview: https://www.chainalysis.com/blog/perpetual-futures/
- W3C Credentials Community Group data minimization note: https://w3c-ccg.github.io/data-minimization/

## takeaways

- A redacted receipt is a timestamped snapshot, not a live account monitor.
- Hyperliquid mark price matters because it is used for margining,
  liquidations, TP/SL triggers, and unrealized PnL, but redacted shares hide the
  saved mark and exact position values.
- Liquidation distance is useful as a disclosed buffer, but exact liquidation
  review still needs the hidden full snapshot and protocol context.
- Funding can move quickly and is paid between long and short sides. A redacted
  freshness read should flag material current funding movement without telling
  the reviewer what trade to make.
- Public 24-hour range and adverse side-aware price movement are useful context
  for deciding whether a stale redacted snapshot needs a full recheck.
- Strict/standard/relaxed threshold profiles are useful because review
  sensitivity should change by context without changing the redacted bundle or
  claiming exchange-official risk.
- Data minimization keeps the verdict to disclosed buckets, public market data,
  and field citations; it should not infer hidden account equity, exact size,
  saved marks, listed liquidation prices, PnL, or raw account identity.

## linked feature ideas

- [[../features/redacted-freshness-verdict]]
- [[../features/redacted-market-context]]
- [[../features/redacted-market-trend]]
- [[../features/redacted-market-watchlist]]
- [[../features/redacted-review-thresholds]]
- [[../features/redacted-share-assistant]]
- [[../features/redacted-review-packet]]
