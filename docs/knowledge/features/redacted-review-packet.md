# redacted review packet

## status

Implemented for imported redacted receipt shares on `/receipt/import`.

## product idea

A reviewer may want a pasteable risk summary without receiving the full private
receipt snapshot. The redacted review packet turns the already-disclosed
redacted receipt fields plus optional public market context, 24-hour trend, and
review watchlist into a copyable markdown artifact with explicit
hash-reference-only caveats.

## source links

- [[../sources/redacted-review-packet]]
- [[../sources/redacted-receipt-sharing]]
- [[../sources/redacted-market-watchlist]]
- [[../sources/redacted-freshness-verdict]]
- [[../sources/redacted-comparison-assistant-packet]]
- [[redacted-receipt-share]]
- [[redacted-market-context]]
- [[redacted-market-trend]]
- [[redacted-market-watchlist]]
- [[redacted-freshness-verdict]]
- [[redacted-snapshot-comparison]]
- [[redacted-comparison-assistant-packet]]
- [[redacted-share-assistant]]
- [[receipt-review-packet]]

## implemented behavior

- Adds a `Redacted review packet` panel to imported redacted shares.
- Builds deterministic markdown from the redacted bundle and already-loaded
  public market context.
- Includes receipt id, protocol, source/freshness, timestamps, snapshot hash
  reference, risk score, bucketed account/notional/funding values, margin usage,
  and disclosed market rows.
- Includes public current market context and public 24-hour trend sections when
  those panels have been loaded; otherwise the packet says the context is not
  loaded.
- Includes the redacted freshness verdict when computed, including label,
  receipt age, signal score, driver counts, summary, and capped top drivers.
- Includes the redacted snapshot comparison when loaded, including
  previous/latest receipt ids, timestamps, risk-score delta, cue counts,
  redacted-only freshness movement, notable metric movement, disclosed
  market-row changes, review points, and limits.
- Includes redacted review watchlist label, counts, and capped top cues.
- Explicitly says the packet cannot recompute or verify the hidden full snapshot
  hash and is not a trading recommendation.

## related ideas

- [[redacted-receipt-share]] defines the privacy boundary.
- [[redacted-market-context]] and [[redacted-market-trend]] supply optional public
  context.
- [[redacted-market-watchlist]] ranks public/disclosed review cues.
- [[redacted-freshness-verdict]] supplies the reviewable/stale/full-recheck
  verdict.
- [[redacted-comparison-assistant-packet]] carries loaded comparison context into
  this copyable markdown packet.
- [[redacted-share-assistant]] answers cited questions from the same public and
  disclosed fields.
- [[receipt-review-packet]] is the full-snapshot sibling used after local live
  receipt recheck.
