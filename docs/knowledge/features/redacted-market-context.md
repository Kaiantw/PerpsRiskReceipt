# redacted market context

## status

Implemented for imported redacted Hyperliquid receipt shares.

## product idea

A redacted receipt hides the account and exact position state, but a reviewer
still benefits from knowing what the disclosed markets look like now. Market-only
context answers that without requiring the raw account snapshot: current mark,
oracle, funding, open interest, and day volume come from public Hyperliquid
market metadata.

## source links

- [[../sources/redacted-market-context]]
- [[../sources/redacted-receipt-sharing]]
- [[redacted-receipt-share]]
- [[mark-price-context]]
- docs/source-notes.md#hyperliquid

## implemented behavior

- `/api/hyperliquid/markets` accepts disclosed `*-PERP` market names only and
  calls `metaAndAssetCtxs`.
- The endpoint returns current public market fields without a user address:
  mark price, mid price, oracle price, previous-day price, funding bps, premium
  bps, open interest, and day volume.
- `/receipt/import` shows `Current market context` on redacted Hyperliquid
  previews with disclosed markets.
- The panel compares current funding to the redacted receipt's disclosed
  side-adjusted funding bps.
- The panel does not compare saved mark price, size, account value, PnL, or
  exact funding dollars because those fields are intentionally redacted.

## related ideas

- [[redacted-receipt-share]] is the privacy-preserving share object.
- [[mark-price-context]] remains the full-receipt saved-vs-current comparison
  once the private account snapshot is available.
- A later version could add a small public market trend sparkline using only
  market endpoints, still without an account address.
