# ai risk assistant

## status

Implemented as a dependency-free local assistant in this slice.

## product idea

Add a plain-English assistant that answers questions about the loaded dashboard
snapshot. The assistant explains terms and summarizes risk signals without
giving strategy recommendations or financial advice.

## source links

- [[../sources/hyperliquid-live-risk-signals]]
- [[../sources/financial-risk-guardrails]]
- [[live-receipt-recheck]]
- [[funding-carry-watch]]
- [[mark-price-context]]

## implemented behavior

- Opens with a summary of the selected snapshot.
- Quick prompts cover summary, liquidation, funding, and freshness.
- Free-form questions are routed through deterministic local logic.
- Trade-intent questions are refused while still explaining current risk signals.
- Responses include snapshot-field citations.

## guardrails

- Do not recommend trades, leverage, position changes, or order placement.
- Cite which snapshot field or source note supports an explanation.
- Say when a conclusion is heuristic or approximate.
- Prefer "what changed" and "what this metric means" over "what to do."
