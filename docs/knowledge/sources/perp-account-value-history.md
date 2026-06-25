# perp account value history

## sources checked

- Hyperliquid info endpoint: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint
- Hyperliquid portfolio graphs: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/portfolio-graphs
- Investopedia maximum drawdown: https://www.investopedia.com/terms/m/maximum-drawdown-mdd.asp

## takeaways

- Hyperliquid exposes a read-only `portfolio` info request for a user address.
  The response includes sampled account value history, PnL history, and volume
  windows.
- The account-value history is useful context for a risk receipt because it
  shows whether the current snapshot is near the account's recent high-water
  mark or in drawdown.
- Maximum drawdown is a peak-to-trough measure. It highlights downside path risk
  but does not explain loss frequency, recovery time, or causality.
- The product should label portfolio history as sampled context, not complete
  accounting, tax data, or strategy advice.

## linked feature ideas

- [[../features/account-value-timeline]]
- [[../features/live-receipt-recheck]]
- [[../features/mark-price-context]]
- [[../features/liquidation-buffer-ladder]]
