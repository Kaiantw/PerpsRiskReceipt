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

### task id: post-t9 live receipt recheck
### codex mode:
product iteration + implementation
### delegated work:
Researched Hyperliquid live risk signals and added a receipt live recheck flow so browser-local Hyperliquid receipts can be compared against a fresh read-only account snapshot.
### output accepted:
Added a pure snapshot comparison module with tests for unchanged snapshots, risk worsening, position changes, closed/new positions, and account mismatch. Added a `Live recheck` panel to local live receipt pages that fetches the current Hyperliquid snapshot, compares saved vs current risk score, margin usage, liquidation distance, account value, notional, funding, mark movement, and position state, then labels the result. Added `docs/knowledge/` as an Obsidian-style idea graph with source notes and linked feature ideas.
### output rejected or changed:
No trading endpoints, order placement, private keys, wallet/RPC flow, backend receipt persistence, or new dependencies were added. The recheck is intentionally descriptive and does not recommend trades.
### human review notes:
Review the material-change thresholds: 10 risk-score points, 500 bps margin usage, 500 bps liquidation distance, and 2% mark-price movement. Review whether the `little changed`, `market moved`, `risk worsened`, and `position state changed` labels are the right product language for traders.
### tests/checks run:
- `npm test` passed: 28 tests, 28 passing.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed and listed `/receipt/local/[id]` as a dynamic route.
- `git diff --check` passed.
- Browser verification loaded the dashboard, pasted `0x102a618b36c32b338c03526255dcf2a39eb1897f`, clicked `Lookup`, created a local receipt, opened `/receipt/local/rr_a86900e3d2096b24`, clicked `Recheck live account`, confirmed `little changed`, comparison metrics, empty-position comparison, and zero console errors.
### remaining risks:
Live recheck depends on Hyperliquid API availability, localStorage receipt persistence, and current snapshot comparability. It is not an exact liquidation monitor, does not prove historical market correctness, and does not create a shareable cross-device live receipt.

### task id: post-t9 risk assistant
### codex mode:
product iteration + implementation
### delegated work:
Added a guarded assistant-style chat to the dashboard so users can ask plain-English questions about the loaded risk snapshot.
### output accepted:
Added dependency-free assistant response logic with tests for snapshot summaries, liquidation explanations, funding explanations, no-position suggestions, and trade-recommendation refusal. Added a dashboard `Risk assistant` panel with quick prompts, free-form questions, assistant/user messages, and snapshot-field citations. Updated README, demo script, limitations, and knowledge notes.
### output rejected or changed:
No LLM API, API key, backend chat persistence, financial advice, or trade recommendation path was added. The assistant is local deterministic explanation logic for this build.
### human review notes:
Review the assistant's refusal language and keyword routing. The current guardrail refuses explicit trade-intent questions like buying, selling, opening, closing, increasing, reducing, or leverage requests, while still summarizing current risk signals.
### tests/checks run:
- `npm test` passed: 33 tests, 33 passing.
- `npm run typecheck` passed.
- `npm run lint` passed after replacing effect-based state reset with keyed component remount.
- `npm run build` passed.
- Browser verification opened the dashboard, confirmed the `Risk assistant`, clicked `Liquidation`, confirmed an `ETH-PERP is closest` answer with citations, asked `Should I close this long?`, confirmed the assistant refused recommendations, and saw zero console errors.
### remaining risks:
The assistant is not a connected LLM yet, does not reason beyond deterministic routing, and should remain limited to explaining visible snapshot fields until a server-side model path with stronger safety guardrails is added.

