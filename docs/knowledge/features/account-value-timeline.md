# account value timeline

## status

Implemented for live Hyperliquid lookups and reused by local receipt pages.

## product idea

Use historical account value or PnL context to show how the receipt fits into a
larger account story: before/after account value, recent drawdown, and whether
the current risk state is unusual for the account.

## source links

- [[../sources/hyperliquid-live-risk-signals]]
- [[../sources/perp-account-value-history]]
- [[../sources/perp-position-risk-drivers]]
- [[position-risk-drivers]]
- [[live-receipt-recheck]]

## implemented behavior

- Calls the read-only Hyperliquid `portfolio` info request after a live address
  lookup succeeds.
- Maps account-value history and PnL history into tested timeline windows.
- Prefers perp-specific windows such as `perpDay`, `perpWeek`, `perpMonth`, and
  `perpAllTime` when Hyperliquid returns them.
- Displays latest account value, period change, current drawdown, max drawdown,
  sampled point count, volume, a sparkline, and recent sampled rows.
- Labels the timeline as higher, lower, flat, single point, no history, or
  drawdown watch.
- States that the history is sampled context and not complete accounting or
  financial advice.
- Local receipt pages reuse the same portfolio history to show where the saved
  receipt sat inside sampled account-value history.

## next connected feature

[[receipt-account-value-context]] now handles receipt-page account-history
context. [[position-risk-drivers]] shows which current positions explain the
loaded account risk, while this timeline shows whether account equity has
recently improved or drawn down around that state.
