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
- It now includes `Receipt change summary` so the most important receipt-vs-live
  change is visible before the detailed comparison tables.
- It now includes [[receipt-risk-assistant]] so reviewers can ask cited
  questions about what changed, market context, funding, account history, and
  hash scope after the recheck.
- It pairs with [[portable-receipt-bundle]] so local receipts can be moved into
  another browser before running the same live recheck flow.

## related ideas

- [[funding-carry-watch]] can make the funding delta more useful.
- [[mark-price-context]] can explain why mark movement is the right comparison.
- [[receipt-change-summary]] combines live recheck, market context, and sampled
  account-history context.
- [[receipt-risk-assistant]] translates a loaded comparison into cited
  plain-English receipt answers.
- [[portable-receipt-bundle]] makes the local receipt review path portable
  without adding backend persistence.
