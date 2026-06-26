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
- [[sources/perp-position-risk-drivers]] - position-level risk attribution notes for notional, liquidation, funding, and unrealized loss drivers.
- [[sources/perp-receipt-risk-driver-comparison]] - saved-vs-live risk-driver comparison notes for local receipt rechecks.
- [[sources/perp-receipt-assistant-driver-citations]] - source notes for assistant answers that cite receipt driver comparisons.
- [[sources/perp-receipt-assistant-market-driver-drilldowns]] - source notes for assistant answers about individual market driver rows.
- [[sources/perp-receipt-assistant-market-context-fusion]] - source notes for assistant answers that fuse market driver rows with mark, funding, liquidation-distance, and open-interest context.
- [[sources/perp-account-value-history]] - Hyperliquid portfolio history and drawdown context.
- [[sources/perp-risk-review-checklist]] - liquidation, funding, leverage, and market-condition review framing.
- [[sources/perp-receipt-review-assistant]] - receipt-question source notes for hash scope, live recheck review, funding, liquidation, and guardrails.
- [[sources/portable-receipt-privacy]] - privacy framing for full receipt export, hash verification, offchain sharing, and minimal onchain metadata.
- [[sources/redacted-receipt-sharing]] - data-minimization and selective-disclosure source notes for redacted receipt sharing.
- [[sources/redacted-market-context]] - market-only source notes for redacted share current context.
- [[sources/redacted-market-trend]] - candle and funding-history source notes for redacted share 24h public market trends.
- [[sources/redacted-market-watchlist]] - liquidation, funding, volatility, and review-cue source notes for redacted share watchlists.

## implemented feature notes

- [[features/live-receipt-recheck]] - compare a saved local receipt against a fresh read-only Hyperliquid snapshot.
- [[features/ai-risk-assistant]] - local guarded chat assistant for explaining the loaded snapshot.
- [[features/funding-carry-watch]] - dashboard panel for net funding carry, burden, and top funding drivers.
- [[features/position-risk-drivers]] - dashboard triage panel ranking position-level risk contributors.
- [[features/receipt-risk-driver-comparison]] - local receipt recheck panel comparing saved and current risk drivers.
- [[features/mark-price-context]] - receipt recheck panel for saved-vs-current mark, liquidation, funding, and open-interest context.
- [[features/liquidation-buffer-ladder]] - dashboard ladder for closest listed liquidation buffers.
- [[features/account-value-timeline]] - live dashboard account-value history, drawdown, and sampled PnL context.
- [[features/receipt-account-value-context]] - local receipt panel that positions the saved snapshot inside sampled account-value history.
- [[features/receipt-change-summary]] - single live-recheck summary combining position, market, funding, and account-history signals.
- [[features/receipt-risk-assistant]] - local receipt-page assistant that answers cited questions from the receipt summary and live recheck context.
- [[features/receipt-assistant-driver-citations]] - receipt assistant answers for saved-vs-current risk-driver questions.
- [[features/receipt-assistant-market-driver-drilldowns]] - named-market receipt assistant answers from per-market driver rows.
- [[features/receipt-assistant-market-context-fusion]] - named-market receipt assistant answers that merge driver rows with saved-vs-current market context.
- [[features/portable-receipt-bundle]] - explicit full-snapshot export/import flow for reviewing local live receipts across browsers.
- [[features/redacted-receipt-share]] - minimized receipt share that hides raw account and exact position values while preserving a hash reference and risk summary.
- [[features/redacted-market-context]] - current public Hyperliquid mark, funding, and open-interest context for redacted shares.
- [[features/redacted-market-trend]] - 24h public candle and funding-history context for redacted shares.
- [[features/redacted-market-watchlist]] - synthesized review cues over redacted fields plus loaded public market context.

## connected backlog ideas

- [[features/receipt-risk-assistant]] could later use a guarded server-side LLM
  once citations, refusal policy, and private-data boundaries are stronger.
- [[features/redacted-receipt-share]] could later evolve from minimized JSON to
  cryptographic selective disclosure using EAS private data or Merkle proofs.
- [[features/redacted-market-watchlist]] could later add configurable market-only
  thresholds without requiring a raw account address.
- [[features/receipt-assistant-driver-citations]] could later expand into
  side-by-side cited answers for each per-market driver row.
- [[features/receipt-assistant-market-context-fusion]] could later grow into a
  per-market recheck checklist with configurable thresholds.
