# funding carry watch

## status

Implemented in this slice.

## product idea

Show the account's expected funding cost or earned carry as a first-class risk
signal. This is useful for traders who hold positions across funding intervals
or share a receipt before leaving a position open.

## source links

- [[../sources/hyperliquid-live-risk-signals]]
- [[../sources/perp-funding-mechanics]]
- [[../sources/perp-position-risk-drivers]]
- [[position-risk-drivers]]
- [[live-receipt-recheck]]
- [[ai-risk-assistant]]

## implemented behavior

- Shows net daily funding.
- Shows 30-day estimate.
- Shows daily funding as bps of account value.
- Shows largest funding cost and largest funding earn positions.
- Lists per-position notional, 8-hour user-perspective funding, daily funding,
  and 30-day funding.
- Keep the copy descriptive: "funding cost increased" instead of "close this
  position."

## next connected feature

[[position-risk-drivers]] now shows positive funding burden as one component in
the account-level driver ranking. Live receipt recheck already compares funding
delta, so a future version can show whether carrying the same position became
materially more expensive or more favorable since the snapshot was saved.
