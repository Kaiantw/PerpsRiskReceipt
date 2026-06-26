# receipt snapshot drift

## status

Implemented for browser-local Hyperliquid receipt live rechecks.

## product idea

A verified receipt can still be old. Snapshot drift gives the reviewer one
plain-English answer to the question: is this frozen receipt still close to the
current market, or did live mark price, listed buffer, funding, age, or
watchlist cues make it stale for review?

## source links

- [[../sources/perp-snapshot-drift]]
- [[live-receipt-recheck]]
- [[mark-price-context]]
- [[receipt-change-summary]]
- [[receipt-recheck-watchlist]]
- [[receipt-market-regime]]
- [[receipt-review-packet]]

## implemented behavior

- Adds a pure `receipt_snapshot_drift` model for local receipt live rechecks.
- Labels the saved snapshot as `close_snapshot`, `drift_watch`,
  `stale_snapshot`, or `not_comparable`.
- Scores drift from 0 to 100 using receipt age, max saved-vs-current mark move,
  current minimum listed liquidation distance, daily funding delta, and
  high/watch recheck cue counts.
- Keeps account mismatch and position-state changes as not-comparable historical
  reads instead of treating them as ordinary market drift.
- Shows a `Snapshot drift` panel near the top of local live recheck results.
- Adds the same snapshot-drift section to copied/downloaded full receipt review
  packets.
- Uses existing live recheck objects and does not call a new endpoint or change
  the receipt/hash model.

## related ideas

- [[receipt-change-summary]] answers what changed most; snapshot drift answers
  whether the saved snapshot is still close enough for current review.
- [[mark-price-context]] supplies the saved-vs-current mark, funding, listed
  buffer, and open-interest rows underneath the drift read.
- [[receipt-recheck-watchlist]] supplies high/watch cue counts for the drift
  score.
- [[receipt-market-regime]] remains the broader current-environment read.
- [[receipt-review-packet]] carries the drift label and score into markdown
  evidence.
