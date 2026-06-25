# funding carry watch

## status

Backlog.

## product idea

Show whether the account's expected funding cost or earned carry changed since
receipt creation. This is useful for traders who save a receipt before holding a
position overnight or sharing a risk state.

## source links

- [[../sources/hyperliquid-live-risk-signals]]
- [[live-receipt-recheck]]

## possible feature shape

- Show saved vs current daily funding.
- Show saved vs current 30-day estimate.
- Flag a material change when funding cost increases by a chosen percentage of
  account value.
- Keep the copy descriptive: "funding cost increased" instead of "close this
  position."
