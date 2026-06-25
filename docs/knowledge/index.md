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
- [[sources/perp-risk-review-checklist]] - liquidation, funding, leverage, and market-condition review framing.
- [[sources/perp-receipt-review-assistant]] - receipt-question source notes for hash scope, live recheck review, funding, liquidation, and guardrails.
- [[sources/portable-receipt-privacy]] - privacy framing for full receipt export, hash verification, offchain sharing, and minimal onchain metadata.
- [[sources/redacted-receipt-sharing]] - data-minimization and selective-disclosure source notes for redacted receipt sharing.

## implemented feature notes

- [[features/live-receipt-recheck]] - compare a saved local receipt against a fresh read-only Hyperliquid snapshot.
- [[features/ai-risk-assistant]] - local guarded chat assistant for explaining the loaded snapshot.
- [[features/funding-carry-watch]] - dashboard panel for net funding carry, burden, and top funding drivers.
- [[features/mark-price-context]] - receipt recheck panel for saved-vs-current mark, liquidation, funding, and open-interest context.
- [[features/liquidation-buffer-ladder]] - dashboard ladder for closest listed liquidation buffers.
- [[features/account-value-timeline]] - live dashboard account-value history, drawdown, and sampled PnL context.
- [[features/receipt-account-value-context]] - local receipt panel that positions the saved snapshot inside sampled account-value history.
- [[features/receipt-change-summary]] - single live-recheck summary combining position, market, funding, and account-history signals.
- [[features/receipt-risk-assistant]] - local receipt-page assistant that answers cited questions from the receipt summary and live recheck context.
- [[features/portable-receipt-bundle]] - explicit full-snapshot export/import flow for reviewing local live receipts across browsers.
- [[features/redacted-receipt-share]] - minimized receipt share that hides raw account and exact position values while preserving a hash reference and risk summary.

## connected backlog ideas

- [[features/receipt-risk-assistant]] could later use a guarded server-side LLM
  once citations, refusal policy, and private-data boundaries are stronger.
- [[features/redacted-receipt-share]] could later evolve from minimized JSON to
  cryptographic selective disclosure using EAS private data or Merkle proofs.