### task id: post-t9 funding carry watch
### codex mode:
product iteration + implementation
### delegated work:
Added a funding carry watch so users can see net funding cost or earned funding as a first-class dashboard risk signal.
### output accepted:
Added a pure funding-watch module with tests for low cost, net earning, no-position, and heavy-cost cases. Added a dashboard `Funding carry watch` panel showing net daily funding, 30-day estimate, daily funding burden as bps of account value, largest cost driver, largest earning driver, and per-position funding rows. Updated the risk assistant's funding answer to use the same derived funding-watch model. Added a linked funding-mechanics source note and updated source assumptions, README, demo script, limitations, and handoff.
### output rejected or changed:
No historical funding endpoint, predicted funding endpoint, backend store, trading recommendation, or new dependency was added. This slice uses current funding already available through the read-only Hyperliquid `metaAndAssetCtxs` mapping.
### human review notes:
Review label thresholds: low cost below 5 bps/day of account value, elevated cost from 5 to under 25 bps/day, and heavy cost at 25 bps/day or when account-value burden is unavailable. Review whether daily burden should display signed bps or absolute bps in future UI.
### tests/checks run:
- `npm test` passed: 37 tests, 37 passing.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- Browser verification selected `demo-mixed-book`, confirmed `Funding carry watch`, `net earning`, `BTC-PERP +$9.30` largest cost, `SOL-PERP -$18.00` largest earn, the unchanged-funding caveat, and zero console errors.
### remaining risks:
Funding carry watch assumes current funding and notional stay unchanged. Hyperliquid actual settlement uses oracle price, while this app estimates from normalized mark-price notional.

### task id: post-t9 market context
### codex mode:
product iteration + implementation
### delegated work:
Researched mark-price and open-interest market context, then added a live receipt market-context layer so saved receipts can be compared against the current market in plain English.
### output accepted:
Added a pure market-context module with tests for long adverse moves, short favorable moves, funding-only changes, and position-state changes. Local live receipt rechecks now include `Market context since receipt`, showing saved-vs-current mark price, whether the move is toward or away from listed liquidation, current liquidation distance, 8-hour funding change, open-interest change, focus market, and descriptive caveats. Updated README, demo script, source notes, known limitations, and the knowledge graph.
### output rejected or changed:
No trading endpoint, strategy recommendation, backend store, websocket, chart dependency, or additional Hyperliquid endpoint was added. Open interest is displayed as descriptive context only, not as a direction signal.
### human review notes:
Review the market-context label priority: position-state changes first, then through/toward liquidation, then material mark move, then funding deltas. Review whether a 2% mark move and $1 daily funding delta are the right thresholds for the demo.
### tests/checks run:
- `npm test` passed: 41 tests, 41 passing.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed and listed `/receipt/local/[id]` as a dynamic route.
- `git diff --check` passed.
- Browser verification opened the dashboard, looked up `0x102a618b36c32b338c03526255dcf2a39eb1897f`, created a local receipt, clicked `Recheck live account`, confirmed `Market context since receipt`, the no-open-positions context, the descriptive no-recommendation caveat, and zero console errors.
### remaining risks:
Market context depends on comparable saved/current positions, Hyperliquid API availability, and localStorage receipt persistence. It is descriptive and should not be treated as an exact liquidation monitor or trading signal.

### task id: post-t9 liquidation buffer ladder
### codex mode:
product iteration + implementation
### delegated work:
Researched Hyperliquid liquidation and margining docs, then added a dashboard ladder that ranks open positions by listed liquidation buffer.
### output accepted:
Added a pure liquidation-buffer module with tests for safe long, near-liquidation short, mixed-book missing liquidation price, at-or-through liquidation, and no-position states. Added a dashboard `Liquidation buffer ladder` panel showing closest market, listed buffer, adverse move percent, adverse move dollars, approximate PnL to listed liquidation, and a caveat that actual liquidation behavior can change with cross margin, funding, and other open-position PnL. Updated README, demo script, limitations, source notes, handoff, and the knowledge graph.
### output rejected or changed:
No exact Hyperliquid liquidation formula, margin-tier modeling, trading endpoint, websocket, alerting system, chart dependency, or storage change was added. The feature intentionally ranks listed liquidation prices already present in the normalized snapshot.
### human review notes:
Review ladder thresholds: thin up to 5%, tight up to 10%, moderate up to 25%, and wide above 25%. Review whether approximate PnL to listed liquidation is a helpful label or should be renamed to avoid implying account-level loss.
### tests/checks run:
- `npm test` passed: 46 tests, 46 passing.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `git diff --check` passed.
- Browser verification selected `demo-near-liquidation-btc-short`, confirmed `Liquidation buffer ladder`, `thin buffer`, `BTC-PERP`, `3.57%`, `$2,000.00`, the listed-buffer caveat, and zero console errors.
### remaining risks:
The ladder uses listed liquidation prices and existing normalized position fields only. It does not model cross-margin equity, funding changes, liquidity changes, maintenance tiers, or exact Hyperliquid liquidation behavior.

