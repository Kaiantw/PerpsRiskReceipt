# receipt market regime drilldown

## status

Implemented for browser-local Hyperliquid receipt live rechecks.

## product idea

An account-level `Market regime` label is useful only if the reviewer can see
which market rows caused it. The `Regime by market` table groups each market's
current listed buffer, funding burden, mark movement, open-interest movement,
volatility-buffer status, and ranked watchlist cues into one row.

## source links

- [[../sources/perp-market-regime-drilldown]]
- [[../sources/perp-market-regime]]
- [[receipt-market-regime]]
- [[receipt-recheck-watchlist]]
- [[receipt-volatility-buffer]]
- [[receipt-review-packet]]
- [[receipt-assistant-watchlist-citations]]
- [[receipt-assistant-market-context-fusion]]

## implemented behavior

- Adds a pure `receipt_market_regime_drilldown` model for local receipt live
  rechecks.
- Builds per-market rows from already-loaded market context, risk-driver
  comparison, recheck watchlist, optional volatility buffer, and snapshot
  comparison data.
- Ranks rows by critical/high/watch/info severity, then watchlist cue counts,
  current driver score, and market name.
- Shows current listed buffer, positive funding burden in bps/day, mark move,
  volatility range-to-buffer status, open-interest delta, and watch cue counts.
- Adds a `Regime rows` receipt assistant prompt that cites
  `receipt_market_regime_drilldown` fields.
- Adds a `## regime by market` section to copied review packets.
- Does not call new endpoints, change the receipt hash, or make a trade
  recommendation.

## related ideas

- [[receipt-market-regime]] stays the account-level current-environment summary.
- [[receipt-recheck-watchlist]] remains the ranked inspect-first cue list.
- [[receipt-volatility-buffer]] supplies public 24h range and ATR-style context
  once loaded.
- [[receipt-review-packet]] carries the per-market rows into copyable markdown.
- [[receipt-risk-assistant]] explains the same rows through cited local answers.
