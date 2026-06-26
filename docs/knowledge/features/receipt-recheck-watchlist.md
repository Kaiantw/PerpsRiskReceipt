# receipt recheck watchlist

## status

Implemented for browser-local Hyperliquid receipt live rechecks.

## product idea

After a live recheck, a reviewer should not have to mentally merge the receipt
change summary, risk-driver table, and market-context table. The app should
rank concrete review cues and show what deserves attention first.

## source links

- [[../sources/perp-receipt-recheck-watchlist]]
- [[../sources/perp-configurable-recheck-thresholds]]
- [[receipt-risk-driver-comparison]]
- [[receipt-assistant-market-context-fusion]]
- [[mark-price-context]]
- [[configurable-recheck-thresholds]]
- [[receipt-volatility-watchlist]]
- [[redacted-market-watchlist]]

## implemented behavior

- Builds a deterministic `Recheck watchlist` from existing
  `receipt_risk_driver_comparison` and `market_context` outputs.
- Ranks high/watch/info cues for account mismatch, position-state changes, thin
  listed liquidation buffers, adverse mark movement toward liquidation, higher
  driver score, higher funding cost, material open-interest movement, and
  missing market-context rows.
- Shows counts for total, high, watch, and info items.
- Accepts local review thresholds for listed liquidation buffer, adverse mark
  movement, driver-score movement, funding deltas, and open-interest movement.
- Adds loaded high/watch volatility-buffer rows when public 24h market history
  has been fetched on the receipt page.
- Renders review points for each item without adding trade recommendations.
- Reuses existing live recheck data and does not call a new endpoint.

## related ideas

- [[redacted-market-watchlist]] is the privacy-preserving market-only cousin of
  this feature.
- [[receipt-assistant-market-context-fusion]] can answer follow-up questions
  about a named market after the watchlist identifies it.
- [[receipt-assistant-watchlist-citations]] lets the assistant answer
  inspect-first questions from these ranked items.
- [[receipt-review-packet]] packages the top watchlist cues into a copyable
  markdown summary.
- [[configurable-recheck-thresholds]] lets the reviewer tune what crosses the
  watchlist threshold in the current review.
- [[receipt-volatility-watchlist]] adds public volatility-versus-buffer cues
  after the reviewer loads 24h market history.
- [[receipt-risk-driver-comparison]] and [[mark-price-context]] remain the
  underlying sources of truth.
