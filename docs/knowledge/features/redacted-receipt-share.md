# redacted receipt share

## status

Implemented for browser-local live receipts.

## product idea

A trader or portfolio candidate may want to share proof-like risk context
without exposing raw account identifiers, exact account value, position sizes,
entry prices, mark prices, liquidation prices, PnL, or exact funding dollars.
Redacted receipt share mode creates a minimized bundle for public or lightweight
review while keeping the full bundle available for trusted verification.

## source links

- [[../sources/redacted-receipt-sharing]]
- [[../sources/portable-receipt-privacy]]
- [[portable-receipt-bundle]]
- docs/product-spec.md#4-receipt-page
- docs/source-notes.md#hyperliquid

## implemented behavior

- The local receipt `Portable receipt bundle` panel defaults to `Redacted
  share`.
- Redacted bundles disclose receipt id, snapshot hash reference, protocol,
  source, freshness, receipt/data timestamps, risk score, risk label, margin
  usage, minimum liquidation distance, bucketed account value, bucketed total
  notional, bucketed funding estimates, position count, and market-level rows.
- Market rows disclose market, side, notional bucket, listed liquidation
  distance, funding 8-hour bps, and optional open-interest bucket.
- Redacted bundles list the fields intentionally hidden.
- `/receipt/import` can inspect redacted bundles and show a redacted preview,
  but does not import them as full local receipts.
- Full bundles remain available when a reviewer needs to recompute the snapshot
  hash, import the receipt, run live recheck, generate the EAS fallback payload,
  or use receipt assistant context.

## related ideas

- [[portable-receipt-bundle]] remains the full verification/import lane.
- A future selective-disclosure proof could replace the current redacted JSON
  with EAS private data or Merkle-disclosure proofs.
