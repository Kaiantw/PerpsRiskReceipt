# receipt risk-driver comparison

## status

Implemented for browser-local Hyperliquid receipt live rechecks.

## product idea

A receipt reviewer should not have to compare the dashboard's risk-driver
thinking by hand. After a live recheck, the receipt should show whether the
saved top driver is still the current top driver, whether its score moved
materially, and which markets deserve inspection first.

## source links

- [[../sources/perp-receipt-risk-driver-comparison]]
- [[../sources/perp-position-risk-drivers]]
- [[../sources/perp-risk-review-checklist]]
- [[position-risk-drivers]]
- [[live-receipt-recheck]]
- [[receipt-change-summary]]

## implemented behavior

- Adds `Risk drivers since receipt` after `Receipt change summary` on local
  live receipt rechecks.
- Reuses `buildPositionRiskDrivers` for both the saved snapshot and fresh live
  snapshot.
- Shows saved top driver, current top driver, top score delta, gross exposure
  delta, largest-position-share delta, closest listed-buffer delta, net
  directional notional delta, and daily funding delta.
- Labels account mismatch, position changes, driver worsened, driver improved,
  driver changed, and little-changed states.
- Lists review points and a per-market table with position state, primary
  factor, driver score, listed buffer, daily funding, and plain-English read.
- Includes tests for no-live, tighter/wider buffer, position change, account
  mismatch, and top-driver handoff cases.

## related ideas

- [[receipt-risk-assistant]] could cite this panel directly in a later slice.
- [[receipt-change-summary]] remains the highest-level verdict.
- [[mark-price-context]] remains the detailed mark/funding/open-interest table.
