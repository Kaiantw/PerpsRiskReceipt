# receipt review packet

## status

Implemented for browser-local Hyperliquid receipt live rechecks.

## product idea

After a live receipt recheck, a reviewer often needs a short artifact they can
paste into a note, issue, PR, or recruiter conversation. A markdown review
packet should summarize the receipt hash, live recheck, ranked watchlist,
assistant read, driver comparison, and market context without requiring the
recipient to inspect every panel manually.

## source links

- [[../sources/perp-receipt-review-packet]]
- [[../sources/perp-configurable-recheck-thresholds]]
- [[receipt-recheck-watchlist]]
- [[configurable-recheck-thresholds]]
- [[receipt-volatility-buffer]]
- [[receipt-market-regime]]
- [[receipt-market-regime-drilldown]]
- [[receipt-assistant-watchlist-citations]]
- [[receipt-risk-driver-comparison]]
- [[mark-price-context]]
- [[portable-receipt-bundle]]

## implemented behavior

- Builds deterministic markdown from the local receipt live recheck context.
- Includes receipt id, truncated account, protocol, timestamps, snapshot hash,
  hash verification state, and saved risk score.
- Includes live recheck status, receipt change summary, driver-comparison
  headline metrics, market-regime read, per-market regime rows, recheck watchlist counts/items,
  assistant watchlist answer, assistant citations, and market-context rows.
- Includes the active review threshold profile so copied markdown explains what
  counted as a watchlist cue.
- Includes loaded volatility-buffer context when the reviewer has fetched public
  24h market history on the receipt page.
- Includes compact local recheck-history trend context when saved browser-local
  history rows exist.
- Limits watchlist and market-context rows to five items each for a readable
  first packet.
- Renders a `Review packet` panel with copy-to-clipboard and read-only markdown.
- Explains that the packet is a review summary; full portable receipt bundles
  remain the path for another browser to recompute the snapshot hash.

## related ideas

- [[receipt-assistant-watchlist-citations]] supplies the inspect-first assistant
  read embedded in the packet.
- [[receipt-recheck-watchlist]] supplies ranked review cues.
- [[receipt-volatility-buffer]] supplies public volatility-vs-buffer context
  when loaded.
- [[receipt-market-regime]] supplies the compact current-environment read.
- [[receipt-market-regime-drilldown]] supplies the row-level explanation for the
  account-level regime label.
- [[receipt-review-packet-history-summary]] adds the latest-versus-oldest local
  recheck trend to the packet.
- [[redacted-review-packet]] is the data-minimized sibling for imported redacted
  shares.
- [[portable-receipt-bundle]] remains the full verification/export artifact.
