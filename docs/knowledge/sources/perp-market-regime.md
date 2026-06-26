# perp market regime

## sources checked

- Hyperliquid funding: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/funding
- MetaMask open interest in perps: https://metamask.io/news/open-interest-perps-explained
- Coinbase liquidation-risk guide: https://www.coinbase.com/learn/perpetual-futures/key-strategies-to-avoid-liquidations-in-perpetual-futures
- Dune Hyperliquid market data schema: https://docs.dune.com/data-catalog/community/hyperliquid/market-data
- CoinAPI historical data for perpetual futures: https://www.coinapi.io/blog/historical-data-for-perpetual-futures
- Fundamentals of Perpetual Futures: https://arxiv.org/html/2212.06888v5

## takeaways

- Funding is central to perp risk because it is a recurring peer-to-peer payment
  that keeps the contract price close to the underlying index, and on
  Hyperliquid it settles hourly.
- Hyperliquid funding settlement uses oracle-price notional, so app-level
  funding burden based on normalized mark-price notional remains an estimate.
- Open interest is useful as participation and liquidity context, but should not
  be treated as a standalone directional signal.
- Liquidation-buffer review should stay prominent during volatile sessions
  because additional buffer helps withstand price movement, but this app still
  only uses listed liquidation distances.
- Useful perp market context combines funding, open interest, volatility,
  liquidation proximity, and account drawdown rather than relying on a single
  metric.
- Academic perp research reinforces that funding links perp and spot prices, but
  no expiry means perps do not have the same guaranteed convergence mechanism as
  dated futures.

## product assumptions

- The market-regime read is a synthesis layer over already-loaded local receipt
  recheck objects: watchlist, market context, risk-driver comparison, optional
  volatility buffer, and optional sampled account-value context.
- It does not call new endpoints, change the receipt data model, or change the
  snapshot hash.
- Labels are descriptive review states, not forecasts or trade instructions.
- Account mismatch and changed-position states are not comparable to the saved
  receipt and must outrank ordinary regime labels.
- Funding burden uses current positive daily funding cost divided by current
  account value as bps/day. It is an app estimate, not Hyperliquid settlement
  accounting.
- Unloaded volatility context is an informational gap only. It should not make a
  calm receipt look active.

## linked feature ideas

- [[../features/receipt-market-regime]]
- [[../features/receipt-market-regime-drilldown]]
- [[../features/receipt-recheck-watchlist]]
- [[../features/receipt-volatility-watchlist]]
- [[../features/receipt-account-value-context]]
- [[../features/receipt-review-packet]]
