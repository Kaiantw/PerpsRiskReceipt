# position risk drivers

## status

Implemented on the dashboard.

## product idea

The account risk score is useful, but traders also need to know why the score
looks the way it does. Position risk drivers rank each open position by the
visible factors that usually deserve inspection first: listed liquidation
buffer, notional concentration, positive funding cost, and unrealized loss.

## source links

- [[../sources/perp-position-risk-drivers]]
- [[../sources/perp-liquidation-buffer]]
- [[../sources/perp-funding-mechanics]]
- [[liquidation-buffer-ladder]]
- [[funding-carry-watch]]
- [[account-value-timeline]]
- docs/source-notes.md#hyperliquid

## implemented behavior

- Adds `Position risk drivers` to the dashboard.
- Shows top driver, gross exposure versus account value, largest position share,
  directional bias, and net directional notional.
- Ranks positions by a transparent component score:
  - listed liquidation buffer up to 45 points
  - notional exposure/concentration up to 25 points
  - positive daily funding burden up to 20 points
  - unrealized loss burden up to 10 points
- Shows top driver cards and a full table with each component score.
- Separately identifies top notional, top listed-liquidation, top funding-cost,
  and top unrealized-loss positions in the pure data model.
- Handles no-position and zero-account-value cases without infinite metrics.
- Keeps copy descriptive and explicitly avoids trade recommendations.

## related ideas

- [[liquidation-buffer-ladder]] remains the detailed listed-buffer view.
- [[funding-carry-watch]] remains the detailed funding carry view.
- [[account-value-timeline]] shows whether account equity has recently changed
  around the current risk-driver state.
- [[receipt-risk-driver-comparison]] reuses this driver model on local receipt
  pages after a live recheck.
