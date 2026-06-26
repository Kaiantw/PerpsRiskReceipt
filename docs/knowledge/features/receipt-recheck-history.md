# receipt recheck history

## status

Implemented for browser-local Hyperliquid receipt live rechecks.

## product idea

A saved receipt is useful because it freezes one risk state. The next useful
question is how that state looks when checked again later. A local recheck
history gives reviewers a compact timeline of successful live rechecks without
turning the app into a backend account journal.

## source links

- [[../sources/perp-receipt-recheck-history]]
- [[receipt-market-regime]]
- [[receipt-market-regime-drilldown]]
- [[receipt-recheck-watchlist]]
- [[receipt-volatility-buffer]]
- [[receipt-snapshot-drift]]
- [[receipt-recheck-drift-history]]
- [[receipt-review-packet]]

## implemented behavior

- Stores one compact browser-local history row after each successful
  Hyperliquid local receipt live recheck.
- Captures the recheck timestamp, current data timestamp, data freshness,
  comparison status, headline, changed-position count, max mark-price move,
  current risk score, risk label, account value, margin usage, total notional,
  minimum listed liquidation distance, and current daily funding.
- Stores compact current-market review context: market-regime label/severity,
  focus market, watchlist counts, top per-market drilldown row, top cue,
  current listed buffer, funding burden, and whether public volatility context
  was loaded.
- Stores snapshot-drift label, score, age, and focus market for new rows while
  keeping older rows without drift fields readable.
- Parses local history defensively, filters malformed rows, dedupes by
  generated entry id, sorts newest-first, and caps each receipt at 12 rows.
- Renders the local timeline on the receipt page with clear local-only and
  no-trading-recommendation caveats.
- Exposes a compact trend summary used by [[receipt-assistant-recheck-history]]
  and by the local history panel.

## related ideas

- [[receipt-market-regime]] supplies the compact current-environment label.
- [[receipt-market-regime-drilldown]] supplies the top per-market cue.
- [[receipt-recheck-watchlist]] supplies the cue counts that make the row easy
  to scan.
- [[receipt-review-packet]] remains the shareable communication artifact; the
  local history is deliberately not exported or synced in this version.
- [[receipt-assistant-recheck-history]] explains the saved local rows without
  turning them into a live alert or trading recommendation.
- [[receipt-recheck-drift-history]] adds latest-versus-oldest freshness drift
  on top of the same compact local rows.
