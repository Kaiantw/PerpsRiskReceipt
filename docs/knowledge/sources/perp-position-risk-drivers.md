# perp position risk drivers

## sources checked

- Hyperliquid liquidations: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/liquidations
- Hyperliquid funding: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/funding
- Hyperliquid robust price indices: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/robust-price-indices
- Coinbase liquidation strategies: https://www.coinbase.com/learn/perpetual-futures/key-strategies-to-avoid-liquidations-in-perpetual-futures
- Investopedia perpetual futures guide: https://www.investopedia.com/what-are-perpetual-futures-7494870
- MetaMask leverage and margin guide: https://metamask.io/news/leverage-margin-perpetual-futures-trading

## takeaways

- Liquidation risk is account-equity versus maintenance-margin risk, not just a
  single position price. A dashboard should still make the closest listed
  liquidation buffers easy to inspect.
- Mark price matters because Hyperliquid uses mark price for margining,
  liquidations, TP/SL triggers, and unrealized PnL.
- Leverage turns notional exposure into amplified account risk. Gross notional
  versus account value and largest-position share are useful risk-driver
  summaries.
- Funding is recurring and can drain or add to account balance over time. The
  driver view should count positive user-perspective funding as cost pressure
  and keep earned funding descriptive.
- Unrealized loss matters because it is already consuming account equity in the
  snapshot. It should be visible as a driver without implying a future trade.

## score contract

- Listed liquidation buffer: up to 45 points.
- Notional exposure and concentration: up to 25 points.
- Positive daily funding burden: up to 20 points.
- Unrealized loss burden: up to 10 points.

This is a triage score, not an exchange formula.

## linked feature ideas

- [[../features/position-risk-drivers]]
- [[../features/liquidation-buffer-ladder]]
- [[../features/funding-carry-watch]]
- [[../features/account-value-timeline]]
