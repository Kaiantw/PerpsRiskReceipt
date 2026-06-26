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

- [[receipt-assistant-driver-citations]] lets [[receipt-risk-assistant]] cite
  this panel directly.
- [[receipt-assistant-market-driver-drilldowns]] lets the assistant explain a
  specific per-market row from this panel.
- [[receipt-change-summary]] remains the highest-level verdict.
- [[mark-price-context]] remains the detailed mark/funding/open-interest table.
- [[receipt-recheck-watchlist]] ranks the highest-attention cues from this panel
  and the market-context table.
