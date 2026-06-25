# liquidation buffer ladder

## status

Implemented in this slice.

## product idea

Give the trader an immediate ranked view of which open position has the least
listed liquidation buffer. This is valuable because the dashboard already shows
account-level minimum liquidation distance, but a trader needs the per-position
ladder to know where to inspect first.

## source links

- [[../sources/perp-liquidation-buffer]]
- [[../sources/perp-position-risk-drivers]]
- [[../sources/perp-market-context]]
- [[position-risk-drivers]]
- [[mark-price-context]]
- [[live-receipt-recheck]]

## implemented behavior

- Adds `Liquidation buffer ladder` to the dashboard.
- Sorts open positions from closest listed liquidation buffer to widest buffer.
- Shows listed liquidation price, mark price, adverse move percent, adverse move
  dollars, and approximate PnL distance to listed liquidation.
- Keeps missing liquidation prices visible as unavailable instead of hiding
  them.
- Labels buffers as through liquidation, thin, tight, moderate, wide, or
  unavailable.
- Explains that cross margin, funding, and other open-position PnL can change
  actual liquidation behavior.

## next connected feature

[[position-risk-drivers]] now summarizes listed-buffer pressure alongside
notional, funding, and unrealized-loss drivers. [[account-value-timeline]] can
show whether the tightest buffer is paired with recent account drawdown.
