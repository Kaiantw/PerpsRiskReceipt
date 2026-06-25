# portable receipt bundle

## status

Implemented for browser-local live receipts.

## product idea

A local live receipt should be reviewable outside the browser that created it
without requiring backend storage or putting full private trading state onchain.
The portable bundle is an explicit user-controlled JSON export that carries the
full `risk_receipt` snapshot so another browser can import it, recompute the
snapshot hash, and open the normal local receipt page.

## source links

- [[../sources/portable-receipt-privacy]]
- [[live-receipt-recheck]]
- [[receipt-change-summary]]
- [[receipt-risk-assistant]]
- docs/product-spec.md#4-receipt-page
- docs/source-notes.md#hyperliquid
- docs/source-notes.md#eas

## implemented behavior

- Local live receipt pages show a `Portable receipt bundle` panel.
- The panel warns that the bundle contains the full private snapshot: account,
  markets, sizes, prices, liquidation prices, funding estimates, and risk
  metrics.
- A reviewer can copy the bundle JSON or download it as
  `rr_*.perps-risk-receipt.json`.
- `/receipt/import` accepts a pasted bundle, validates the envelope and receipt
  shape, recomputes the snapshot hash, shows a preview, and only enables import
  when the hash verifies.
- Imported receipts reuse the existing `/receipt/local/[id]` page, so hash
  verification, EAS fallback payload, account-value context, live recheck, and
  receipt assistant stay on the same rendering path.

## related ideas

- [[live-receipt-recheck]] remains the current-market comparison after import.
- [[receipt-change-summary]] is the quick read once an imported receipt is
  rechecked.
- [[receipt-risk-assistant]] can answer what the imported receipt proves and
  what still needs live context.
- A future redacted bundle could reveal only selected markets or aggregate risk,
  but this slice intentionally ships the simpler full-snapshot export with a
  strong warning.
