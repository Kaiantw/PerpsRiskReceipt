# receipt assistant watchlist citations

## status

Implemented for browser-local Hyperliquid receipt live rechecks.

## product idea

The `Recheck watchlist` already ranks what deserves attention first. The
receipt assistant should answer inspect-first questions from that ranked list
instead of forcing a reviewer to scan every panel manually.

## source links

- [[../sources/perp-receipt-assistant-watchlist-citations]]
- [[receipt-recheck-watchlist]]
- [[receipt-volatility-watchlist]]
- [[receipt-market-regime]]
- [[receipt-risk-assistant]]
- [[receipt-assistant-market-context-fusion]]

## implemented behavior

- Adds `recheckWatchlist` to the deterministic receipt assistant context.
- Adds a `Watchlist` quick prompt when a watchlist is loaded.
- Routes inspect-first, priority, attention, urgent, and watchlist questions to
  the ranked watchlist answer.
- Answers with high/watch/info counts and the top three watchlist items.
- Cites `receipt_recheck_watchlist` headline, summary, counts, item severity,
  item detail, and item review points.
- Includes volatility-buffer cues in those answers once public 24h volatility
  has been loaded and added to the watchlist.
- The same assistant context now also supports a `Regime` prompt from
  `receipt_market_regime` fields.
- Keeps trade-intent refusal ahead of watchlist routing.

## related ideas

- [[receipt-recheck-watchlist]] remains the source of ranked review cues.
- [[receipt-review-packet]] embeds the same inspect-first assistant answer into a
  copyable markdown artifact.
- [[receipt-assistant-market-context-fusion]] handles named-market follow-up
  questions after the watchlist identifies a market.
- [[receipt-volatility-watchlist]] adds public volatility-versus-buffer cues to
  the same inspect-first answer path.
- [[receipt-market-regime]] answers broader current-environment questions using
  the watchlist, volatility, funding, and sampled account-value context.
- [[redacted-market-watchlist]] could later get a redacted-share assistant that
  uses the same inspect-first pattern without exposing hidden fields.
