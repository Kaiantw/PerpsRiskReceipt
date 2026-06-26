# receipt assistant market-driver drilldowns

## status

Implemented for browser-local Hyperliquid receipt live rechecks.

## product idea

A trader or reviewer often does not only ask "what changed overall?" They ask
"why this market?" after the receipt identifies a current top driver. The
assistant should answer that question from the per-market driver row, including
score components, position-state changes, and deltas.

## source links

- [[../sources/perp-receipt-assistant-market-driver-drilldowns]]
- [[receipt-assistant-driver-citations]]
- [[receipt-risk-driver-comparison]]
- [[receipt-risk-assistant]]

## implemented behavior

- Detects market names such as `ETH-PERP` and base coins such as `ETH` in
  receipt assistant questions.
- Answers named-market questions from `receipt_risk_driver_comparison.market_changes`.
- Shows saved and current driver rows with score, label, primary factor,
  component scores, notional, listed buffer, and daily funding.
- Calls out whether the row is directly comparable or the position state changed.
- Adds a `Top market` quick prompt when the live recheck has a current top
  driver market.
- Keeps trade-intent refusal ahead of market-specific routing.

## related ideas

- [[receipt-risk-driver-comparison]] remains the source of per-market rows.
- [[receipt-assistant-driver-citations]] remains the aggregate driver answer.
- [[mark-price-context]] can later provide richer market movement detail for the
  same named-market questions.
