# knowledge graph

This folder tracks source-backed product ideas in an Obsidian-like format. Each
implemented or proposed feature should link back to the source notes that
informed it and forward to related feature ideas.

## source notes

- [[sources/hyperliquid-live-risk-signals]] - Hyperliquid docs on account summaries, mark price, funding, liquidations, and portfolio/account-value views.
- [[sources/financial-risk-guardrails]] - SEC/FINRA investor-risk references used to shape assistant refusal and education copy.
- [[sources/perp-funding-mechanics]] - funding-rate mechanics and holding-cost assumptions.
- [[sources/perp-market-context]] - mark price and open-interest context for current-market receipt checks.
- [[sources/perp-liquidation-buffer]] - Hyperliquid liquidation, margining, and listed-buffer assumptions.
- [[sources/perp-account-value-history]] - Hyperliquid portfolio history and drawdown context.

## implemented feature notes

- [[features/live-receipt-recheck]] - compare a saved local receipt against a fresh read-only Hyperliquid snapshot.
- [[features/ai-risk-assistant]] - local guarded chat assistant for explaining the loaded snapshot.
- [[features/funding-carry-watch]] - dashboard panel for net funding carry, burden, and top funding drivers.
- [[features/mark-price-context]] - receipt recheck panel for saved-vs-current mark, liquidation, funding, and open-interest context.
- [[features/liquidation-buffer-ladder]] - dashboard ladder for closest listed liquidation buffers.
- [[features/account-value-timeline]] - live dashboard account-value history, drawdown, and sampled PnL context.

## connected backlog ideas

- [[features/live-receipt-recheck]] can show account-value history on local live receipt pages, not only on the dashboard.
