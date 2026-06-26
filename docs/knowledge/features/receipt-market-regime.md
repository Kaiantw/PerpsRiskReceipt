# receipt market regime

## status

Implemented for browser-local Hyperliquid receipt live rechecks.

## product idea

A trader does not only need individual receipt rows; they need a compact read of
the current environment around the receipt. The `Market regime` panel combines
watchlist severity, current listed liquidation buffer, loaded public volatility
context, funding burden, sampled account drawdown, open-interest movement, and
mark movement into one reviewer-facing headline.

## source links

- [[../sources/perp-market-regime]]
- [[../sources/perp-market-regime-drilldown]]
- [[receipt-market-regime-drilldown]]
- [[../sources/perp-volatility-watchlist]]
- [[receipt-volatility-watchlist]]
- [[receipt-recheck-watchlist]]
- [[receipt-volatility-buffer]]
- [[receipt-account-value-context]]
- [[receipt-assistant-watchlist-citations]]
- [[receipt-review-packet]]

## implemented behavior

- Adds a pure `receipt_market_regime` model for local receipt live rechecks.
- Labels current context as `calm`, `active`, `stretched`, `stress`, or
  `not_comparable`.
- Keeps changed accounts or changed position states above ordinary regime reads.
- Uses existing saved/current recheck data, not a new endpoint.
- Adds a `Market regime` panel near the top of the live recheck.
- Adds a `Regime` receipt assistant prompt with citations to
  `receipt_market_regime` fields.
- Adds market-regime context to copied review packets.
- Adds a linked `Regime by market` drilldown so reviewers can see which market
  rows explain the account-level label.
- Treats unloaded 24h volatility as an informational context gap, not as a risk
  escalation.

## related ideas

- [[receipt-recheck-watchlist]] remains the ranked inspect-first cue list.
- [[receipt-market-regime-drilldown]] explains the regime label by market.
- [[receipt-volatility-watchlist]] adds public volatility-versus-buffer cues
  after history is loaded.
- [[receipt-account-value-context]] supplies sampled drawdown context when
  portfolio history is available.
- [[receipt-review-packet]] carries the regime read into copyable markdown.
- [[receipt-risk-assistant]] explains the same regime read through cited local
  assistant answers.
