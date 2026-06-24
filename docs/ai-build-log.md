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

### task id: t4
### codex mode:
implementation
### delegated work:
Replaced the scaffold landing page with a fixture-first dashboard that loads demo accounts, shows account-level risk metrics, displays position-level liquidation/funding exposure, and handles fixture loading, invalid address, live lookup disabled, and empty-position states.
### output accepted:
Added `src/app/dashboard-client.tsx` and wired `src/app/page.tsx` to fixture snapshots and deterministic receipt paths. The dashboard shows account value, margin used, margin usage, total notional, minimum liquidation distance, daily funding, 30-day funding, risk score/label, source, freshness, data timestamp, and per-position risk notes.
### output rejected or changed:
No Hyperliquid live adapter was added. The address input validates Ethereum-style addresses and then reports that live lookup is not enabled in the fixture build.
### human review notes:
Review the risk-score weights before demoing them as the product's main summary signal. The dashboard includes the no-open-positions state in code, but the current fixture set does not include an empty account fixture to visibly exercise it.
### tests/checks run:
- `npm test` passed: 14 tests, 14 passing.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `git diff --check` passed.
- Browser verification loaded `http://localhost:3000`, confirmed the dashboard heading, account selector, three demo accounts, account risk state, positions table, scenario simulator, create receipt link, invalid address state, and live lookup disabled state.
- Browser verification reported zero console errors for the checked dashboard/receipt flow.
- `npm audit --audit-level=moderate` reported the known `postcss` advisory through `next`.
### remaining risks:
Live Hyperliquid lookup remains deferred to `t7`. The fixture dashboard is read-only and does not persist user-entered addresses.

### task id: t5
### codex mode:
implementation
### delegated work:
Added the dashboard scenario simulator using the tested risk engine scenario function.
### output accepted:
The simulator renders six price moves: `-10%`, `-5%`, `-2%`, `+2%`, `+5%`, and `+10%`. Each row shows estimated account value, estimated PnL change, liquidation flags, risk score/label after move, and a plain-English summary.
### output rejected or changed:
No chart library or extra dependency was added; scenarios stay table-based for reviewability.
### human review notes:
Scenario moves apply the same market percentage change to every position. This is simple and demoable, but not a portfolio stress model.
### tests/checks run:
- `npm test` passed: 14 tests, including long and short scenario liquidation cases.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- Browser verification confirmed all six scenario moves are visible on the dashboard.
### remaining risks:
Scenario math remains heuristic and does not model exchange-specific cross-margin, slippage, funding changes, or partial liquidation behavior.

### task id: t6
### codex mode:
implementation
### delegated work:
Implemented deterministic fixture receipt creation, canonical JSON snapshot hashing, receipt IDs derived from snapshot hashes, receipt detail pages, and hash verification state.
### output accepted:
Added `src/lib/receipts/receipt.ts`, `src/lib/receipts/receipt.test.ts`, `src/lib/formatters.ts`, and `src/app/receipt/[id]/page.tsx`. Receipt pages show receipt id, account, protocol, created/data timestamps, snapshot hash, expected/recomputed hash, verification status, risk score, summary metrics, market summary, EAS placeholder fields, and limitations.
### output rejected or changed:
No backend persistence, wallet flow, or EAS transaction was added in `t6`. Receipt pages are deterministic fixture routes generated from fixture snapshots.
### human review notes:
Review whether the receipt market-summary table should use per-position liquidation distance and daily funding before relying on multi-position receipt rows; the current implementation repeats account aggregate values in those columns.
### tests/checks run:
- `npm test` passed: 14 tests, including canonical key sorting, deterministic snapshot hash, receipt id derivation, receipt verification success, and tamper-detection failure.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed and generated `/receipt/rr_a4a4f3f7ced8d437`, `/receipt/rr_0bdafb4d9c6616ec`, and `/receipt/rr_65d4187e8a65d6e0`.
- Browser verification clicked a receipt link and confirmed the receipt page shows snapshot hash, hash verified state, limitations, and attestation placeholders.
- `curl http://localhost:3000/receipt/rr_a4a4f3f7ced8d437` returned the expected receipt content.
### remaining risks:
Fixture receipt URLs are shareable locally but are not persisted for arbitrary live accounts. EAS fields remain placeholders until `t8`.

