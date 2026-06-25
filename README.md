# Perp Risk Receipt

Perp Risk Receipt is a read-only risk dashboard for perpetual positions. It normalizes account snapshots, explains liquidation and funding exposure, runs simple price scenarios, and creates a verifiable receipt with a canonical snapshot hash.

The project is built as a one-day, fixture-first portfolio demo for serious onchain financial UX. It does not trade, place orders, ask for private keys, or claim that its risk score is official protocol risk.

## What The Demo Shows

- Three fixture accounts: safe ETH long, near-liquidation BTC short, and a mixed multi-position book.
- Account-level risk metrics: account value, margin used, margin usage, total notional, minimum liquidation distance, daily funding, 30-day funding, risk score, source, freshness, and data timestamp.
- Live account value history for Hyperliquid lookups with sampled PnL, period change, and drawdown context.
- Position-level risk notes for liquidation distance and funding direction.
- Position risk drivers that rank positions by listed liquidation buffer, notional exposure, positive funding burden, and unrealized loss.
- Liquidation buffer ladder ranking positions by closest listed liquidation buffer.
- Funding carry watch for net daily funding, 30-day estimate, funding burden, and largest cost/earn drivers.
- Six scenario moves: `-10%`, `-5%`, `-2%`, `+2%`, `+5%`, and `+10%`.
- Deterministic fixture receipt pages with snapshot hash verification.
- Browser-local receipt pages for live Hyperliquid lookups.
- Portable receipt bundle export/import for reviewing browser-local live receipts across browsers, with redacted share mode for minimized public review.
- Market-only current context for redacted shares using public Hyperliquid mark, funding, and open-interest data.
- 24h market trend context for redacted shares using public Hyperliquid candles and funding history.
- Review watchlist for redacted shares that synthesizes disclosed buffers, current funding, adverse 24h trend, public range, and missing market data into high/watch/info cues.
- Live receipt recheck that compares a saved receipt against a fresh read-only Hyperliquid snapshot.
- Receipt change summary that combines live recheck, market context, funding movement, position changes, and sampled account-value context into one quick read.
- Receipt risk-driver comparison that shows whether the saved top driver, driver score, gross exposure, listed buffer, and funding burden changed after live recheck.
- Receipt risk assistant that answers cited questions about a saved live receipt after recheck.
- Receipt account-value context that shows whether a saved live receipt was near a sampled account peak, in drawdown, or materially different from latest sampled account value.
- Market context since receipt: saved-vs-current mark price, liquidation direction, funding change, and open-interest change for live rechecks.
- Guarded local risk assistant chat that explains the loaded snapshot and refuses trade recommendations.
- Read-only Hyperliquid address lookup through `POST /info`.
- EAS Sepolia fallback payload and manual attestation steps.

## Architecture

