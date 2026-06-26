# redacted review thresholds

## status

Implemented for imported redacted receipt shares on `/receipt/import`.

## product idea

When a reviewer looks at a redacted receipt against the current market, the
valuable question is not whether the historical snapshot magically stayed live.
It is whether public movement, funding, range, or disclosed buffer context makes
the share safe to read as context, stale-but-informative, or in need of a full
receipt/live recheck.

## source links

- [[../sources/redacted-review-thresholds]]
- [[../sources/redacted-market-watchlist]]
- [[../sources/redacted-freshness-verdict]]
- [[redacted-market-watchlist]]
- [[redacted-freshness-verdict]]
- [[redacted-snapshot-comparison]]
- [[redacted-share-assistant]]
- [[redacted-review-packet]]

## implemented behavior

- Adds a `Redacted review sensitivity` panel to redacted previews.
- Provides `Strict`, `Standard`, and `Relaxed` local threshold profiles.
- Shows the active values for watch age, full-recheck age, thin/tight disclosed
  buffer, adverse move, funding movement, high funding movement, high public
  range, and public-range-versus-buffer ratios.
- Rebuilds the redacted market watchlist, freshness verdict, redacted snapshot
  comparison, assistant context, and copyable redacted review packet from the
  active profile.
- Adds a `Thresholds` redacted assistant prompt with field-style citations.
- Adds an explicit `redacted review thresholds` section to copied markdown.
- Keeps thresholds local to the current browser view and does not change the
  receipt, redacted bundle, snapshot hash, hidden full snapshot, live
  Hyperliquid data, or protocol risk.

## related ideas

- [[redacted-market-watchlist]] consumes the active thresholds for public review
  cues.
- [[redacted-freshness-verdict]] consumes the active thresholds for
  reviewable/stale/full-recheck classification.
- [[redacted-snapshot-comparison]] uses the same disclosed-buffer thresholds for
  redacted-only visible watch severity.
- [[redacted-share-assistant]] explains the active thresholds with citations.
- [[redacted-review-packet]] records the active thresholds in copied markdown.
