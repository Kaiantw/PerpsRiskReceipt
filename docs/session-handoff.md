# session handoff

## completed task

- `t0` repo setup is complete.
- `t1` agent rules/evidence docs is complete.
- `t2` fixtures + types is complete.
- `t3` risk engine is complete.
- `t4` dashboard UI is complete.
- `t5` scenario simulator is complete.
- `t6` receipt system is complete.
- `t7` Hyperliquid read-only adapter is complete with graceful error states.
- `t8` EAS attestation fallback path is complete; no transaction was sent.
- `t9` review + evidence is complete.
- Post-t9 live receipt UX fix is complete.
- Post-t9 live receipt recheck is complete.
- Post-t9 risk assistant is complete.
- Post-t9 funding carry watch is complete.
- Post-t9 market context is complete.
- Post-t9 liquidation buffer ladder is complete.
- Post-t9 account value history is complete.
- Post-t9 receipt account-value context is complete.
- Post-t9 receipt change summary is complete.
- Post-t9 receipt risk assistant is complete.
- Post-t9 portable receipt bundle is complete.
- Post-t9 redacted receipt share is complete.
- Post-t9 redacted market context is complete.
- Post-t9 redacted market trend history is complete.
- Post-t9 redacted market watchlist is complete.
- Post-t9 position risk drivers is complete.

## current repo state

- Repository path: `/Users/kaia/src/PerpsRiskReceipt`.
- Branch: `main`.
- Remote state: `main` tracks `origin/main`.
- Baseline before this slice: `2cc5338 feat: add redacted market watchlist`.
- Current work adds a dashboard `Position risk drivers` panel.
- The panel ranks open positions by a transparent heuristic score made from listed liquidation buffer, notional exposure/concentration, positive daily funding burden, and unrealized loss.
- It shows top driver, gross exposure versus account value, largest position share, directional bias, net directional notional, top driver cards, per-position component scores, and an explicit no-advice/no-exact-liquidation caveat.
- No new API endpoint, dependency, data model, wallet/RPC flow, backend store, or trading behavior was added.
- A Next dev server was already running on `http://localhost:3000` for smoke verification.

## files changed

- `src/lib/risk/position-risk-drivers.ts`: new pure position risk-driver scoring and summary module.
- `src/lib/risk/position-risk-drivers.test.ts`: tests for near-liquidation ranking, notional concentration, positive funding cost, no-position state, and zero-account-value safety.
- `src/app/position-risk-drivers-panel.tsx`: new dashboard panel for top driver metrics, driver cards, component table, and caveat copy.
- `src/app/dashboard-client.tsx`: mounts the new panel before the detailed liquidation and funding panels.
- `package.json`: includes the new risk-driver test in `npm test`.
- `docs/knowledge/sources/perp-position-risk-drivers.md`: new source-backed note for liquidation, leverage/notional, funding, mark-price, and unrealized-loss assumptions.
- `docs/knowledge/features/position-risk-drivers.md`: new implemented feature note.
- `docs/knowledge/features/liquidation-buffer-ladder.md`: links the driver feature.
- `docs/knowledge/features/funding-carry-watch.md`: links the driver feature.
- `docs/knowledge/features/account-value-timeline.md`: links the driver feature.
- `docs/knowledge/index.md`: links the new source and feature notes.
- `docs/source-notes.md`: documents position risk-driver sources, score weights, and assumptions.
- `docs/known-limitations.md`: documents heuristic risk-driver limits.
- `README.md`: documents position risk drivers in demo, architecture, assumptions, limitations, and resume bullet.
- `docs/demo-script.md`: adds the position risk-driver demo step and updates the resume bullet.
- `docs/ai-build-log.md`: records this feature slice.
- `docs/session-handoff.md`: this handoff.

## tests/checks run

- `node --test src/lib/risk/position-risk-drivers.test.ts` passed: 5 tests, 5 passing.
- `npm test` passed: 105 tests, 105 passing.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed and listed `/` plus existing API/receipt routes.
- `git diff --check` passed.
- Browser verification used `http://localhost:3000`, selected `demo-near-liquidation-btc-short`, confirmed `Position risk drivers`, `BTC-PERP · 77`, gross exposure `2.24x`, directional bias `net short`, score components `L 42 · N 25 · F 0 · PnL 10`, the no-advice caveat, and zero browser console errors.

## blockers

- No hard blocker for this feature slice.
- Position risk drivers are heuristic and not protocol-official risk attribution.
- The score uses listed liquidation price, not Hyperliquid's exact liquidation formula, margin tiers, liquidity, or cross-margin engine.
- Single-position accounts naturally show high notional concentration because the whole book is one exposure.
- Funding burden uses the existing normalized mark-price notional estimate, not exact Hyperliquid oracle-price funding settlement.
- The panel is a snapshot triage view only and does not recommend changing leverage, closing, hedging, or resizing positions.
- Live Hyperliquid data still depends on API availability and response shape.
- Live receipts remain browser-local unless explicitly exported/imported.
- Redacted receipt shares remain minimized offchain JSON summaries, not cryptographic selective-disclosure proofs.
- EAS schema registration and attestation transactions are documented fallback steps only.

## exact next recommended action

Add a receipt-page risk-driver comparison after live recheck: compute risk drivers for the saved receipt snapshot and the fresh live snapshot, then show which top driver changed, whether gross exposure changed, whether the closest listed buffer improved/worsened, and whether funding burden moved materially.
