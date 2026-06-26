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
- Post-t9 receipt risk-driver comparison is complete.
- Post-t9 receipt assistant driver citations is complete.

## current repo state

- Repository path: `/Users/kaia/src/PerpsRiskReceipt`.
- Branch: `main`.
- Remote state: `main` tracks `origin/main`.
- Baseline before this slice: `65d598e feat: compare receipt risk drivers`.
- Current work lets `Receipt risk assistant` cite `Risk drivers since receipt` directly after a local live recheck.
- The assistant now has a `Drivers` quick prompt and routes driver/exposure/top-risk questions to a deterministic answer built from saved/current top driver, score delta, gross exposure delta, closest listed-buffer delta, daily funding delta, and review points.
- Review answers now include the risk-driver comparison headline when that context is loaded.
- Trade-intent refusal still runs before driver routing, so advice-seeking questions remain blocked.
- No new endpoint, dependency, data model, wallet/RPC flow, backend store, LLM call, or trading behavior was added.
- A Next dev server was already running on `http://localhost:3000` for browser smoke verification.

## files changed

- `src/lib/assistant/receipt-risk-assistant.ts`: adds optional receipt driver-comparison context, driver answer routing, driver citations, and the `Drivers` suggestion.
- `src/lib/assistant/receipt-risk-assistant.test.ts`: covers review-answer driver citations, driver question answers, and the new quick prompt.
- `src/app/receipt/local/[id]/live-recheck-panel.tsx`: passes the saved-vs-live driver comparison into the receipt assistant and refreshes the assistant key when driver state changes.
- `docs/knowledge/sources/perp-receipt-assistant-driver-citations.md`: source-backed assumptions for driver-aware assistant answers.
- `docs/knowledge/features/receipt-assistant-driver-citations.md`: implemented feature note.
- `docs/knowledge/index.md`: links the new feature/source notes.
- `docs/knowledge/features/receipt-risk-assistant.md`: documents direct driver-comparison citations.
- `docs/knowledge/features/receipt-risk-driver-comparison.md`: links assistant reuse.
- `docs/knowledge/sources/perp-receipt-review-assistant.md`: adds the driver-citation source note.
- `docs/source-notes.md`: documents driver-specific assistant assumptions.
- `docs/known-limitations.md`: documents inherited heuristic driver-answer limits.
- `README.md`: documents the assistant's driver-aware live receipt review.
- `docs/demo-script.md`: adds the driver-aware assistant walkthrough.
- `docs/ai-build-log.md`: records this feature slice.
- `docs/session-handoff.md`: this handoff.

## tests/checks run

- `node --test src/lib/assistant/receipt-risk-assistant.test.ts` passed: 10 tests, 10 passing.
- `npm test` passed: 113 tests, 113 passing.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed and listed `/receipt/local/[id]`.
- `git diff --check` passed.
- Browser verification used `http://localhost:3000`, pasted `0x102a618b36c32b338c03526255dcf2a39eb1897f`, created `/receipt/local/rr_b849aedef1a09287`, confirmed `Hash verified`, clicked `Recheck live account`, confirmed `Receipt change summary`, `Risk drivers since receipt`, `Receipt risk assistant`, and `Drivers`, clicked `Drivers`, confirmed `Saved top driver`, `Current top driver`, `Top score delta`, `receipt_risk_driver_comparison.top_driver_score_delta`, and the heuristic caveat, asked `Should I increase leverage?`, confirmed the trade-advice refusal, and saw zero severe captured tab logs.

## blockers

- No hard blocker for this feature slice.
- Receipt assistant driver answers inherit the heuristic receipt risk-driver comparison limits and are not protocol-official attribution.
- The comparison uses listed liquidation price and normalized mark-price notional; it does not model Hyperliquid's exact liquidation formula, margin tiers, liquidity, cross-margin engine, or oracle-price funding settlement.
- Position-state changes limit direct comparison because a resized, side-changed, new, or closed position is not the same risk object.
- Live Hyperliquid data still depends on API availability and response shape.
- Live receipts remain browser-local unless explicitly exported/imported.
- Redacted receipt shares remain minimized offchain JSON summaries, not cryptographic selective-disclosure proofs.
- EAS schema registration and attestation transactions are documented fallback steps only.

## exact next recommended action

Add per-market assistant drilldowns from the driver comparison table, so the user can ask why a specific market is the current driver and see component score changes.
