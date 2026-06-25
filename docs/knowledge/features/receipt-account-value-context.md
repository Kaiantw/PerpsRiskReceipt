# receipt account-value context

## status

Implemented for browser-local Hyperliquid receipt pages.

## product idea

A saved receipt is more useful when the viewer can see where it sat in sampled
account history. The receipt page should answer whether the snapshot happened
near a sampled account-value high, during a drawdown, or before a material move
in latest sampled account value.

## source links

- [[../sources/perp-account-value-history]]
- [[account-value-timeline]]
- [[live-receipt-recheck]]

## implemented behavior

- Calls the existing read-only Hyperliquid `portfolio` info route from local
  Hyperliquid receipt pages.
- Reuses sampled account-value timelines and chooses the preferred perp history
  window when available.
- Finds the nearest sampled account-value point to the receipt data timestamp.
- Shows receipt value, nearest sample, sample gap, latest sampled value, latest
  versus receipt value, receipt drawdown, current drawdown, max drawdown, and
  sampled point count.
- Labels the context as no history, sample gap, near peak, in drawdown, latest
  higher, latest lower, or little changed.
- States that the context is sampled history, not complete accounting,
  causality analysis, or financial advice.

## connected feature ideas

- [[live-receipt-recheck]] can combine this with the current snapshot recheck so
  the viewer sees both account-history drift and live market drift.
- [[mark-price-context]] explains per-position market changes while this feature
  explains account-value changes.
