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
- [[receipt-recheck-watchlist]]
- [[receipt-assistant-watchlist-citations]]
- [[receipt-risk-driver-comparison]]
- [[mark-price-context]]
- [[portable-receipt-bundle]]

## implemented behavior

- Builds deterministic markdown from the local receipt live recheck context.
- Includes receipt id, truncated account, protocol, timestamps, snapshot hash,
  hash verification state, and saved risk score.
- Includes live recheck status, receipt change summary, driver-comparison
  headline metrics, recheck watchlist counts/items, assistant watchlist answer,
  assistant citations, and market-context rows.
- Limits watchlist and market-context rows to five items each for a readable
  first packet.
- Renders a `Review packet` panel with copy-to-clipboard and read-only markdown.
- Explains that the packet is a review summary; full portable receipt bundles
  remain the path for another browser to recompute the snapshot hash.

## related ideas

- [[receipt-assistant-watchlist-citations]] supplies the inspect-first assistant
  read embedded in the packet.
- [[receipt-recheck-watchlist]] supplies ranked review cues.
- [[portable-receipt-bundle]] remains the full verification/export artifact.