- `src/app/page.tsx` loads fixture snapshots and deterministic fixture receipt routes.
- `src/app/dashboard-client.tsx` renders the dashboard, address lookup states, position table, scenario simulator, and fixture receipt link.
- `src/app/account-value-history-panel.tsx` renders live Hyperliquid account-value history and drawdown context.
- `src/app/funding-carry-watch-panel.tsx` renders the dashboard funding carry panel.
- `src/app/risk-assistant-panel.tsx` renders the local assistant chat for the selected snapshot.
- `src/app/api/hyperliquid/snapshot/route.ts` validates addresses and calls the read-only Hyperliquid snapshot adapter.
- `src/app/api/hyperliquid/portfolio/route.ts` validates addresses and calls the read-only Hyperliquid portfolio-history adapter.
- `src/app/api/hyperliquid/markets/route.ts` fetches read-only market context for disclosed redacted-share markets without a user address.
- `src/app/api/hyperliquid/market-history/route.ts` fetches read-only 24h candle and funding history for disclosed redacted-share markets without a user address.
- `src/app/receipt/[id]/page.tsx` renders deterministic fixture receipts, recomputes the snapshot hash, and shows the EAS fallback payload.
- `src/app/receipt/import/page.tsx` inspects portable receipt bundles, previews redacted shares, imports full bundles, recomputes full-bundle hashes, and stores verified full receipts locally.
- `src/app/receipt/local/[id]/page.tsx` renders browser-local live receipts created from pasted Hyperliquid addresses and supports live rechecks.
- `src/app/receipt/local/[id]/portable-receipt-panel.tsx` exports redacted-share or full-snapshot portable JSON bundles for local live receipts.
- `src/app/receipt/local/[id]/receipt-account-value-context-panel.tsx` renders sampled account-value context for local live receipts.
- `src/app/receipt/local/[id]/receipt-risk-assistant-panel.tsx` renders the local assistant chat for a rechecked receipt.
- `src/lib/receipts/receipt-change-summary.ts` synthesizes live recheck, market context, and account-value context into a compact receipt summary.
- `src/lib/receipts/receipt-risk-driver-comparison.ts` compares saved and current position risk drivers after local live receipt recheck.
- `src/lib/perps/types.ts` defines the normalized snapshot, position, scenario, and receipt models.
- `src/lib/perps/fixtures.ts` contains the demo account snapshots.
- `src/lib/risk/risk-engine.ts` contains pure risk math.
- `src/lib/risk/position-risk-drivers.ts` derives transparent position-level risk-driver scores.
- `src/lib/history/account-value-timeline.ts` derives account-value change and drawdown timelines.
- `src/lib/history/receipt-account-value-context.ts` positions a receipt inside sampled account-value history.
- `src/lib/liquidation/liquidation-buffer.ts` derives the dashboard liquidation buffer ladder.
- `src/lib/funding/funding-watch.ts` derives funding carry labels, burden, and top funding drivers.
- `src/lib/market/market-context.ts` derives plain-English saved-vs-current market context for receipt rechecks.
- `src/lib/market/redacted-market-context.ts` derives current public market context for redacted receipt shares.
- `src/lib/market/redacted-market-trend.ts` derives 24h public price/funding trend context for redacted receipt shares.
- `src/lib/market/redacted-market-watchlist.ts` derives review cues over disclosed redacted receipt fields plus loaded public market context.
- `src/lib/assistant/risk-assistant.ts` contains dependency-free assistant response logic and guardrails.
- `src/lib/assistant/receipt-risk-assistant.ts` contains dependency-free receipt assistant response logic and guardrails.
- `src/lib/receipts/receipt.ts` contains canonical JSON serialization, hashing, deterministic IDs, and verification.
- `src/lib/receipts/portable-receipt-bundle.ts` contains the versioned full and redacted bundle contracts, parsers, and preview metadata.
- `src/lib/receipts/snapshot-comparison.ts` compares saved receipt snapshots against fresh live snapshots.
- `src/lib/hyperliquid/adapter.ts` maps Hyperliquid `info` responses into the normalized model.
- `src/lib/eas/attestation.ts` builds the minimal EAS Sepolia fallback payload.

## Risk Score

The risk score is heuristic and intentionally simple:

- Margin usage contributes up to 40 points.
- Liquidation distance contributes up to 50 points.
- Positive daily funding burden contributes up to 10 points.
- Zero or negative account value returns 100.

Labels are `low`, `medium`, `high`, and `critical`. The score is for UX review and comparison only; it is not Hyperliquid's liquidation logic and is not financial advice.

## Data And Protocol Assumptions

