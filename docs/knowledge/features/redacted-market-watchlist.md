# redacted market watchlist

## status

Implemented for imported redacted Hyperliquid receipt shares.

## product idea

Redacted receipt shares are useful because they hide sensitive account fields,
but they can feel hard to judge when the market has moved. The review watchlist
turns already-loaded public current context and 24-hour trend context into a
short list of cues a reviewer should inspect first.

## source links

- [[../sources/redacted-market-watchlist]]
- [[../sources/redacted-review-thresholds]]
- [[../sources/redacted-market-context]]
- [[../sources/redacted-market-trend]]
- [[redacted-market-context]]
- [[redacted-market-trend]]
- [[redacted-receipt-share]]
- [[redacted-freshness-verdict]]
- [[redacted-review-thresholds]]
- [[redacted-review-packet]]
- [[redacted-share-assistant]]
- docs/source-notes.md#hyperliquid

## implemented behavior

- `/receipt/import` shows a `Review watchlist` panel for redacted shares.
- The panel builds from disclosed market rows plus any loaded current market
  context or 24-hour trend context.
- The watchlist calls no new endpoint and sends no raw account address.
- High/watch/info counts summarize the loaded cues.
- The active redacted review threshold profile controls what counts as thin,
  tight, adverse, material funding movement, high range, or range versus the
  disclosed buffer.
- Cues include thin or tight disclosed liquidation distance, adverse public
  24-hour trend for the disclosed side, persistent side-adjusted funding cost,
  current funding that is more expensive than the receipt, high public range
  versus disclosed buffer, missing current market context, and missing history.
- High-attention cues appear when adverse trend overlaps a tight disclosed
  buffer, persistent funding cost is also more expensive now, or public range is
  large compared with a tight disclosed buffer.
- The panel is review context only. It does not recompute the hidden snapshot
  hash, verify hidden fields, or recommend trades.

## related ideas

- [[redacted-market-context]] supplies the current public market rows.
- [[redacted-market-trend]] supplies the 24-hour public price and funding rows.
- [[redacted-receipt-share]] defines the privacy boundary the watchlist must
  respect.
- [[redacted-freshness-verdict]] uses watchlist severity as one input to the
  reviewable/stale/full-recheck classification.
- [[redacted-review-thresholds]] supplies strict/standard/relaxed local
  sensitivity profiles.
- [[redacted-share-assistant]] turns ranked watchlist cues into cited answers.
- [[redacted-review-packet]] carries the watchlist into a copyable public
  markdown summary.
