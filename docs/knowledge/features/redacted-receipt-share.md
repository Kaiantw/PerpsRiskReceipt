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
- [[redacted-market-context]]
- [[redacted-market-trend]]
- [[redacted-market-watchlist]]
- [[redacted-review-packet]]
- [[redacted-share-assistant]]
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
- Hyperliquid redacted previews can load current market context for disclosed
  markets without sending a raw account address.
- Hyperliquid redacted previews can load 24h public candle and funding-history
  context for disclosed markets without sending a raw account address.
- Hyperliquid redacted previews synthesize loaded current/trend context into a
  review watchlist without sending a raw account address.
- Redacted previews can copy a markdown review packet that includes disclosed
  buckets, public context, watchlist cues, and hash-reference-only caveats.
- Full bundles remain available when a reviewer needs to recompute the snapshot
  hash, import the receipt, run live recheck, generate the EAS fallback payload,
  or use receipt assistant context.

## related ideas

- [[portable-receipt-bundle]] remains the full verification/import lane.
- [[redacted-market-context]] adds current public mark, funding, and
  open-interest context to redacted shares.
- [[redacted-market-trend]] adds 24h public price and funding regime context to
  redacted shares.
- [[redacted-market-watchlist]] turns loaded redacted market context into
  reviewer-facing cues.
- [[redacted-share-assistant]] lets a reviewer ask cited questions without
  receiving the full snapshot.
- [[redacted-review-packet]] packages the redacted preview into a copyable
  markdown artifact.
- A future selective-disclosure proof could replace the current redacted JSON
  with EAS private data or Merkle-disclosure proofs.