- Fixture data is the default source so the app is demoable without external services.
- Hyperliquid live lookup uses read-only `POST https://api.hyperliquid.xyz/info` calls only.
- No exchange/trading endpoints are used.
- Live response shapes and mappings are documented in `docs/source-notes.md`.
- EAS support is a fallback payload and manual Sepolia flow, not an in-app wallet transaction.
- The EAS payload hashes account/protocol identifiers instead of placing raw account identifiers onchain.
- The risk assistant is local and deterministic in this build; it does not call an LLM API.
- The receipt risk assistant is local and deterministic in this build; it answers only from receipt, hash, live recheck, market, funding, and sampled account-value context.
- Position risk drivers are heuristic triage scores over listed liquidation buffer, notional exposure, positive funding burden, and unrealized loss.
- Liquidation buffer ladder uses listed liquidation prices and does not compute exact Hyperliquid liquidation behavior.
- Funding carry watch assumes current funding and notional stay unchanged and uses normalized mark-price notional as an estimate.
- Market context uses mark price for saved-vs-current comparison and treats open interest as descriptive context, not a standalone direction signal.
- Account value history uses sampled Hyperliquid portfolio windows and is not complete accounting or a trade journal import.
- Receipt account-value context uses the nearest sampled portfolio point to the receipt timestamp and shows the sample gap.
- Receipt change summary is a heuristic review aid and does not recommend position changes.
- Receipt risk-driver comparison reuses the heuristic dashboard driver score for saved and current snapshots; it is not protocol-official attribution.
- Portable receipt bundles have two modes: redacted shares for minimized review and full-snapshot exports for hash recomputation/import.
- Redacted receipt shares hide raw account and exact position values, preserve the original snapshot hash as a reference, and disclose only bucketed summary values plus market-level review cues.
- Redacted market context uses public Hyperliquid market metadata for disclosed markets and does not send a raw account address.
- Redacted market trend uses public Hyperliquid candles and funding history for up to five disclosed markets and does not send a raw account address.
- Redacted market watchlist is heuristic review triage over loaded public context and disclosed redacted fields; it does not prove hidden state or recommend trades.
- Redacted receipt shares are not cryptographic selective disclosure proofs; full bundles are still required when a reviewer needs to recompute the snapshot hash, import the receipt, run live recheck, generate EAS fallback payloads, or use the receipt assistant context.
- Full portable receipt bundles are explicit full-snapshot exports. They solve cross-browser review for local receipts, but they are not encrypted, selectively disclosed, or access-controlled.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Checks

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm audit --audit-level=moderate
```

`npm audit --audit-level=moderate` currently reports a known `postcss` advisory through Next. The suggested npm force fix would install a breaking/incorrect Next version, so it is documented instead of force-applied.

## Demo Flow

Use `docs/demo-script.md` for the reviewer-facing script. The short version:

1. Open the dashboard.
2. Switch between fixture accounts.
3. Explain account risk, position risk drivers, liquidation buffer ladder, funding carry watch, and scenarios.
4. Ask the risk assistant about liquidation, funding, and whether it can recommend a trade.
5. Create a fixture receipt.
6. Open the receipt page and show hash verification.
7. Show the EAS fallback payload and documented manual attestation steps.
8. Optionally paste a Hyperliquid address, show account value history/drawdown context, create a local live receipt, export a redacted receipt share, inspect it at `/receipt/import`, load current public market context and 24h trend history for the redacted markets, show the redacted review watchlist, switch to full bundle export/import when hash recomputation is needed, show receipt account-value context, run `Recheck live account`, show the receipt change summary and risk-driver comparison, and show that hash verification still works while the app compares the saved receipt with current live market context.

## Known Limitations

See `docs/known-limitations.md` for the current list. The major limitations are:

- Live Hyperliquid receipts are stored in browser localStorage only and require a portable bundle for cross-browser review.
- Full portable receipt bundles contain the private snapshot and are not encrypted, access-controlled, or selectively disclosed.
- Redacted receipt bundles are minimized summaries; they cannot recompute the hidden full snapshot hash by themselves and are not cryptographic privacy proofs.
- Redacted market context is current public market context only; it cannot compare hidden saved mark price, exact size, account equity, or PnL.
- Redacted market trend is public 24h market history only and cannot prove the hidden receipt state.
- Redacted market watchlist is heuristic public-context triage only and cannot prove hidden state, recompute hashes, or monitor exact liquidation state.
- Position risk drivers are heuristic and do not prove protocol-official risk attribution.
- Receipt risk-driver comparison is heuristic saved-vs-live attribution and cannot compare changed positions as the same risk object.
- Account value history is sampled from Hyperliquid portfolio windows and is not complete accounting.
- Receipt account-value context uses a nearest sampled point, not an exact historical account audit.
- Receipt change summary is heuristic and descriptive; it is not a trading recommendation.
- Receipt risk assistant responses are deterministic explanations of local receipt/recheck fields, not financial advice or LLM reasoning.
- Live receipt recheck compares the saved receipt to a fresh snapshot but is not an exact liquidation monitor.
- Market context is descriptive and depends on a comparable saved/current position pair.
- Liquidation buffer ladder ranks listed buffer only; actual liquidation behavior can change with cross margin, funding, and other open-position PnL.
- Risk assistant responses are deterministic explanations of loaded fields, not financial advice or LLM reasoning.
- Funding carry watch assumes current funding and notional stay unchanged and is not exact settlement accounting.
- EAS schema registration and attestation transactions are not sent by the app.
- Scenario results apply the same percentage move to every position.
- Liquidation distance and risk score are heuristic and not exchange-official.

## Source Of Truth Docs

- `AGENTS.md`
- `docs/product-spec.md`
- `docs/task-board.md`
- `docs/ai-build-log.md`
- `docs/known-limitations.md`
- `docs/source-notes.md`
- `docs/session-handoff.md`

## Resume Bullet

Built a fixture-first Perp Risk Receipt app in Next.js/TypeScript with tested risk math, live account-value history, position risk drivers, saved-vs-live receipt risk-driver comparison, portable full/redacted receipt bundles, redacted-share market context, 24h trend history and review watchlist, receipt change summaries, receipt account-history context, receipt risk assistant, liquidation buffer ladder, funding carry watch, receipt live rechecks with market context, scenario simulation, deterministic snapshot hashing, guarded risk-assistant chat, read-only Hyperliquid lookup, and documented EAS Sepolia attestation fallback.
