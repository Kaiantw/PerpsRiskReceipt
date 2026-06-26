# session handoff

## completed task

- `t0` through `t9` are complete.
- Post-t9 live receipt UX, live recheck, risk assistant, funding carry watch,
  market context, liquidation buffer ladder, account-value context, receipt
  summaries, portable bundles, redacted shares, redacted public
  market/trend/watchlist/freshness/review/assistant flows, position drivers,
  driver comparison, full-recheck watchlists, thresholds, volatility buffer,
  market regime, regime drilldown, local recheck history, review-packet history
  summaries, redacted two-snapshot compare, redacted comparison
  assistant/packet, redacted review thresholds, compact redacted packet mode,
  markdown packet downloads, receipt snapshot drift, and receipt recheck drift
  history are complete.
- Post-t9 funding-window read is complete.

## current repo state

- Repository path: `/Users/kaia/src/PerpsRiskReceipt`.
- Branch: `main`.
- Remote tracking: `main` tracks `origin/main`.
- Baseline before this slice: `ef654d4`.
- The funding carry derivation now includes next hourly funding, 8h rate-basis
  funding, hourly account-value burden, largest next cost, largest next earn,
  and review points explaining estimate assumptions.
- The dashboard funding panel shows next-hour and 8h-basis funding beside daily
  and 30-day carry.
- Local receipt live rechecks now show `Current funding window`, and the receipt
  assistant plus copied/downloaded review packet include the same current
  funding-window context.
- The implementation uses already-loaded normalized snapshots only. It does not
  add endpoints, dependencies, persisted receipt fields, wallet/RPC flows,
  trading endpoints, predicted funding calls, funding-history calls, exact
  settlement accounting, or advice surfaces.

## files changed

- `src/lib/funding/funding-watch.ts`: derives next hourly funding, 8h rate-basis
  funding, hourly burden, largest next cost/earn, and review points.
- `src/lib/funding/funding-watch.test.ts`: covers next-hour, 8h-basis, burden,
  and top-driver funding math.
- `src/app/funding-carry-watch-panel.tsx`: renders the next-hour funding window
  in the dashboard panel and keeps the wide table horizontally scrollable.
- `src/app/receipt/local/[id]/live-recheck-panel.tsx`: renders `Current funding
  window` after live recheck and passes the read into assistant/packet context.
- `src/lib/assistant/risk-assistant.ts`: includes next-hour funding in the
  dashboard assistant funding answer.
- `src/lib/assistant/receipt-risk-assistant.ts` and
  `src/lib/assistant/receipt-risk-assistant.test.ts`: include and verify
  next-hour funding in receipt assistant funding answers.
- `src/lib/receipts/receipt-review-packet.ts` and
  `src/lib/receipts/receipt-review-packet.test.ts`: include and verify the
  `current funding window` markdown section.
- `docs/knowledge/sources/perp-funding-window.md` and
  `docs/knowledge/features/funding-window-read.md`: new source-backed notes.
- `docs/knowledge/index.md`, `docs/knowledge/features/funding-carry-watch.md`,
  and `docs/knowledge/sources/perp-funding-mechanics.md`: link the new source
  and implemented feature.
- `docs/source-notes.md`: records funding-window assumptions and sources.
- `README.md` and `docs/demo-script.md`: document the dashboard, receipt,
  assistant, packet, demo, and limitation updates.
- `docs/known-limitations.md`: clarifies that funding window remains estimated
  holding-cost context.
- `docs/ai-build-log.md`: records this slice, verification, human review
  points, and remaining risks.
- `docs/session-handoff.md`: this current handoff.

## tests/checks run

- `node --test src/lib/funding/funding-watch.test.ts src/lib/assistant/risk-assistant.test.ts src/lib/assistant/receipt-risk-assistant.test.ts src/lib/receipts/receipt-review-packet.test.ts` passed: 31 tests, 31 passing.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm test` passed: 190 tests, 190 passing.
- `npm run build` passed and listed `/`, `/receipt/import`,
  `/receipt/local/[id]`, `/api/hyperliquid/markets`,
  `/api/hyperliquid/market-history`, `/api/hyperliquid/portfolio`,
  `/api/hyperliquid/snapshot`, and the fixture receipt routes.
- `git diff --check` passed.
- Browser verification used `http://localhost:3000`, confirmed the dashboard
  `Funding carry watch` showed next hourly funding, 8h rate basis, hourly
  burden in bps, per-position next-hour rows, review points, and the
  oracle-price settlement caveat.
- Browser verification used
  `http://localhost:3000/receipt/local/rr_2f6b3a2ad298c698`, clicked
  `Recheck live account`, confirmed `Current funding window` rendered for the
  current live snapshot, confirmed the review packet textarea included
  `## current funding window` and `next hourly net`, clicked the receipt
  assistant `Funding` prompt, and confirmed the answer cited
  `funding_carry_watch.next_hour_net_funding_usd`.
- Browser console verification captured 0 error logs.
- Mobile-width browser verification at 390px confirmed the dashboard funding
  table remains horizontally scrollable and still shows the new funding-window
  fields.

## blockers

- No hard blocker for this slice.
- The current funding window is an estimate over normalized mark-price notional,
  not Hyperliquid's exact oracle-price settlement accounting.
- The feature does not load predicted funding, user funding history, or recent
  funding-history direction yet.
- The verified live local receipt used during browser QA currently rechecked to
  no open positions, so the receipt panel's no-position state was browser-tested;
  position-bearing receipt states are covered by unit tests and dashboard
  browser checks.
- EAS schema registration and attestation transactions are still documented
  fallback steps only.

## exact next recommended action

Add optional read-only predicted/recent funding context for disclosed markets,
using `predictedFundings` or bounded `fundingHistory`, so the current funding
window can show whether the latest rate looks isolated or persistent without
turning into trade-timing advice.
