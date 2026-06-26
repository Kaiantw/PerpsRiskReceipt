# redacted freshness verdict

## status

Implemented for imported redacted receipt shares on `/receipt/import`.

## product idea

A stale receipt can still be valuable if a reviewer can see how far it is from
the current public market. The redacted freshness verdict turns receipt age,
disclosed liquidation buffers, loaded current market context, 24-hour public
trend data, funding movement, and redacted watchlist severity into a plain
classification: `reviewable`, `stale but informative`, or `needs full recheck`.

## source links

- [[../sources/redacted-freshness-verdict]]
- [[../sources/redacted-market-context]]
- [[../sources/redacted-market-trend]]
- [[../sources/redacted-market-watchlist]]
- [[redacted-receipt-share]]
- [[redacted-market-context]]
- [[redacted-market-trend]]
- [[redacted-market-watchlist]]
- [[redacted-share-assistant]]
- [[redacted-review-packet]]

## implemented behavior

- Adds a `Freshness verdict` panel to redacted previews.
- Computes a deterministic verdict from disclosed redacted fields, receipt age,
  loaded public current market context, loaded public 24-hour trend context, and
  the redacted market watchlist.
- Returns `reviewable` when loaded public context is calm and no watch/high
  freshness cue crossed thresholds.
- Returns `stale_but_informative` when context is missing or watch-level cues
  appear, such as material funding movement, older timestamps, or public range
  using a meaningful share of the disclosed buffer.
- Returns `needs_full_recheck` when high cues appear, such as a receipt older
  than 24 hours, thin disclosed buffer, public 24-hour range reaching the
  disclosed buffer, adverse trend near a tight buffer, or high watchlist
  severity.
- Exposes driver counts, a bounded signal score, field-style citations, and
  review points.
- Feeds the verdict into the redacted share assistant and redacted review
  packet.
- Does not reveal hidden account identity, exact sizes, saved mark prices,
  listed liquidation prices, PnL, or exact account value.

## related ideas

- [[redacted-market-context]] supplies current public mark, funding, and
  open-interest rows.
- [[redacted-market-trend]] supplies public 24-hour range, adverse trend, and
  funding-history rows.
- [[redacted-market-watchlist]] supplies high/watch/info review severity.
- [[redacted-share-assistant]] answers whether a redacted receipt is still
  reviewable with verdict citations.
- [[redacted-review-packet]] carries the freshness verdict into copyable markdown.