### task id: post-t9 account value history
### codex mode:
product iteration + implementation
### delegated work:
Researched Hyperliquid portfolio history and drawdown context, then added a live dashboard account-value history panel for Hyperliquid lookups.
### output accepted:
Added tested account-value timeline math for period change, current drawdown, max drawdown, zero-start percentage safety, and point sorting. Extended the Hyperliquid read-only adapter with the `portfolio` info request, a mocked response mapper, and a dashboard API route. Added a live `Account value history` panel showing sampled account value, PnL history, volume, period change, drawdown metrics, sparkline, and recent sampled rows.
### output rejected or changed:
No chart dependency, websocket, trading endpoint, backend persistence, tax/accounting export, strategy recommendation, or exact performance audit was added. The feature labels Hyperliquid portfolio history as sampled context.
### human review notes:
Review the account-value trend thresholds: higher/lower at 2% period change and drawdown watch at 10% max drawdown. Review whether perp-only windows should remain preferred over all-account windows.
### tests/checks run:
- `npm test` passed: 53 tests, 53 passing.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `git diff --check` passed.
- Browser verification pasted `0x102a618b36c32b338c03526255dcf2a39eb1897f`, confirmed `Account value history`, `Perp week`, `Current drawdown`, `Max drawdown`, `Window volume`, and zero console errors.
### remaining risks:
Account value history depends on Hyperliquid API availability and the `portfolio` response shape. It is sampled context, not complete accounting, a trade journal import, or financial advice.

### task id: post-t9 receipt account-value context
### codex mode:
product iteration + implementation
### delegated work:
Extended local live receipt pages with sampled account-value context so a saved receipt can be compared against Hyperliquid portfolio history, not only against a fresh current snapshot.
### output accepted:
Added a pure receipt account-value context module with tests for no history, preferred perp windows, nearest receipt sample, near-peak receipts, drawdown receipts, latest sampled account-value drift, far sample gaps, and zero-account percentage safety. Added a local receipt panel that fetches the existing read-only `portfolio` route, shows receipt value, nearest sample, sample gap, latest sampled value, latest versus receipt, receipt drawdown, current drawdown, max drawdown, and sampled point count. Updated the knowledge graph, source notes, README, demo script, limitations, and handoff.
### output rejected or changed:
The first implementation labeled a receipt near peak before considering material latest-account-value drift. Tests exposed that product-priority bug, so label priority now treats material latest higher/lower drift as more important than near-peak status. No trading endpoint, websocket, backend receipt persistence, chart dependency, exact historical audit, or recommendation logic was added.
### human review notes:
Review the receipt context thresholds: material latest-vs-receipt change at 2%, drawdown at 10%, near peak within 2% drawdown, and sample-gap watch above 60 minutes. Review whether `Perp day` should remain the first preferred receipt context window or whether local receipts should prefer `Perp week`.
### tests/checks run:
- `npm test` passed: 60 tests, 60 passing.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed and listed `/api/hyperliquid/portfolio` plus `/receipt/local/[id]`.
- `git diff --check` passed.
- Browser verification used the existing dev server on `http://localhost:3000`, pasted `0x102a618b36c32b338c03526255dcf2a39eb1897f`, created `/receipt/local/rr_6ff6d84eeca07e7a`, confirmed `Receipt account-value context`, `Nearest sample`, `Sample gap`, `Latest vs receipt`, `Receipt drawdown`, `Portfolio history is sampled account-value context`, and `Hash verified`, then clicked `Recheck live account` and confirmed `Market context since receipt` still rendered with zero console errors.
### remaining risks:
Receipt account-value context depends on Hyperliquid API availability and the `portfolio` response shape. It uses the nearest sampled portfolio point, so the sample gap matters. It is not exact accounting, causality analysis, a trade journal import, or financial advice.

