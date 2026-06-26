# receipt review packet history summary

## status

Implemented for local Hyperliquid receipt review packets when browser-local
recheck history exists.

## product idea

A review packet should explain not only the latest live recheck, but also what
the reviewer saw across repeated saved checks. The packet now includes a compact
local-history trend so a trader or reviewer can discuss latest-versus-oldest
risk movement without exporting raw history rows or full private snapshots.

## source links

- [[../sources/perp-receipt-review-packet-history-summary]]
- [[receipt-review-packet]]
- [[receipt-recheck-history]]
- [[receipt-assistant-recheck-history]]
- [[portable-receipt-bundle]]

## implemented behavior

- Adds a `local recheck history` markdown section to the review packet only when
  at least one local history row is available.
- Includes trend label, headline, compact summary, saved-check count, latest and
  oldest risk score, risk-score delta, regime movement, repeated focus market,
  latest watchlist counts, and volatility-loaded coverage.
- Includes capped review points from the local history summary.
- Explicitly says the packet includes a compact browser-local trend only, not
  raw history rows or full private snapshots.
- Keeps the full portable receipt bundle as the path for hash recomputation and
  full-snapshot review.

## related ideas

- [[receipt-recheck-history]] supplies the compact local rows and trend summary.
- [[receipt-assistant-recheck-history]] explains the same trend conversationally.
- [[receipt-review-packet]] is the communication artifact that now carries the
  compact trend.
- [[portable-receipt-bundle]] remains the explicit full-disclosure export.
