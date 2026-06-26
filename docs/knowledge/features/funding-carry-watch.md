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
- [[../sources/perp-funding-window]]
- [[../sources/perp-funding-persistence]]
- [[../sources/perp-position-risk-drivers]]
- [[funding-window-read]]
- [[funding-persistence-read]]
- [[position-risk-drivers]]
- [[live-receipt-recheck]]
- [[ai-risk-assistant]]

## implemented behavior

- Shows estimated next hourly funding.
- Shows 8-hour rate-basis funding.
- Shows net daily funding.
- Shows 30-day estimate.
- Shows next hourly funding as bps of account value.
- Shows largest funding cost and largest funding earn positions.
- Lists per-position notional, 8-hour user-perspective funding, next hourly
  funding, 8-hour rate-basis funding, daily funding, and 30-day funding.
- Keep the copy descriptive: "funding cost increased" instead of "close this
  position."

## next connected feature

[[funding-window-read]] now carries the near-term funding estimate into live
receipt rechecks, receipt assistant answers, and review packets. A future
version can build on [[funding-persistence-read]] to combine funding history
with broader current-market reads.