### task id: post-t9 receipt change summary
### codex mode:
product iteration + implementation
### delegated work:
Added a compact receipt recheck verdict that synthesizes account match, position state, live market context, sampled account-value context, funding deltas, and risk-score changes into one reviewer-readable summary.
### output accepted:
Added `src/lib/receipts/receipt-change-summary.ts` with deterministic priority rules and tests. Local live receipt rechecks now show `Receipt change summary` before the detailed market-context section, including a short headline, primary detail, review points, a severity label, and an explicit read-only/no-recommendation caveat. Added linked source and feature notes under `docs/knowledge/`, updated source assumptions, README, demo script, known limitations, and this handoff.
### output rejected or changed:
No trading endpoint, order placement, wallet/RPC flow, backend receipt persistence, LLM call, exact liquidation monitor, or new dependency was added. A synchronous state update in `local-receipt-client.tsx` was replaced with keyed receipt-context state after lint flagged the first approach.
### human review notes:
Review the summary priority order: account mismatch, position changes, liquidation watch, risk worsened/improved, account-history watch, funding watch, market moved, then little changed. Review whether the review-point copy is clear enough for hiring-manager demos and whether account-value context should stay optional when the portfolio history request is unavailable.
### tests/checks run:
- `npm test` passed: 67 tests, 67 passing.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed and listed `/api/hyperliquid/portfolio`, `/api/hyperliquid/snapshot`, `/receipt/[id]`, and `/receipt/local/[id]`.
- `git diff --check` passed.
- Browser verification used the existing dev server on `http://localhost:3000`, pasted `0x102a618b36c32b338c03526255dcf2a39eb1897f`, created `/receipt/local/rr_083fd5da1ef59cf7`, confirmed `Hash verified`, clicked `Recheck live account`, confirmed `Receipt change summary`, `The receipt and live context are close.`, `Market context since receipt`, the sampled account-value review point, and zero console errors.
### remaining risks:
Receipt change summary is a heuristic review layer over other heuristic signals. It depends on live Hyperliquid API availability, localStorage receipt persistence, comparable saved/current snapshots, and optional sampled portfolio context. It is not financial advice, an exact liquidation monitor, or a proof that the saved market state was correct.

### task id: post-t9 receipt risk assistant
### codex mode:
product iteration + implementation
### delegated work:
Researched perps receipt-review context, then added a local receipt-page assistant so a reviewer can ask cited questions after running a live receipt recheck.
### output accepted:
Added `src/lib/assistant/receipt-risk-assistant.ts` with deterministic answer routing, receipt-specific citations, hash-scope explanations, and no-advice guardrails. Added `src/app/receipt/local/[id]/receipt-risk-assistant-panel.tsx` and wired it into local live receipt rechecks after `Receipt change summary`. The panel answers quick prompts for review, market, liquidation, funding, hash, and account history when loaded, plus free-form questions. Updated README, demo script, source notes, limitations, and the knowledge graph.
### output rejected or changed:
No LLM API, API key, backend chat persistence, new endpoint, trading endpoint, wallet/RPC flow, or new dependency was added. Browser verification exposed that the first guardrail treated `What should I review in this receipt?` as advice; the refusal rule was tightened to trade-intent verbs and covered with a regression test.
### human review notes:
Review the receipt assistant's keyword routing and refusal language. In particular, confirm that review/funding/hash/account-history questions stay explanatory while trade-intent questions still refuse clearly.
### tests/checks run:
- `npm test` passed: 76 tests, 76 passing.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed and listed `/api/hyperliquid/portfolio`, `/api/hyperliquid/snapshot`, `/receipt/[id]`, and `/receipt/local/[id]`.
- `git diff --check` passed.
- Browser verification used the existing dev server on `http://localhost:3000`, pasted `0x102a618b36c32b338c03526255dcf2a39eb1897f`, created `/receipt/local/rr_c010ad6fd463f5be`, confirmed `Hash verified`, clicked `Recheck live account`, confirmed `Receipt risk assistant`, clicked `Review`, `Funding`, and `Hash`, asked `Should I increase leverage?`, confirmed the no-advice refusal, and saw zero console errors.
### remaining risks:
Receipt risk assistant is deterministic local explanation logic over visible receipt and recheck fields. It is not a connected LLM, does not reason beyond keyword routing, depends on the local live receipt/recheck context, and must not be treated as financial advice.