### task id: t4-t6 review gate
### codex mode:
reviewer
### delegated work:
Reran relevant checks, inspected the current repo state, verified the fixture demo locally, and updated closeout documentation.
### output accepted:
The fixture dashboard, scenario simulator, receipt creation, receipt page, and snapshot hash verification work locally against fixture data.
### output rejected or changed:
The known `npm audit` finding was not force-fixed because npm suggests a breaking downgrade path for Next. The receipt market-summary row-level aggregate issue was documented rather than changed after the user asked to keep the implementation as-is.
### human review notes:
Human review should focus on the risk-score weights, the receipt market-summary row values, and whether the fixture-only live-address behavior is acceptable for the current demo slice.
### tests/checks run:
- `npm test` passed: 14 tests, 14 passing.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `git diff --check` passed.
- `npm audit --audit-level=moderate` reported the known `postcss` advisory through `next`.
- Local dev server ran on `http://localhost:3000`.
- Browser verification covered dashboard load, account switching, address error states, receipt navigation, and receipt hash verification.
- `curl` checks confirmed dashboard and receipt HTML include expected content.
### remaining risks:
The app is ready to merge for the fixture t4-t6 slice, but not ready to claim live Hyperliquid support or EAS attestation.

### task id: t7
### codex mode:
implementation
### delegated work:
Added a read-only Hyperliquid adapter, API route, tests with mocked response shapes, and dashboard lookup flow while preserving fixture demo behavior.
### output accepted:
Added `src/lib/hyperliquid/adapter.ts`, `src/lib/hyperliquid/adapter.test.ts`, and `src/app/api/hyperliquid/snapshot/route.ts`. The adapter uses only Hyperliquid `POST /info` bodies for `clearinghouseState` and `metaAndAssetCtxs`, maps live responses into the normalized snapshot model, marks old responses stale, and keeps invalid/API-error states graceful.
### output rejected or changed:
No exchange/trading endpoints, signatures, API wallets, private keys, or order placement code were added. Live lookup does not create shareable receipt pages because there is no persistence layer for arbitrary live snapshots in this build.
### human review notes:
Review the funding-direction mapping from Hyperliquid `funding` into user-perspective bps. Current behavior treats positive funding as a long cost and short earning, matching the existing app convention that positive means user pays.
### tests/checks run:
- `npm test` passed: 20 tests, including Hyperliquid address validation, fixture response mapping, stale response handling, and read-only info request bodies.
- `npm run typecheck` passed after `next build` regenerated route types.
- `npm run lint` passed.
- `npm run build` passed.
- Local API checks:
  - `GET /api/hyperliquid/snapshot?address=0x123` returned invalid address JSON.
  - `GET /api/hyperliquid/snapshot?address=0x0000000000000000000000000000000000000000` returned a live normalized Hyperliquid snapshot.
- Browser verification confirmed invalid address state, live lookup loaded state, source/freshness display, no-open-positions state, fixture-receipts-only state, and zero console errors.
### remaining risks:
Live lookup depends on Hyperliquid API availability and response-shape stability. Live snapshots are dashboard-only and are not persisted into receipt URLs.

### task id: t8
### codex mode:
implementation
### delegated work:
Added a dependency-free EAS Sepolia fallback path that generates a schema, static ABI-encoded attestation data, manual transaction steps, and receipt-page display.
### output accepted:
Added `src/lib/eas/attestation.ts` and `src/lib/eas/attestation.test.ts`. Receipt pages now include the Sepolia chain, EAS contract, SchemaRegistry contract, schema string, encoded data, and manual steps for registering a schema and calling `EAS.attest`.
### output rejected or changed:
No wallet integration, RPC provider, schema registration transaction, or attestation transaction was sent. No EAS SDK dependency was added.
### human review notes:
Review whether the EAS schema fields are the right privacy/minimalism tradeoff. The fallback payload hashes account/protocol instead of putting the raw account identifier onchain.
### tests/checks run:
- `npm test` passed: 20 tests, including deterministic EAS payload generation and a check that the raw fixture account is not encoded into the payload.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `curl /receipt/rr_a4a4f3f7ced8d437` confirmed the receipt page includes `EAS fallback payload`, `Encoded data`, `Hash verified`, and `Sepolia`.
### remaining risks:
This satisfies the documented fallback path, not a completed testnet transaction. A wallet/RPC flow is still needed to produce real EAS schema UID, attestation UID, and tx hash.

