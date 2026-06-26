# redacted snapshot comparison

## status

Implemented for imported redacted receipt shares on `/receipt/import`.

## product idea

A single redacted receipt answers, "what did risk look like at this moment?"
Two redacted receipts answer the more useful review question: "what changed?"
The redacted snapshot comparison accepts a second redacted bundle and compares
the two timestamped public summaries without exposing the hidden full snapshots.

## source links

- [[../sources/redacted-snapshot-comparison]]
- [[../sources/redacted-receipt-sharing]]
- [[../sources/redacted-freshness-verdict]]
- [[../sources/redacted-market-watchlist]]
- [[redacted-receipt-share]]
- [[redacted-freshness-verdict]]
- [[redacted-market-watchlist]]
- [[redacted-review-packet]]
- [[redacted-share-assistant]]

## implemented behavior

- Adds a `Redacted snapshot compare` panel to redacted previews.
- Accepts another redacted receipt bundle JSON as the comparison input.
- Orders the two bundles by `data_time_iso` so the result compares previous to
  latest even if the user pastes them in reverse order.
- Compares risk score, risk label, margin usage, minimum disclosed liquidation
  buffer, redacted-only disclosed watch severity, redacted-only freshness label,
  position count, account value bucket, total notional bucket, daily funding
  bucket, and 30-day funding bucket.
- Compares disclosed market rows by market and side, including row added,
  removed, liquidation-distance movement, funding movement, notional bucket
  changes, and open-interest bucket changes.
- Labels the visible comparison as `risk_improved`, `risk_worsened`,
  `risk_changed`, `unchanged`, or `not_comparable`.
- Uses field-style citations and copy that points to full bundles or live
  recheck for exact hidden-state proof.
- Does not change the portable bundle format and does not send a raw account
  address.

## related ideas

- [[redacted-receipt-share]] defines the minimized bundle being compared.
- [[redacted-freshness-verdict]] supplies the redacted-only freshness labels used
  in the comparison.
- [[redacted-market-watchlist]] remains the public-context watchlist for a single
  loaded redacted receipt.
- [[redacted-review-packet]] could later include a copyable comparison section.
- [[redacted-share-assistant]] could later answer comparison questions once the
  UI stores comparison context for the assistant.
