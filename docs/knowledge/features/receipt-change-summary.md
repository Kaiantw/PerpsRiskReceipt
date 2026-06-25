# receipt change summary

## status

Implemented for browser-local Hyperliquid receipt live rechecks.

## product idea

A reviewer should not have to inspect every receipt panel to understand the
important change. The receipt page should synthesize account match, position
state, liquidation buffer, risk score, funding, market movement, and sampled
account-value history into one short read.

## source links

- [[../sources/perp-risk-review-checklist]]
- [[live-receipt-recheck]]
- [[mark-price-context]]
- [[receipt-account-value-context]]
- [[funding-carry-watch]]
- [[liquidation-buffer-ladder]]

## implemented behavior

- Adds a pure receipt-change summary model that combines:
  - live snapshot comparison
  - market context since receipt
  - optional receipt account-value context
- Prioritizes account mismatch, position changes, liquidation watch, risk
  worsening/improvement, account-history watch, funding watch, market movement,
  and little-changed states.
- Shows the summary after `Recheck live account` and before detailed market and
  metric tables.
- Uses review-point language rather than trade recommendations.
- Includes tests for account mismatch, position changes, liquidation watch,
  risk worsening, account-history watch, funding watch, and little-changed
  cases.

## connected feature ideas

- [[receipt-risk-assistant]] cites this summary as its primary "what changed"
  source for local live receipt pages.
- [[account-value-timeline]] can eventually expose a stable summary window
  preference so receipt summaries can choose day/week context deliberately.
