# compact redacted risk note

## status

Implemented for imported redacted receipt shares on `/receipt/import`.

## product idea

The full redacted review packet is good for deep review, but it is too long for
quick issue comments or social sharing. Compact mode creates a shorter public
risk note from the same disclosed fields, loaded public market context, active
thresholds, freshness verdict, and optional redacted comparison.

## source links

- [[../sources/compact-redacted-risk-note]]
- [[../sources/markdown-packet-export]]
- [[../sources/redacted-review-packet]]
- [[../sources/redacted-review-thresholds]]
- [[redacted-review-packet]]
- [[redacted-review-thresholds]]
- [[redacted-freshness-verdict]]
- [[redacted-snapshot-comparison]]
- [[markdown-packet-download]]

## implemented behavior

- Adds compact/full mode controls to the `Redacted review packet` panel.
- Defaults imported redacted shares to compact mode for quicker public sharing.
- Compact markdown includes receipt id, protocol/source, data timestamp, short
  snapshot hash reference, risk score/label, account and notional buckets,
  margin usage, disclosed liquidation-distance summary, funding buckets,
  context-loaded state, freshness verdict, cue counts, active thresholds,
  optional comparison summary, and capped top review cues.
- Full mode remains available and keeps the detailed redacted receipt, market
  context, trend, freshness, comparison, threshold, and watchlist sections.
- Copy and download use the selected mode so reviewers can choose between
  concise and detailed artifacts.
- Compact limits explicitly say the hidden full snapshot is required to
  recompute the original hash and that the note is not a live monitor, official
  protocol risk calculation, or trading advice.

## related ideas

- [[redacted-review-packet]] remains the detailed markdown artifact.
- [[redacted-review-thresholds]] supplies the active sensitivity values copied
  into the compact note.
- [[redacted-freshness-verdict]] supplies the compact reviewable/stale/full
  recheck label.
- [[redacted-snapshot-comparison]] supplies the optional previous/latest summary.
- [[markdown-packet-download]] preserves the selected compact/full packet as a
  local `.md` file.
