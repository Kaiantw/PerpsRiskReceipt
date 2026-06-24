# ai build log

purpose: document how codex was used, what was accepted/rejected, what human review changed, and what tests/checks verified.

## entry template

### task id:
### codex mode:
### delegated work:
### output accepted:
### output rejected or changed:
### human review notes:
### tests/checks run:
### remaining risks:

## entries

### task id: t0
### codex mode:
build lead
### delegated work:
Scaffolded a Next.js/TypeScript app in the existing repository root, preserved the repo instruction/docs files, installed npm dependencies, and added explicit test/typecheck scripts.
### output accepted:
Next.js 16.2.9 App Router scaffold with TypeScript, Tailwind CSS, ESLint, npm lockfile, `src/` app directory, and runnable `lint`, `typecheck`, `test`, and `build` scripts.
### output rejected or changed:
Direct `create-next-app .` failed because the repository folder name contains capital letters, which npm package names disallow. I generated a temporary lowercase scaffold and copied the app files into this repo, excluding generated agent docs, `.next`, and `node_modules`.
### human review notes:
Review whether the default scaffold landing page and README should be replaced during the dashboard task. No product logic was added in t0.
### tests/checks run:
- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm test` passed with zero tests.
- `npm run build` passed.
- `npm run dev` started on `http://localhost:3000`.
- `curl -I http://localhost:3000` returned `200 OK`.
- `npm audit --audit-level=moderate` reported a `postcss` advisory through `next`.
### remaining risks:
npm install reported two moderate audit findings: `postcss <8.5.10` through `next`. No audit fix was applied because npm suggests `npm audit fix --force`, which would install a breaking/incorrect Next version.

### task id: t0 review gate
### codex mode:
reviewer
### delegated work:
Reran the t0 verification suite, inspected the untracked scaffold file set, checked the generated app against `AGENTS.md` and `docs/product-spec.md`, and confirmed the app still responds locally.
### output accepted:
The scaffold satisfies t0: a Next.js/TypeScript app exists, `lint`, `typecheck`, `test`, and `build` scripts run, and the dev server returns `200 OK` at `/`.
### output rejected or changed:
No implementation files were changed during review. The unresolved `npm audit` finding was not force-fixed because npm's suggested fix would install a breaking/incorrect Next version.
### human review notes:
Before product-demo use, replace the default Next.js landing page and README. `npm test` currently proves only that the command runs; real risk-engine tests begin in t3. While the dev server was running, the default scaffold logged a non-blocking image sizing warning and `/service-worker.js` 404 requests.
### tests/checks run:
- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm test` passed with zero tests.
- `npm run build` passed.
- `curl -I http://localhost:3000` returned `200 OK`.
- `npm audit --audit-level=moderate` reported a `postcss` advisory through `next`.
### remaining risks:
Two moderate npm audit findings remain through Next's bundled `postcss`. The t0 scaffold has no product UI or risk tests yet, which is acceptable for t0 but must not be treated as MVP completion.

### task id: session handoff update
### codex mode:
documentation
### delegated work:
Filled `docs/session-handoff.md` with the completed task, current repo state, files changed, tests/checks run, blockers, and exact next recommended action.
### output accepted:
Session handoff now names `t0` as complete, references commit `7d8aa02`, records the remote branch state, summarizes the scaffold files, and recommends the next task-board action.
### output rejected or changed:
No product code was changed.
### human review notes:
Confirm whether `t1` should be formally reviewed/marked accepted before starting `t2`, because the `t1` artifacts already exist in the root commit.
### tests/checks run:
- `git diff --check` passed.
### remaining risks:
This is a docs-only update. No product behavior changed.

### task id: t1
### codex mode:
documentation
### delegated work:
Verified the agent rules and evidence docs required by `t1`, added README links to the product/source docs, and updated `docs/session-handoff.md` so it says `t1` is complete.
### output accepted:
`AGENTS.md`, `docs/product-spec.md`, `docs/ai-build-log.md`, `.github/pull_request_template.md`, `docs/known-limitations.md`, `docs/source-notes.md`, and `docs/session-handoff.md` all exist. README now links to the source-of-truth docs.
### output rejected or changed:
No product code was changed. No new dependencies were added.
### human review notes:
Review whether the default Next.js README content should be fully replaced later; for now it has the required source-of-truth links for setup.
### tests/checks run:
- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm test` passed with zero tests.
- `npm run build` passed.
- `git diff --check` passed.
- Required artifact audit passed for `AGENTS.md`, `docs/product-spec.md`, `docs/task-board.md`, `docs/ai-build-log.md`, `docs/known-limitations.md`, `docs/source-notes.md`, `docs/session-handoff.md`, `.github/pull_request_template.md`, `package.json`, `src/app/page.tsx`, and `README.md`.
- `docs/session-handoff.md` contains `t1` completion lines.
- `npm audit --audit-level=moderate` reported the known `postcss` advisory through `next`.
### remaining risks:
This completes setup/evidence docs only. The app still has the default scaffold UI and no risk-engine tests.

### task id: t2
### codex mode:
implementation
### delegated work:
Implemented normalized perp account/position types, three fixture demo accounts, and a fixture loader that returns normalized account snapshots with calculated aggregates.
### output accepted:
Added `src/lib/perps/types.ts` for normalized account, position, receipt, input, and scenario result types. Added `src/lib/perps/fixtures.ts` with `demo-safe-eth-long`, `demo-near-liquidation-btc-short`, and `demo-mixed-book`, plus `listFixtureAccounts` and `loadFixtureAccount`.
### output rejected or changed:
No live Hyperliquid adapter was added; fixture-first remains the active path.
### human review notes:
Verify fixture values feel realistic enough for the later dashboard demo. The fixtures intentionally use stable fixed timestamps so tests are deterministic.
### tests/checks run:
- `npm test` passed: 10 risk tests.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `git diff --check` passed.
### remaining risks:
Fixture data may not reflect live market/account state. Open interest values are illustrative fixture values only.

### task id: t3
### codex mode:
implementation
### delegated work:
Implemented the pure risk engine and tests for notional, unrealized pnl, margin usage, liquidation distance, funding, scenario pnl, liquidation flags, risk score, and risk labels.
### output accepted:
Added `src/lib/risk/risk-engine.ts` and `src/lib/risk/risk-engine.test.ts`. Updated `npm test` to run the risk tests through Node's built-in TypeScript-capable test runner. Added TypeScript config support for `.ts` imports and set package ESM mode to avoid test-runner module warnings.
### output rejected or changed:
The first mixed-book funding expectation was corrected from `-11.65` to `-4.35` after recalculating the offset between paying longs and an earning short. No heavy test dependency was added.
### human review notes:
Review the heuristic risk score weights before UI work makes them prominent. The code treats positive funding as a user cost and negative funding as user earnings.
### tests/checks run:
- `npm test` passed: 10 tests, 10 passing.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `git diff --check` passed.
- `npm audit --audit-level=moderate` still reports the known `postcss` advisory through `next`.
### remaining risks:
Risk score and scenarios are heuristic. Scenario moves apply the same percentage move to every position and do not model exchange-specific cross-margin or exact Hyperliquid liquidation behavior.
