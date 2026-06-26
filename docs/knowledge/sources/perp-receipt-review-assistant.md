# perp receipt review assistant

## sources checked

- Hyperliquid liquidations: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/liquidations
- Hyperliquid margining: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/margining
- Hyperliquid funding: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/funding
- Hyperliquid info endpoint: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint
- Coinbase liquidation-risk guide: https://www.coinbase.com/learn/perpetual-futures/key-strategies-to-avoid-liquidations-in-perpetual-futures
- Kraken perpetual futures guide: https://www.kraken.com/learn/trading/perpetual-futures-contracts
- MetaMask leverage and margin guide: https://metamask.io/news/leverage-margin-perpetual-futures-trading

## takeaways

- Receipt questions should separate historical proof from current risk: a hash
  proves snapshot integrity, while a live recheck describes the current account.
- Useful receipt answers should cite visible local sections: receipt change
  summary, market context, account-value context, funding delta, snapshot hash,
  and live recheck metrics.
- Perps require active monitoring because leverage magnifies adverse price moves,
  funding can change holding cost, and margin/liquidation behavior depends on
  mark price, maintenance margin, margin mode, and account equity.
- The assistant should explain what to review without telling a user to open,
  close, increase, reduce, or otherwise change a position.
- Driver-specific answers should cite the receipt risk-driver comparison when
  the question is about top risk, exposure, driver score, listed buffer, or
  funding burden.

## linked feature ideas

- [[../features/receipt-risk-assistant]]
- [[../features/receipt-assistant-driver-citations]]
- [[../features/receipt-change-summary]]
- [[../features/live-receipt-recheck]]
- [[../features/receipt-account-value-context]]
- [[../features/mark-price-context]]