### task id: post-t9 portable receipt bundle
### codex mode:
product iteration + implementation
### delegated work:
Researched privacy-aware receipt sharing, then added a portable receipt bundle flow so browser-local live receipts can be reviewed outside the creating browser without backend sync or putting full private trading state onchain.
### output accepted:
Added a versioned portable bundle wrapper around the existing `risk_receipt`, strict local receipt shape validation, full-snapshot privacy preview metadata, and tests for bundle round-trip, invalid envelopes, invalid receipt snapshots, and post-import hash verification. Local live receipt pages now show a `Portable receipt bundle` panel with copy/download JSON actions and a full-snapshot warning. Added `/receipt/import`, which accepts pasted bundles, validates the envelope, recomputes the snapshot hash, previews account/risk/position metadata, and stores verified receipts into the existing local receipt route.
### output rejected or changed:
No backend receipt database, public share URL service, encryption, redacted bundle format, selective disclosure scheme, wallet/RPC flow, new Hyperliquid endpoint, trading endpoint, or new dependency was added. The implementation keeps full private snapshots user-controlled and leaves onchain/EAS fallback metadata minimal.
### human review notes:
Review whether the warning copy is strong enough: the bundle includes account, markets, position sizes, entry/mark/liquidation prices, funding estimates, and risk metrics. Review whether the next privacy step should be a redacted/selective-disclosure bundle instead of improving full-snapshot export.
### tests/checks run:
- `npm test` passed: 81 tests, 81 passing.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed and listed `/receipt/import` as a static route plus `/receipt/local/[id]` as dynamic.
- `git diff --check` passed.
- Browser verification used `http://localhost:3000`, pasted `0x102a618b36c32b338c03526255dcf2a39eb1897f`, clicked `Lookup`, created `/receipt/local/rr_05dffdb4ef7f5354`, confirmed `Hash verified`, `Portable receipt bundle`, the full-export warning, copied the bundle, opened `/receipt/import`, pasted the bundle, confirmed `Import preview` and `Hash verified`, clicked `Import receipt`, landed back on `/receipt/local/rr_05dffdb4ef7f5354`, confirmed the portable panel and local-storage notice still rendered, and saw zero browser console errors.
### remaining risks:
Portable receipt bundles are explicit full-snapshot exports. They are not encrypted, access-controlled, redacted, or selectively disclosed. Imported receipts still live in browser localStorage and are not synced to a backend. The bundle hash verifies snapshot integrity, not the correctness of the original external Hyperliquid data.

### task id: post-t9 redacted receipt share
### codex mode:
product iteration + implementation
### delegated work:
Researched data-minimization and selective-disclosure patterns, then added a redacted receipt share mode so local live receipts can be shared for lightweight review without exposing raw account identifiers or exact position values.
### output accepted:
Added a versioned `perps-risk-receipt.redacted.v1` bundle contract with bucketed account/notional/funding values, disclosed market names, side, notional bucket, liquidation-distance bps, funding bps, optional open-interest bucket, redacted-field metadata, and a clear verification scope. Local live receipt pages now default the portable bundle panel to `Redacted share`, with a `Full receipt` toggle for exact hash recomputation/import. `/receipt/import` now previews redacted bundles as inspect-only and keeps full bundles on the existing hash-verifying import path. Added tests for redacted privacy fields, parser round-trip, redacted preview scope, and malformed redacted bundle rejection. Added source-backed knowledge notes and updated README, demo script, source notes, and limitations.
### output rejected or changed:
No backend share service, encrypted bundle, EAS private-data attestation, Merkle proof, zero-knowledge proof, Verifiable Credential, JSON Web Proof, wallet/RPC flow, new Hyperliquid endpoint, trading endpoint, or new dependency was added. The redacted bundle preserves the original snapshot hash as a reference only; the hidden full snapshot is required to recompute that hash.
### human review notes:
Review whether the disclosed fields are the right privacy line: risk score, risk label, freshness, timestamps, bucketed account/notional/funding values, market names, side, notional buckets, liquidation-distance bps, funding bps, and open-interest buckets. Review whether `$0-$1k`, `$1k-$10k`, `$10k-$50k`, `$50k-$100k`, `$100k-$250k`, `$250k-$1m`, and `$1m+` buckets are coarse enough for public sharing.
### tests/checks run:
- `npm test` passed: 85 tests, 85 passing.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed and listed `/receipt/import` as a static route plus `/receipt/local/[id]` as dynamic.
- `git diff --check` passed.
- Browser verification used `http://localhost:3000`, pasted `0x102a618b36c32b338c03526255dcf2a39eb1897f`, created `/receipt/local/rr_866402e16069cc3f`, confirmed `Portable receipt bundle`, default `redacted summary`, `Copy redacted share`, and absence of the raw account in the redacted clipboard payload, opened `/receipt/import`, pasted the redacted bundle, confirmed `Redacted share preview`, `Snapshot hash reference`, the inspect-only warning, and no `Import receipt` button. Browser verification then switched to `Full receipt`, copied the full bundle, pasted it into `/receipt/import`, confirmed `Import preview` and `Hash verified`, clicked `Import receipt`, returned to `/receipt/local/rr_866402e16069cc3f`, confirmed `Hash verified` and the redacted default still rendered, and saw zero browser console errors.
### remaining risks:
Redacted shares are minimized offchain JSON summaries, not cryptographic selective-disclosure proofs. They cannot recompute the original snapshot hash without the hidden full snapshot and cannot support live account recheck, EAS payload generation, full local import, or receipt assistant context by themselves. Full bundles still disclose private snapshot data and remain browser-local after import.

