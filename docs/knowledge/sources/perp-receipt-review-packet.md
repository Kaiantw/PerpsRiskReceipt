# perp receipt review packet

## sources checked

- Hyperliquid liquidations: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/liquidations
- Hyperliquid funding: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/funding
- Hyperliquid robust price indices: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/robust-price-indices
- Coinbase liquidation-risk guide: https://www.coinbase.com/learn/perpetual-futures/key-strategies-to-avoid-liquidations-in-perpetual-futures
- CME Group open interest primer: https://www.cmegroup.com/education/courses/introduction-to-futures/open-interest
- W3C data minimization: https://www.w3.org/TR/vc-data-model-2.0/

## takeaways

- A markdown review packet is useful for communication, not cryptographic
  verification. It should point reviewers back to the full portable bundle when
  hash recomputation is needed.
- The packet can safely summarize local app signals if it keeps the no-advice
  boundary clear and avoids claiming protocol-official risk.
- Truncating the account keeps the packet lighter than a full bundle, but the
  packet is still user-controlled disclosure and should be copied intentionally.
- Watchlist and market-context rows should be capped so the first version stays
  readable for recruiter or teammate review.

## linked feature ideas

- [[../features/receipt-review-packet]]
- [[../features/receipt-recheck-watchlist]]
- [[../features/receipt-assistant-watchlist-citations]]
- [[../features/portable-receipt-bundle]]
