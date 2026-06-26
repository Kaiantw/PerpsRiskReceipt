# receipt assistant recheck history

## status

Implemented for local Hyperliquid receipt pages after live recheck history has
saved at least one row.

## product idea

Repeated live rechecks are useful only if the reviewer can explain the trend.
The receipt assistant now answers local-history questions from compact saved
rows, so a reviewer can ask whether the current risk score, regime, repeated
focus market, watchlist counts, and volatility context changed across checks.

## source links

- [[../sources/perp-receipt-assistant-recheck-history]]
- [[receipt-recheck-history]]
- [[receipt-risk-assistant]]
- [[receipt-market-regime]]
- [[receipt-market-regime-drilldown]]
- [[receipt-recheck-watchlist]]

## implemented behavior

- Builds a pure local history summary from browser-local recheck rows.
- Labels the saved-row trend as no history, single check, risk higher, risk
  lower, or risk unchanged.
- Summarizes latest versus oldest risk score, regime movement, most repeated
  focus market, latest watchlist counts, and how many saved rows included
  loaded 24h volatility context.
- Adds a `Rechecks` assistant prompt when local history exists.
- Routes local-history questions separately from sampled account-value history.
- Shows the same trend headline and summary in the `Local recheck history`
  panel so the UI and assistant share one source of truth.

## related ideas

- [[receipt-recheck-history]] supplies the compact saved rows.
- [[receipt-risk-assistant]] supplies the deterministic cited answer and
  refusal boundaries.
- [[receipt-review-packet]] could later include this trend if reviewers want to
  export local recheck history into a communication artifact.