### task id: post-t9 redacted market context
### codex mode:
product iteration + implementation
### delegated work:
Researched public Hyperliquid market context, then added a market-only comparison panel for imported redacted receipt shares so reviewers can inspect current mark, funding, open interest, and day-volume context without a raw account address or hidden full snapshot.
### output accepted:
Added a read-only `/api/hyperliquid/markets` route that only calls the Hyperliquid `metaAndAssetCtxs` info endpoint for disclosed markets. Extended the Hyperliquid adapter with market-context mapping and tests. Added `src/lib/market/redacted-market-context.ts` with deterministic funding-delta summaries and tests. `/receipt/import` now lets a redacted bundle load current public market context, shows matched-market count, current mark/oracle, funding now versus funding at receipt, funding delta, open interest, day notional volume, and an explicit note that saved mark, exact size, account, PnL, and exact funding dollars remain hidden. Fixed signed-bps formatting so rounded zero renders as `0 bps` instead of `-0.00 bps`. Updated README, demo script, source notes, known limitations, and knowledge docs.
### output rejected or changed:
No raw account lookup, full-snapshot import, backend receipt store, websocket, strategy recommendation, exchange/trading endpoint, wallet/RPC flow, new dependency, or exact saved-mark comparison was added for redacted shares.
### human review notes:
Review whether the 1 bps funding-delta threshold is the right bar for "more expensive" or "more favorable." Review the maximum of 20 requested markets, the `*-PERP` market validation, and whether showing exact current public open interest/day volume is acceptable for redacted-share demos.
### tests/checks run:
- `npm test` passed: 90 tests, 90 passing.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed and listed `/api/hyperliquid/markets`.
- `git diff --check` passed.
- Browser verification used `http://localhost:3000/receipt/import`, pasted a handcrafted redacted bundle with disclosed `ETH-PERP` and `BTC-PERP` rows, clicked `Load current markets`, confirmed `Current market context`, current mark, funding now, funding at receipt, open interest, matched `2/2 markets`, no raw account, no `Import receipt` button, and zero browser console errors.
### remaining risks:
Redacted market context depends on Hyperliquid API availability and the `metaAndAssetCtxs` response shape. It is current public market context only, not a proof of the hidden receipt state, exact account-equity comparison, PnL comparison, exact size comparison, live risk monitor, or financial advice.

### task id: post-t9 redacted market trend history
### codex mode:
product iteration + implementation
### delegated work:
Researched Hyperliquid `candleSnapshot`, `fundingHistory`, and rate-limit docs, sampled live response shapes, then added a 24h market-history panel for imported redacted receipt shares.
### output accepted:
Extended the Hyperliquid adapter with typed candle/funding-history mapping and a read-only `fetchHyperliquidMarketHistory` function. Added `/api/hyperliquid/market-history`, capped at five disclosed `*-PERP` markets, using fixed 24h one-hour candles and funding history without a user address. Added `src/lib/market/redacted-market-trend.ts` with tested labels for adverse price trend, persistent funding cost, persistent funding credit, and no-history states. `/receipt/import` now shows a `24h market trend` panel for redacted shares with a close-price sparkline, 24h price change, high/low range, average side-adjusted funding, latest side-adjusted funding, matched-market count, and privacy-scope copy. Updated README, demo script, source notes, known limitations, and knowledge docs.
### output rejected or changed:
No raw account lookup, trading/exchange endpoint, websocket, chart dependency, backend receipt store, exact saved-mark comparison, recommendation logic, or full-snapshot import path was added for redacted shares. The lookup is intentionally capped because `candleSnapshot` and `fundingHistory` have additional response-size rate weights.
### human review notes:
Review the thresholds: adverse price trend at 2% in the disclosed side's liquidation direction, persistent funding cost/credit at 1 bps average and latest side-adjusted funding. Review whether the five-market cap and fixed 24h/1h window are right for demos.
### tests/checks run:
- `npm test` passed: 96 tests, 96 passing.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed and listed `/api/hyperliquid/market-history`.
- `git diff --check` passed.
- Browser verification used `http://localhost:3000/receipt/import`, pasted a redacted bundle with disclosed `ETH-PERP` and `BTC-PERP`, clicked `Load current markets`, confirmed current market context matched `2/2` markets, clicked `Load 24h trends`, confirmed `24h close path`, `24h price`, `Avg funding`, `Latest funding`, matched `2/2` markets, no raw account, no `Import receipt` button, and zero browser console errors.
### remaining risks:
Redacted market trend depends on Hyperliquid API availability and the `candleSnapshot` / `fundingHistory` response shapes. It is public market history only, not proof of the hidden receipt state, exact saved mark, exact account equity, exact liquidation behavior, or financial advice.

