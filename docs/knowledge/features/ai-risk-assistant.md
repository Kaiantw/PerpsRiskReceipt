# ai risk assistant

## status

Backlog.

## product idea

Add a plain-English assistant that answers questions about the loaded dashboard,
receipt, and live recheck. The assistant should explain terms and summarize risk
signals without giving strategy recommendations or financial advice.

## source links

- [[../sources/hyperliquid-live-risk-signals]]
- [[live-receipt-recheck]]
- [[funding-carry-watch]]
- [[mark-price-context]]

## guardrails

- Do not recommend trades, leverage, position changes, or order placement.
- Cite which snapshot field or source note supports an explanation.
- Say when a conclusion is heuristic or approximate.
- Prefer "what changed" and "what this metric means" over "what to do."
