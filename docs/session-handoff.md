# session handoff

## completed task

- `t0` repo setup is complete.
- `t1` agent rules/evidence docs is complete.
- `t2` fixtures + types is complete.
- `t3` risk engine is complete.

## current repo state

- Repository path: `/Users/kaia/src/PerpsRiskReceipt`.
- Branch: `main`.
- Remote state: `origin/main` is still marked gone because the GitHub repo has no remote branch yet.
- Last commit: `7d8aa02 chore: scaffold Next.js app`.
- Current uncommitted work includes `README.md`, `docs/ai-build-log.md`, `docs/known-limitations.md`, `docs/session-handoff.md`, `package.json`, `tsconfig.json`, and new files under `src/lib/`.
- Dev server was not left running.

## current objective

ship perp risk receipt v0 in one day: fixture-first perp risk dashboard, tested risk engine, scenario simulator, receipt hash, receipt page, ai-build-log, and optional hyperliquid/eas path.

## current phase

phase: `t0` through `t3` complete; ready for dashboard UI planning.

## completed tasks

- `t0` repo setup: Next.js/TypeScript app runs, and lint/test commands work.
- `t1` agent rules/evidence docs: source-of-truth docs, build log, known limitations, source notes, session handoff, and PR template exist.
- `t2` fixtures + types: three demo fixtures, normalized types, and fixture loader exist.
- `t3` risk engine: formulas and unit tests for long/short/liquidation/funding/scenarios exist and pass.

## active task

task id: none active
task name: waiting for next approved task
acceptance criteria: n/a

## important decisions

- Fixture MVP before live API.
- No trading or order placement.
- Risk score is heuristic, not official protocol risk.
- Positive funding means the user pays; negative funding means the user earns.
- Liquidation distance uses the provided fixture liquidation price and is not an exact protocol liquidation calculation.
- Scenario moves apply the same percentage move to every position.
- Snapshot hash is required later in `t6`.
- EAS attestation is optional if the core app is not stable.

## files changed

Current uncommitted changes:

- `README.md`: product/source doc links from `t1`.
- `docs/ai-build-log.md`: `t1`, `t2`, and `t3` closeout entries.
- `docs/known-limitations.md`: added scenario and liquidation-calculation limitations.
- `docs/session-handoff.md`: this handoff update.
- `package.json`: package ESM mode and `npm test` risk-test command.
- `tsconfig.json`: allows `.ts` extension imports for Node TypeScript tests.
- `src/lib/perps/types.ts`: normalized perp types.
- `src/lib/perps/fixtures.ts`: three fixture accounts and fixture loader.
- `src/lib/risk/risk-engine.ts`: risk formula and scenario functions.
- `src/lib/risk/risk-engine.test.ts`: risk engine unit tests.

## tests/checks run

- `npm test` passed: 10 tests, 10 passing.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `git diff --check` passed.
- `npm audit --audit-level=moderate` reports the known `postcss` advisory through `next`.

## blockers

- No blocker for continuing to `t4`.
- `npm audit` reports two moderate findings through Next's bundled `postcss`; do not run `npm audit fix --force` without review because npm suggests a breaking/incorrect Next version.
- The app still has the default Next.js landing page and README body; replace the UI in `t4`.
- Risk score weights need human review before they become prominent in the dashboard.

## exact next recommended action

Start `t4` dashboard UI. Use the existing fixture loader and risk engine rather than adding live API work.

Suggested next prompt:

```text
task: t4 - dashboard ui

before editing files, read AGENTS.md, docs/product-spec.md, docs/task-board.md, docs/ai-build-log.md, docs/known-limitations.md, and docs/session-handoff.md.

then propose the dashboard plan and wait for approval before coding.
```
