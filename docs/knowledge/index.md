# knowledge graph

This folder tracks source-backed product ideas in an Obsidian-like format. Each
implemented or proposed feature should link back to the source notes that
informed it and forward to related feature ideas.

## source notes

- [[sources/hyperliquid-live-risk-signals]] - Hyperliquid docs on account summaries, mark price, funding, liquidations, and portfolio/account-value views.

## implemented feature notes

- [[features/live-receipt-recheck]] - compare a saved local receipt against a fresh read-only Hyperliquid snapshot.

## connected backlog ideas

- [[features/ai-risk-assistant]] - plain-English assistant that explains the dashboard, receipt, and live recheck without giving financial advice.
- [[features/funding-carry-watch]] - monitor whether funding cost or earned carry changed materially since receipt creation.
- [[features/mark-price-context]] - show why mark price matters more than last trade for liquidation and unrealized PnL context.
- [[features/account-value-timeline]] - compare receipt snapshots against account-value/PnL history when historical data is available.
