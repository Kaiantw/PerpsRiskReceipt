# redacted share assistant

## status

Implemented for imported redacted receipt shares on `/receipt/import`.

## product idea

A reviewer of a minimized receipt should be able to ask, "what changed in the
current market?" without receiving the raw account, exact position sizes, saved
marks, listed liquidation prices, or PnL. The redacted share assistant answers
from the disclosed redacted fields, loaded public current market context, loaded
public 24-hour trend context, and the redacted watchlist.

## source links

- [[../sources/redacted-share-assistant]]
- [[../sources/redacted-receipt-sharing]]
- [[../sources/redacted-market-context]]
- [[../sources/redacted-market-trend]]
- [[../sources/redacted-market-watchlist]]
- [[redacted-receipt-share]]
- [[redacted-market-context]]
- [[redacted-market-trend]]
- [[redacted-market-watchlist]]
- [[redacted-review-packet]]

## implemented behavior

- Adds a `Redacted share assistant` panel to redacted previews.
- Provides prompt buttons for summary, watchlist, current public market context,
  24-hour trend, disclosed buffer, top cue, funding, and privacy/hash scope.
- Answers only from disclosed redacted receipt fields and already-loaded public
  context.
- Gives field-style citations for each answer so a reviewer can see which local
  fields supported the response.
- Handles unloaded current-market and 24-hour trend context by saying the context
  is not loaded.
- Gives named-market drilldowns when the question mentions a disclosed market or
  base coin.
- Refuses trade, leverage, hedge, and position-change requests while still
  explaining visible risk signals.
- Explains that the snapshot hash is a reference only for redacted bundles; full
  portable bundles are required for hash recomputation.

## related ideas

- [[redacted-market-context]] supplies public current mark, funding, and
  open-interest rows.
- [[redacted-market-trend]] supplies public 24-hour candle/range/funding rows.
- [[redacted-market-watchlist]] supplies inspect-first cues for the assistant.
- [[redacted-review-packet]] packages similar public/disclosed context as markdown.
- [[receipt-risk-assistant]] is the full-snapshot sibling after local receipt
  import and live recheck.
