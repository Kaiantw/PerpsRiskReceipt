# receipt recheck drift history

## status

Implemented for browser-local Hyperliquid receipt live recheck history.

## product idea

Snapshot drift answers whether one live recheck makes a saved receipt look
close, stale, or not comparable. Recheck drift history makes repeated checks
more useful by showing whether that freshness score is improving, worsening, or
unavailable across the compact local history timeline.

## source links

- [[../sources/perp-recheck-drift-history]]
- [[receipt-recheck-history]]
- [[receipt-snapshot-drift]]
- [[receipt-assistant-recheck-history]]
- [[receipt-review-packet-history-summary]]

## implemented behavior

- Stores snapshot-drift label, score, age, and focus market on each new compact
  local recheck-history row.
- Keeps older browser-local rows readable by treating missing drift fields as
  unavailable instead of dropping the row.
- Adds latest and oldest snapshot-drift label/score plus drift-score delta to
  the local history summary.
- Shows latest drift score and drift delta in the `Local recheck history` panel.
- Adds drift history to the receipt assistant's `Rechecks` answer.
- Adds latest/oldest snapshot drift and drift delta to the review packet's
  compact local-history section.
- Keeps history browser-local, capped, and derived; no backend sync, raw
  snapshot archive, alerting, or receipt/hash change.

## related ideas

- [[receipt-snapshot-drift]] supplies the per-recheck freshness label and score.
- [[receipt-recheck-history]] stores and summarizes the compact local rows.
- [[receipt-assistant-recheck-history]] explains the drift trend in a cited
  assistant answer.
- [[receipt-review-packet-history-summary]] carries the trend into copied or
  downloaded markdown without exporting raw history rows.
- [[receipt-market-regime]] remains the broader current-environment summary.
