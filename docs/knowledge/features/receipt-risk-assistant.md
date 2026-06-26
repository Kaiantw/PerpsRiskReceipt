# receipt risk assistant

## status

Implemented for browser-local Hyperliquid receipt live rechecks.

## product idea

After a trader creates a receipt and rechecks it live, they should be able to
ask plain-English questions about what changed, what needs review, what the
hash verifies, and how funding/liquidation/account-history context affects the
read. The assistant should cite the receipt page's own computed sections rather
than giving uncited trading advice.

## source links

- [[../sources/perp-receipt-review-assistant]]
- [[../sources/perp-risk-review-checklist]]
- [[receipt-change-summary]]
- [[live-receipt-recheck]]
- [[receipt-account-value-context]]
- [[mark-price-context]]
- [[funding-carry-watch]]
- [[receipt-assistant-driver-citations]]
- [[receipt-assistant-market-driver-drilldowns]]
- [[receipt-assistant-market-context-fusion]]

## implemented behavior

- Shows after `Recheck live account` on local Hyperliquid receipt pages.
- Opens with a receipt-specific summary that cites the receipt change summary,
  saved risk score, live recheck status, and snapshot hash.
- Quick prompts cover review points, market context, risk drivers,
  named top-market drilldowns, liquidation distance, funding carry, receipt hash
  scope, and account-value history when loaded.
- Free-form questions route through deterministic local logic.
- Trade-intent questions are refused while still explaining receipt signals.
- Responses cite local evidence keys such as `receipt_change_summary`,
  `receipt_risk_driver_comparison`, `market_context`, `snapshot_comparison`,
  `receipt_account_value_context`, and `receipt.snapshot_hash`.

## connected feature ideas

- [[ai-risk-assistant]] can eventually share guardrail language and citation UI
  with this receipt-specific assistant.
- [[receipt-change-summary]] is now the assistant's primary "what changed" source.
- [[receipt-assistant-driver-citations]] makes [[receipt-risk-driver-comparison]]
  a direct citation source for driver-specific receipt questions.
- [[receipt-assistant-market-driver-drilldowns]] extends those citations to
  individual market rows.
- [[receipt-assistant-market-context-fusion]] merges individual market rows with
  the matching mark, funding, listed-buffer, and open-interest context.
- [[account-value-timeline]] could later add richer account-history citations if
  the app imports more complete portfolio history.
- [[portable-receipt-bundle]] lets the same assistant workflow apply after a
  reviewer imports a local receipt from another browser.
