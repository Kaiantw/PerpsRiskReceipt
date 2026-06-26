# perp market regime drilldown

## sources checked

- Hyperliquid liquidations: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/liquidations
- Hyperliquid funding: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/funding
- CME open interest: https://www.cmegroup.com/education/courses/introduction-to-futures/open-interest
- CoinAPI historical data for perpetual futures: https://www.coinapi.io/blog/historical-data-for-perpetual-futures
- MetaMask perpetual futures liquidation mechanics: https://metamask.io/news/perpetual-futures-liquidation-mechanics

## takeaways

- Hyperliquid liquidation review should stay mark-price aware because
  liquidations use mark price, and listed liquidation prices can still differ
  from actual liquidation behavior as funding, cross-margin PnL, and liquidity
  change.
- Hyperliquid funding is paid hourly, while the formula is expressed as an
  8-hour rate and settlement uses oracle-price notional. App funding burden
  should therefore be labeled as an estimate.
- Open interest is useful market participation context, especially when it moves
  materially, but it should not be treated as a standalone direction signal.
- Perp market review is richer when price/OHLCV, funding, open interest,
  liquidation context, and basis/volatility-style context are reviewed together
  instead of one metric at a time.
- Perp liquidation education consistently frames margin, leverage, funding, and
  mark-price mechanics as linked risk factors.

## product assumptions

- The per-market regime drilldown is a row-level explanation layer under the
  account-level market-regime label.
- It uses only already-loaded local receipt recheck objects: market context,
  risk-driver comparison, recheck watchlist, optional volatility buffer, and
  snapshot comparison metrics.
- It does not call new endpoints, change the receipt model, change the risk
  model, save state, or alter the snapshot hash.
- Per-market severity is review priority only. It is not an exchange alert,
  protocol-official risk label, liquidation proof, or trading recommendation.
- Current positive funding burden is estimated as current daily funding cost
  divided by current account value in bps/day.
- Account mismatch makes all market rows critical because the current snapshot
  should not be read as the same account.
- Position-state changes make a row historical instead of directly comparable
  as the same risk object.
- Open-interest deltas are participation context only.

## linked feature ideas

- [[../features/receipt-market-regime-drilldown]]
- [[../features/receipt-market-regime]]
- [[../features/receipt-recheck-watchlist]]
- [[../features/receipt-volatility-buffer]]
- [[../features/receipt-review-packet]]