### task id: t7-t8 review gate
### codex mode:
reviewer
### delegated work:
Verified fixture MVP still works, checked live Hyperliquid lookup, checked the EAS fallback receipt section, inspected source assumptions, and prepared docs for handoff.
### output accepted:
Fixture demo remains intact, live lookup works against a valid address, invalid live lookup fails gracefully, and receipt pages show a manual EAS fallback payload.
### output rejected or changed:
The app still does not claim live receipts or completed EAS attestations. The fallback is documented because wallet/RPC/testnet transaction setup was outside this slice.
### human review notes:
Review Hyperliquid mapping assumptions, especially funding direction and open-interest USD conversion. Review EAS schema privacy and whether hashed account/protocol fields are acceptable for the portfolio demo.
### tests/checks run:
- `npm test` passed: 20 tests, 20 passing.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `npm audit --audit-level=moderate` reported the known `postcss` advisory through `next`.
- Local dev server ran on `http://localhost:3000` and was stopped.
- Browser verification covered fixture dashboard, invalid address state, live lookup state, no-open-positions live account, fixture receipt restriction for live lookup, and receipt EAS fallback content.
### remaining risks:
Ready to merge as a read-only t7 plus documented t8 fallback slice. Not ready to claim onchain attestation completion.

### task id: t9
### codex mode:
reviewer + documentation
### delegated work:
Performed the final review/evidence pass, fixed the receipt market-summary review item, replaced the scaffold README with a product README, expanded the demo script, updated known limitations, and prepared the final session handoff.
### output accepted:
Receipt market-summary rows now use the tested per-position liquidation-distance and daily-funding helpers instead of repeating account aggregate values. README now documents the product goal, architecture, risk score weights, assumptions, checks, demo flow, known limitations, source-of-truth docs, and resume bullet. `docs/demo-script.md` now gives a concrete walkthrough for fixture accounts, scenarios, receipts, EAS fallback, optional live lookup, and evidence review.
### output rejected or changed:
No wallet/RPC flow, live receipt persistence, new dependencies, or expanded protocol support were added during t9. The known `npm audit` finding was not force-fixed because npm recommends a breaking Next downgrade path.
### human review notes:
Review the heuristic risk-score weights before treating the score as portfolio-ready. Review Hyperliquid funding-direction and open-interest mapping assumptions. Review whether the EAS schema privacy tradeoff is acceptable before submitting a real attestation.
### tests/checks run:
- `npm test` passed: 20 tests, 20 passing.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `git diff --check` passed.
- `npm audit --audit-level=moderate` reported the known `postcss` advisory through `next`; no force fix applied.
- Local dev server ran on `http://localhost:3000` and was stopped.
- `curl /` confirmed the dashboard, create-receipt link, and Hyperliquid address input render.
- `curl /api/hyperliquid/snapshot?address=0x123` returned the invalid-address JSON state.
- `curl /receipt/rr_a4a4f3f7ced8d437` confirmed `Hash verified`, `EAS fallback payload`, `Encoded data`, `Sepolia`, and `Market summary`.
- `curl /receipt/rr_65d4187e8a65d6e0` confirmed mixed-book per-position receipt values: `22.58%`, `40.00%`, `n/a`, `+$9.30`, `-$18.00`, and `+$4.35`.
### remaining risks:
The app is mergeable as a one-day portfolio MVP, but live Hyperliquid receipts are still not persisted/shareable, EAS attestation is still a documented Sepolia fallback rather than a submitted transaction, and the Next/PostCSS audit advisory remains documented.

### task id: post-t9 live receipt ux fix
### codex mode:
bug fix
### delegated work:
Fixed the confusing live lookup receipt path after a user-tested live account showed `Receipt not persisted for live lookups` instead of letting the reviewer create a receipt.
### output accepted:
Live Hyperliquid snapshots can now create browser-local receipts. The dashboard stores the receipt JSON in localStorage, navigates to `/receipt/local/[id]`, and the local receipt page recomputes the snapshot hash, displays hash verification, renders the market summary, and shows the EAS fallback payload. Fixture receipts and fixture receipt URLs still work through the existing `/receipt/[id]` route.
### output rejected or changed:
No backend receipt database, account-wide server persistence, wallet flow, private key handling, or trading endpoint was added. Live receipts are intentionally local to the creating browser.
### human review notes:
Review whether browser-local persistence is enough for the portfolio demo. A production version should use a backend or signed payload if live receipts need to be shared across devices.
### tests/checks run:
- `npm test` passed: 23 tests, 23 passing.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed and listed `/receipt/local/[id]` as a dynamic route.
- `git diff --check` passed.
- Browser verification loaded the dashboard, pasted the user-tested Hyperliquid address, clicked `Lookup`, confirmed `Create local receipt`, clicked it, and landed on `/receipt/local/rr_91e46949fe4afbe2`.
- Browser verification confirmed `Hash verified`, local-browser storage notice, `EAS fallback payload`, `No open positions.`, and zero console errors.
- `npm audit --audit-level=moderate` reported the known `postcss` advisory through `next`; no force fix applied.
### remaining risks:
Live receipt URLs only work in the browser that created them because the snapshot is stored in localStorage.
