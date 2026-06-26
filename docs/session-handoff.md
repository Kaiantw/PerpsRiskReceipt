# session handoff

## completed task

- `t0` through `t9` are complete.
- Post-t9 live receipt UX, live recheck, risk assistant, funding carry watch,
  funding-window read, market context, liquidation buffer ladder,
  account-value context, receipt summaries, portable bundles, redacted shares,
  redacted public market/trend/watchlist/freshness/review/assistant flows,
  position drivers, driver comparison, full-recheck watchlists, thresholds,
  volatility buffer, market regime, regime drilldown, local recheck history,
  review-packet history summaries, redacted two-snapshot compare, redacted
  comparison assistant/packet, redacted review thresholds, compact redacted
  packet mode, markdown packet downloads, receipt snapshot drift, and receipt
  recheck drift history are complete.
- Post-t9 funding persistence read is complete.

## current repo state

- Repository path: `/Users/kaia/src/PerpsRiskReceipt`.
- Branch: `main`.
- Remote tracking: `main` tracks `origin/main`.
- Baseline before this slice: `39ec19f`.
- The dashboard now has `Recent funding persistence`, which loads bounded
  public 24h Hyperliquid `fundingHistory` through the existing
  `/api/hyperliquid/market-history` route.
- The local receipt live recheck now has `Recent funding persistence` beside
  `Current funding window` and `Volatility buffer`; it reuses the same loaded
  market-history response.
- Receipt assistant funding answers and full receipt review packets now include
  loaded funding-persistence context.
- The implementation remains read-only and does not add trading endpoints,
  private `userFunding`, `predictedFundings`, wallet/RPC flows, backend
  persistence, dependencies, exact settlement accounting, forecasts, alerts, or
  advice surfaces.

## files changed

- `src/lib/funding/funding-persistence.ts`: new pure recent funding-history
  read with side-adjusted labels, point counts, cost/credit shares, average and
  latest 8h funding, average daily estimate, focus market, and review points.
- `src/lib/funding/funding-persistence.test.ts`: covers persistent cost,
  short-side credit adjustment, recent cost, no history, and no positions.
- `package.json`: registers the new funding-persistence test in `npm test`.
- `src/app/funding-persistence-panel.tsx`: new dashboard panel with
  `Load 24h funding`.
- `src/app/dashboard-client.tsx`: renders the dashboard funding-persistence
  panel keyed by selected snapshot.
- `src/app/receipt/local/[id]/live-recheck-panel.tsx`: derives and renders
  receipt funding persistence from loaded market history, and passes it to
  assistant/packet context.
- `src/lib/assistant/receipt-risk-assistant.ts` and
  `src/lib/assistant/receipt-risk-assistant.test.ts`: include and verify
  funding-persistence context in funding answers.
- `src/lib/receipts/receipt-review-packet.ts` and
  `src/lib/receipts/receipt-review-packet.test.ts`: include and verify the
  `recent funding persistence` markdown section.
- `docs/knowledge/sources/perp-funding-persistence.md` and
  `docs/knowledge/features/funding-persistence-read.md`: new source-backed
  notes.
- `docs/knowledge/index.md`,
  `docs/knowledge/features/funding-carry-watch.md`,
  `docs/knowledge/features/funding-window-read.md`,
  `docs/knowledge/sources/perp-funding-mechanics.md`, and
  `docs/knowledge/sources/perp-funding-window.md`: link the new feature/source.
- `docs/source-notes.md`: records funding-persistence endpoint assumptions and
  guardrails.
- `README.md` and `docs/demo-script.md`: document dashboard/receipt demo,
  architecture, assumptions, and resume bullet updates.
- `docs/known-limitations.md`: documents public funding-history limits.
- `docs/ai-build-log.md`: records this slice, verification, human review
  points, and remaining risks.
- `docs/session-handoff.md`: this current handoff.

## tests/checks run

- `node --test src/lib/funding/funding-persistence.test.ts` passed: 5 tests, 5
  passing.
- `node --test src/lib/funding/funding-persistence.test.ts src/lib/assistant/receipt-risk-assistant.test.ts src/lib/receipts/receipt-review-packet.test.ts`
  passed: 28 tests, 28 passing.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm test` passed: 196 tests, 196 passing.
- `npm run build` passed and listed `/`, `/receipt/import`,
  `/receipt/local/[id]`, `/api/hyperliquid/markets`,
  `/api/hyperliquid/market-history`, `/api/hyperliquid/portfolio`,
  `/api/hyperliquid/snapshot`, and the fixture receipt routes.
- `git diff --check` passed.
- Browser verification used `http://localhost:3000`, selected
  `demo-mixed-book`, clicked `Load 24h funding`, and confirmed
  `Recent funding persistence` loaded public 24h funding-history rows for
  BTC-PERP, SOL-PERP, and ETH-PERP with focus market, matched markets,
  average/latest 8h funding, average daily estimates, and no-advice review
  points.
- Browser verification created a local live receipt from
  `0x102a618b36c32b338c03526255dcf2a39eb1897f`, clicked
  `Recheck live account`, confirmed `Current funding window` and
  `Recent funding persistence` rendered, and confirmed `Load 24h funding` was
  disabled with no-comparable-position/no-open-position copy for the no-position
  live account.
- Browser console verification captured 0 error logs.
- Mobile-width browser verification at 390px confirmed the dashboard
  funding-persistence table stays inside a horizontal scroll container and the
  page does not overflow horizontally.

## blockers

- No hard blocker for this slice.
- Funding persistence is public market-history context only. It is not private
  `userFunding` ledger history, predicted funding, exact Hyperliquid
  oracle-price settlement, order-book/liquidity context, forecasting, alerting,
  or trading advice.
- The existing history route caps reads to five markets.
- Live reads depend on Hyperliquid API availability and response-shape
  stability.
- The live local receipt used during browser QA had no open positions, so the
  receipt no-position state was browser-tested; position-bearing receipt
  funding-persistence behavior is covered by unit tests and dashboard browser
  checks.
- EAS schema registration and attestation transactions are still documented
  fallback steps only.

## exact next recommended action

Add a compact current-market checklist that combines recent funding persistence,
volatility-buffer status, mark movement, open-interest movement, and listed
liquidation buffer into one "what changed in the market?" panel for dashboard
and receipt review, while keeping each underlying detail panel available.
