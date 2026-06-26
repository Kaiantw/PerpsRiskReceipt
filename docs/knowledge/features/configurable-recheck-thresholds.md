# configurable recheck thresholds

## status

Implemented for browser-local Hyperliquid receipt live rechecks.

## product idea

Current market data is only useful when the reviewer can tell the app what
counts as meaningful for this review. A small threshold panel should let the
reviewer tune liquidation-buffer, mark-move, driver-score, funding, and
open-interest sensitivity without changing the saved receipt or the live data.

## source links

- [[../sources/perp-configurable-recheck-thresholds]]
- [[receipt-recheck-watchlist]]
- [[receipt-review-packet]]
- [[mark-price-context]]

## implemented behavior

- Adds a `Review thresholds` panel after local receipt live recheck.
- Lets the reviewer tune thin/tight listed liquidation buffer bps, adverse mark
  move percent, driver-score delta, daily funding USD, 8h funding bps, and
  open-interest USD millions.
- Rebuilds the recheck watchlist, receipt assistant context, and review packet
  from the active threshold values.
- Includes a reset-to-defaults control.
- Keeps thresholds local to the current browser view; they do not alter the
  receipt snapshot, snapshot hash, saved local receipt, live Hyperliquid data,
  or risk model.
- Sanitizes negative values and keeps the tight listed-buffer threshold at or
  above the thin listed-buffer threshold.

## related ideas

- [[receipt-recheck-watchlist]] consumes the active thresholds.
- [[receipt-review-packet]] records the active threshold profile in copied
  markdown.
- [[redacted-market-watchlist]] could later get a separate public-only threshold
  panel.