### task id: post-t9 redacted market watchlist
### codex mode:
product iteration + implementation
### delegated work:
Turned the "what is valuable in the current market?" product question into a redacted-share review watchlist that synthesizes disclosed receipt fields with loaded public current-market and 24h trend context.
### output accepted:
Added `src/lib/market/redacted-market-watchlist.ts` with deterministic high/watch/info cues for thin or tight disclosed liquidation distance, adverse 24h trend for the disclosed side, persistent side-adjusted funding cost, current funding that is more expensive than the receipt, public high/low range versus disclosed buffer, missing current market context, and missing 24h history. Added focused tests covering tight-buffer adverse trends, combined persistent/current funding cost, missing public data, and pre-load empty state. `/receipt/import` now renders a `Review watchlist` panel for redacted shares with counts, severity labels, details, and review points. Updated source notes, knowledge graph, README, demo script, limitations, and handoff.
### output rejected or changed:
No new endpoint, raw account lookup, trading/exchange endpoint, websocket, alerting system, strategy recommendation, chart dependency, wallet/RPC flow, backend store, exact liquidation monitor, or cryptographic proof was added. The first test expectation overcounted high-severity cues by treating a tight liquidation buffer as high instead of watch; it was corrected to match the intended threshold contract.
### human review notes:
Review the watchlist thresholds: thin disclosed liquidation distance `<= 500` bps, tight disclosed liquidation distance `<= 1000` bps, material adverse 24h move at `2%`, material funding cost/delta at `1` bps, and high public range at `8%` or at least half of disclosed liquidation distance. Review whether the panel copy should say "trading recommendation" or use softer "not an instruction" wording for demos.
### tests/checks run:
- `npm test` passed: 100 tests, 100 passing.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed and listed `/receipt/import`, `/api/hyperliquid/markets`, and `/api/hyperliquid/market-history`.
- `git diff --check` passed.
- Browser verification used `http://localhost:3000/receipt/import`, pasted a redacted bundle with disclosed `ETH-PERP` and `BTC-PERP`, clicked `Load current markets`, clicked `Load 24h trends`, confirmed `Review watchlist`, high/watch/info counts, high ETH cues, no raw account, no `Import receipt` button, and zero browser console errors.
### remaining risks:
The watchlist is heuristic public-context triage over disclosed redacted fields. It cannot prove hidden receipt state, recompute the snapshot hash, compare hidden saved marks or exact sizes, monitor exact liquidation state, or replace a full trusted receipt bundle/live recheck.

