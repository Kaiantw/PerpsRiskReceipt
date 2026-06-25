# redacted market trend

## status

Implemented for imported redacted Hyperliquid receipt shares.

## product idea

Current market context answers "what does this market look like now?" A redacted
trend panel answers the next reviewer question: "is this current context a
one-off print, or has price/funding looked like this recently?"

## source links

- [[../sources/redacted-market-trend]]
- [[../sources/redacted-market-watchlist]]
- [[../sources/redacted-market-context]]
- [[redacted-market-context]]
- [[redacted-market-watchlist]]
- [[redacted-receipt-share]]
- docs/source-notes.md#hyperliquid

## implemented behavior

- `/api/hyperliquid/market-history` accepts disclosed `*-PERP` market names only
  and caps the lookup at five markets.
- The endpoint calls read-only `candleSnapshot` and `fundingHistory` info
  requests, with no user address.
- `/receipt/import` shows a `24h market trend` panel for redacted shares.
- The panel renders a small close-price sparkline, 24h price change, high/low
  range, average side-adjusted funding, latest side-adjusted funding, and a
  plain-English read.
- Trend labels prioritize adverse 24h price movement for the disclosed side,
  then persistent funding cost or persistent funding credit.
- The panel does not verify the hidden receipt state. It only adds public market
  regime context around a minimized redacted share.

## related ideas

- [[redacted-market-context]] shows current public market state.
- [[redacted-market-watchlist]] combines loaded current and 24-hour context into
  reviewer-facing cues.
- [[redacted-receipt-share]] defines the privacy boundary this panel respects.
