# perp receipt risk-driver comparison

## sources checked

- Hyperliquid liquidations: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/liquidations
- Hyperliquid funding: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/funding
- Hyperliquid robust price indices: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/robust-price-indices
- Coinbase liquidation strategies: https://www.coinbase.com/learn/perpetual-futures/key-strategies-to-avoid-liquidations-in-perpetual-futures
- Investopedia perpetual futures guide: https://www.investopedia.com/what-are-perpetual-futures-7494870
- MetaMask leverage and margin guide: https://metamask.io/news/leverage-margin-perpetual-futures-trading

## takeaways

- A receipt is a historical snapshot, but a live recheck can show whether the
  same account's visible risk drivers still tell the same story.
- The most useful current-market comparison is not only current mark price. It
  is whether the top risk contributor changed, whether listed liquidation
  buffer got tighter or wider, whether gross exposure changed, and whether
  positive funding burden moved.
- Position-state changes should take priority because a resized, side-changed,
  closed, or new position is no longer the same risk object as the receipt row.
- The comparison should reuse the same heuristic driver score as the dashboard
  so the receipt page stays explainable and testable.

## review contract

- Account mismatch and position-state changes take priority.
- Material driver-score movement uses a 10-point threshold.
- Material listed-buffer movement uses 500 bps.
- Material daily funding movement uses 1 USD/day.
- The output is descriptive review context only; it is not an exact liquidation
  monitor or a recommendation to change a trade.

## linked feature ideas

- [[../features/receipt-risk-driver-comparison]]
- [[../features/position-risk-drivers]]
- [[../features/live-receipt-recheck]]
- [[../features/receipt-change-summary]]
