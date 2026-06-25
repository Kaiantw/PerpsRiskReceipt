# live receipt recheck

## status

Implemented in this slice.

## product idea

A risk receipt should stay useful after the market moves by separating two
claims:

- the saved receipt hash still verifies the original snapshot.
- a fresh live recheck shows whether the original risk story still resembles
  the current account state.

## source links

- [[../sources/hyperliquid-live-risk-signals]]
- [[../sources/perp-market-context]]
- docs/product-spec.md#4-receipt-page
- docs/source-notes.md#hyperliquid

## behavior

- Local live receipts get a "Live recheck" panel.
- The panel fetches the same account through the existing read-only
  Hyperliquid snapshot API.
- It compares account value, margin usage, total notional, minimum liquidation
  distance, daily funding, risk score, position state, and mark-price movement.
- It labels the comparison as account mismatch, position state changed, risk
  worsened, risk improved, market moved, or little changed.
- It now includes `Market context since receipt` so mark price, liquidation
  direction, funding, and open interest changes are easier to read before the
  raw metric grid.

## related ideas

- [[funding-carry-watch]] can make the funding delta more useful.
- [[mark-price-context]] can explain why mark movement is the right comparison.
- [[ai-risk-assistant]] can translate a loaded comparison into plain English.