### task id: post-t9 position risk drivers
### codex mode:
product iteration + implementation
### delegated work:
Researched liquidation, leverage, funding, mark-price, and perp risk-management sources, then added a dashboard triage panel that explains which open positions are driving account risk.
### output accepted:
Added `src/lib/risk/position-risk-drivers.ts` with transparent component scoring for listed liquidation buffer, notional exposure/concentration, positive funding burden, and unrealized loss. Added tests for near-liquidation ranking, gross exposure/concentration, largest positive funding cost, no-position state, and zero-account-value safety. Added `src/app/position-risk-drivers-panel.tsx` and mounted it on the dashboard before the detailed liquidation/funding panels. The panel shows top driver, gross exposure, largest position share, directional bias, net directional notional, top driver cards, component scores, and a no-advice caveat. Updated source notes, limitations, knowledge graph, README, demo script, and this handoff.
### output rejected or changed:
No new endpoint, trading/exchange endpoint, wallet/RPC flow, exact Hyperliquid liquidation formula, margin-tier model, backend persistence, alerting, chart dependency, or strategy recommendation was added. The first scoring implementation accidentally let component scores exceed their documented weights; tests exposed that and the component caps were fixed.
### human review notes:
Review the component weights: listed liquidation buffer up to 45 points, notional exposure/concentration up to 25 points, positive daily funding burden up to 20 points, and unrealized loss burden up to 10 points. Review whether single-position accounts should show notional concentration as strongly as multi-position books.
### tests/checks run:
- `node --test src/lib/risk/position-risk-drivers.test.ts` passed: 5 tests, 5 passing.
- `npm test` passed: 105 tests, 105 passing.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed and listed `/` plus existing API/receipt routes.
- `git diff --check` passed.
- Browser verification used `http://localhost:3000`, selected `demo-near-liquidation-btc-short`, confirmed `Position risk drivers`, `BTC-PERP · 77`, gross exposure `2.24x`, directional bias `net short`, components `L 42 · N 25 · F 0 · PnL 10`, the no-advice caveat, and zero browser console errors.
### remaining risks:
Position risk drivers are heuristic triage over the loaded snapshot. They do not prove protocol-official risk attribution, exact liquidation state, cross-margin behavior, maintenance tiers, liquidity effects, funding settlement, or what a trader should do next.

### task id: post-t9 receipt risk-driver comparison
### codex mode:
product iteration + implementation
### delegated work:
Turned the "what is valuable in the current market?" product question into a local receipt recheck panel that compares saved receipt risk drivers with fresh live risk drivers.
### output accepted:
Added `src/lib/receipts/receipt-risk-driver-comparison.ts`, a pure comparison module that reuses `buildPositionRiskDrivers` for saved and current snapshots. It labels no-live, account mismatch, position changes, driver worsened, driver improved, driver changed, and little-changed states; surfaces saved/current top driver, score delta, gross exposure delta, largest-position-share delta, closest listed-buffer delta, net directional delta, daily funding delta, review points, and per-market driver rows. Added tests for no-live, tighter/wider listed buffer, position changes, account mismatch, and top-driver handoff. Local live receipt rechecks now render `Risk drivers since receipt` after `Receipt change summary`. Updated source notes, limitations, README, demo script, knowledge graph, and this handoff.
### output rejected or changed:
No new endpoint, dependency, trading/exchange endpoint, wallet/RPC flow, backend store, exact Hyperliquid liquidation formula, alerting, LLM call, or data model change was added. The first top-driver-handoff test fixture did not actually change the lead driver; focused testing exposed that, and the fixture was corrected while keeping the production rule unchanged.
### human review notes:
Review the comparison thresholds: material driver-score movement at 10 points, listed-buffer movement at 500 bps, and daily funding movement at 1 USD/day. Review whether the receipt assistant should cite `Risk drivers since receipt` directly in a later slice, and whether the no-position live-account case is the right demo target for local smoke tests.
### tests/checks run:
- `node --test src/lib/receipts/receipt-risk-driver-comparison.test.ts` passed: 7 tests, 7 passing.
- `npm test` passed: 112 tests, 112 passing.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed and listed `/receipt/local/[id]` plus existing receipt/API routes.
- `git diff --check` passed.
- Browser verification used `http://localhost:3000`, pasted `0x102a618b36c32b338c03526255dcf2a39eb1897f`, created `/receipt/local/rr_b1431ac476135441`, confirmed `Hash verified`, clicked `Recheck live account`, confirmed `Receipt change summary`, `Risk drivers since receipt`, `Saved top`, `Current top`, `Score delta`, `No material risk-driver changes crossed the current app thresholds.`, `Market context since receipt`, and zero browser console errors.
### remaining risks:
Receipt risk-driver comparison is heuristic saved-vs-live attribution over normalized snapshot fields. It is not Hyperliquid's official liquidation engine, does not model margin tiers, liquidity, exact cross-margin behavior, or funding settlement, and cannot compare changed positions as the same risk object. It is descriptive review context only, not financial advice.
