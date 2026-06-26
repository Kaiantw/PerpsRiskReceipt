# receipt assistant market-context fusion

## status

Implemented for browser-local Hyperliquid receipt live rechecks.

## product idea

When a receipt reviewer asks "why is ETH-PERP the driver?", the answer should
not stop at an abstract driver score. It should connect that score to the
current-market evidence on the receipt page: mark move, listed liquidation
distance, funding movement, daily funding, and open-interest movement.

## source links

- [[../sources/perp-receipt-assistant-market-context-fusion]]
- [[receipt-assistant-market-driver-drilldowns]]
- [[mark-price-context]]
- [[receipt-risk-driver-comparison]]
- [[receipt-risk-assistant]]

## implemented behavior

- Matches the named `receipt_risk_driver_comparison.market_changes` row to the
  same market inside `market_context.positions`.
- Adds a market-context row to named-market assistant answers when available.
- Shows mark move, listed liquidation-distance move, 8-hour funding move, daily
  funding move, and open-interest move.
- Cites both `receipt_risk_driver_comparison.market_changes.*` and
  `market_context.positions.*` fields.
- Falls back to a plain "no market-context row loaded" sentence when the driver
  row exists but the market-context row is unavailable.
- Keeps the answer descriptive and refuses trade-intent questions before this
  routing runs.

## related ideas

- [[receipt-assistant-market-driver-drilldowns]] supplies the driver-row half of
  this answer.
- [[mark-price-context]] supplies the saved-vs-current market row.
- [[redacted-market-watchlist]] applies a similar "turn context into review
  cues" idea for redacted shares without a raw account address.
- [[receipt-recheck-watchlist]] applies that review-cue idea to full local
  receipts after live recheck.
