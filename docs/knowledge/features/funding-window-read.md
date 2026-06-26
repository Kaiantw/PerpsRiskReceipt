# funding window read

## status

Implemented in this slice.

## product idea

Show the next estimated funding payment beside daily and 30-day carry so current
market context answers a practical review question: "If this position state were
still open, what is the immediate funding cost or earn direction?"

## source links

- [[../sources/perp-funding-window]]
- [[../sources/perp-funding-mechanics]]
- [[../sources/perp-funding-persistence]]
- [[funding-carry-watch]]
- [[funding-persistence-read]]
- [[live-receipt-recheck]]
- [[receipt-risk-assistant]]
- [[receipt-review-packet]]

## implemented behavior

- Extends the funding carry derivation with:
  - estimated next hourly funding
  - estimated 8-hour rate-basis funding
  - next hourly burden in bps of account value
  - largest next cost and largest next earn positions
  - review points documenting the estimate assumptions
- Shows next-hour and 8h-basis values in the dashboard funding carry panel.
- Shows a `Current funding window` panel after local receipt live recheck.
- Adds current funding-window context to the receipt assistant funding answer.
- Adds a `current funding window` section to copied/downloaded receipt review
  packets.

## review guardrails

- Uses already-loaded normalized snapshots only.
- Does not call trading endpoints, predicted funding, user funding history, or
  order-related APIs.
- Estimates from normalized mark-price notional, not Hyperliquid's exact
  oracle-price settlement notional.
- Uses no-advice language and keeps the read descriptive.

## connected feature

[[funding-persistence-read]] now loads bounded public `fundingHistory` context
to show whether current funding looks isolated or persistent, with explicit
no-advice copy and no private `userFunding` history.
