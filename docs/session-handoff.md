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

## current repo state

- Repository path: `/Users/kaia/src/PerpsRiskReceipt`.
- Branch: `main`.
- Remote state: `main` tracks `origin/main`.
- Baseline before this slice: `82922e8 feat: add guarded risk assistant`.
- Current work adds a funding carry watch panel on the dashboard and updates the linked research/feature notes under `docs/knowledge/`.
- Dev server was started on `http://localhost:3000` for smoke verification.

## files changed

- `src/lib/funding/funding-watch.ts`: derives funding carry labels, burden, and top funding drivers.
- `src/lib/funding/funding-watch.test.ts`: tests low cost, net earning, no-position, and heavy-cost cases.
- `src/app/funding-carry-watch-panel.tsx`: dashboard panel for funding carry watch.
- `src/app/dashboard-client.tsx`: mounts the funding carry panel for the selected snapshot.
- `src/lib/assistant/risk-assistant.ts`: funding answer now uses the funding-watch model.
- `package.json`: includes funding-watch tests.
- `docs/knowledge/index.md`: links the funding mechanics source note and implemented feature.
- `docs/knowledge/features/funding-carry-watch.md`: marks the feature implemented and documents behavior.
- `docs/knowledge/sources/perp-funding-mechanics.md`: source-backed funding mechanics note.
- `docs/source-notes.md`: records funding carry watch assumptions.
- `README.md`: documents funding carry watch.
- `docs/demo-script.md`: adds the funding carry watch walkthrough.
- `docs/known-limitations.md`: adds funding estimation limitation.
- `docs/ai-build-log.md`: records this post-t9 feature slice.
- `docs/session-handoff.md`: this handoff.

## tests/checks run

- `npm test` passed: 37 tests, 37 passing.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed and listed `/receipt/local/[id]` as a dynamic route.
- Browser verification selected `demo-mixed-book`, confirmed `Funding carry watch`, `net earning`, `BTC-PERP +$9.30` largest cost, `SOL-PERP -$18.00` largest earn, the unchanged-funding caveat, and zero console errors.

## blockers

- No hard blocker for merging the one-day MVP.
- `npm audit --audit-level=moderate` still reports the known `postcss` advisory through `next`.
- Live Hyperliquid receipts are browser-local only and are not synced/shareable across devices.
- Live receipt recheck depends on Hyperliquid API availability and is not an exact liquidation monitor.
- Risk assistant is deterministic local explanation logic, not a connected LLM or financial adviser.
- Funding carry watch assumes current funding and notional stay unchanged and estimates from normalized mark-price notional.
- EAS schema registration and attestation transactions are documented fallback steps only.
- Risk score, liquidation distance, and scenario math remain heuristic and should not be described as official protocol risk.

## exact next recommended action

Commit and push the funding carry watch slice. The next product task should be market context: add mark-price context or market movement strips for top positions so receipt users can quickly see what moved since the snapshot.
