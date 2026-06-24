
## step 1 task board

use this as `docs/task-board.md`.

| id | task | acceptance criteria | timebox |
|---|---|---:|---:|
| t0 | repo setup | next.js/typescript app running, lint/test command works | 45 min |
| t1 | agent rules | `AGENTS.md`, `docs/product-spec.md`, `docs/ai-build-log.md`, pr template created | 30 min |
| t2 | fixtures + types | 3 demo fixtures, normalized types, fixture loader | 45 min |
| t3 | risk engine | formulas implemented, unit tests cover long/short/liquidation/funding/scenarios | 90 min |
| t4 | dashboard ui | account cards, position table, risk labels, loading/error/empty states | 2 hr |
| t5 | scenario simulator | 6 price moves, liquidation flags, scenario account value | 1 hr |
| t6 | receipt system | canonical json hash, receipt creation, receipt detail page, verification state | 90 min |
| t7 | hyperliquid adapter | live address lookup works or fails gracefully into documented fixture mode | 90 min |
| t8 | eas attestation | schema/attestation flow works on testnet, or documented fallback exists | 2 hr |
| t9 | review + evidence | codex review, tests/lint pass, build log updated, readme + demo script done | 90 min |

cut rule: if t4 is not done by midpoint, skip live hyperliquid until the end. a polished fixture-based demo with tests + receipt is better than a broken live-data app.

## codex prompt

openai docs say codex reads `AGENTS.md` before work, subagents only run when explicitly requested, and codex can be used for code review and test/check workflows when instructed clearly. use that to make the repo show disciplined ai-native engineering, not just generated code. :contentReference[oaicite:3]{index=3} :contentReference[oaicite:4]{index=4} :contentReference[oaicite:5]{index=5}

copy this into codex:

```text
you are my codex staff engineer and build lead. i need to ship “perp risk receipt” in one day.

goal:
build a small full-stack onchain-adjacent perp risk project that is good enough to show on a resume and in a demo. the project must prove disciplined ai-native engineering: scoped agent tasks, fixture-first development, tested risk math, human review gates, error states, and a public ai-build log.

first, read:
- docs/product-spec.md
- docs/task-board.md

if either file is missing, stop and tell me exactly what to create before coding. do not invent a different product.

core mvp:
- next.js/react/typescript app
- 3 fixture demo accounts
- normalized perp snapshot model
- risk engine with tests
- dashboard page
- scenario simulator
- receipt creation
- receipt page
- canonical snapshot hash verification
- hyperliquid adapter only after fixture mvp works
- eas testnet attestation if the core app is stable
- ai-build-log.md updated throughout

hard rules:
- no trading
- no order placement
- no private keys in code
- no financial advice language
- no exact claims that the risk score is official protocol risk
- correctness over polish
- tests before or alongside risk logic
- small diffs
- ask before adding heavy dependencies
- keep protocol-specific assumptions isolated
- every page must have loading, empty, error, and stale-data behavior where relevant
- every external api response needs a fixture or mock
- every risk formula needs tests

your workflow:

1. plan only first.
   inspect the repo and produce a short implementation plan mapped to t0–t9. do not edit files until i approve.

2. create project instructions.
   create or update `AGENTS.md` with:
   - project rules
   - definition of done
   - testing commands
   - style rules
   - risk math rules
   - ai workflow rules
   - no private key/no trading constraints

3. create build evidence files.
   create:
   - docs/ai-build-log.md
   - docs/source-notes.md
   - docs/known-limitations.md
   - .github/pull_request_template.md if github folder exists

4. fixture-first implementation.
   before live api work, implement fixtures and normalized types. add tests for the risk engine before implementing or alongside implementation.

5. risk engine.
   implement:
   - notional
   - unrealized pnl
   - margin usage bps
   - liquidation distance bps
   - daily funding usd
   - 30-day funding usd
   - scenario pnl
   - scenario liquidation flags
   - heuristic risk score
   - risk label

   tests must include:
   - safe eth long
   - near-liquidation btc short
   - mixed multi-position book
   - missing liquidation price
   - zero/negative account value
   - negative funding means user earns
   - positive funding means user pays
   - long scenario crosses liquidation
   - short scenario crosses liquidation

6. ui implementation.
   build the dashboard and receipt flow after tests pass. keep ui simple and legible. do not add chart libraries unless necessary.

7. receipt hashing.
   implement canonical json serialization and snapshot hashing. receipt page must recompute and show whether the hash matches.

8. hyperliquid adapter.
   only after fixture mvp works, add a read-only adapter. use docs/source-notes.md for endpoint assumptions. if web access is available, verify current hyperliquid info endpoint docs. if not, ask me to paste relevant docs. do not infer response shapes without fixtures.

9. eas attestation.
   implement the smallest credible eas testnet path:
   - schema constants/config
   - attestation payload encoder
   - wallet-based transaction from frontend if practical
   - store returned uid/tx hash on receipt
   - if blocked by rpc/faucet/network setup, document exact fallback and keep snapshot hash working

10. review gate.
   after each major task, run:
   - tests
   - lint
   - typecheck if available
   - build if time allows

   then summarize:
   - files changed
   - tests run
   - failures fixed
   - human review points
   - remaining risks

11. subagent review.
   if codex subagents are available, spawn separate review agents before finalizing:
   - risk math correctness
   - security/privacy
   - frontend state handling
   - api failure modes
   - test coverage

   wait for all agents and consolidate blockers/non-blockers. if subagents are not available, perform these as separate review passes yourself.

12. final delivery.
   produce:
   - readme
   - demo script
   - architecture summary
   - known limitations
   - resume bullet
   - list of commands to run locally
   - final ai-build-log.md entry with what codex generated, what was rejected, what i reviewed, and what tests prove

interaction style:
- guide me one task at a time
- do not dump huge diffs without explanation
- ask for approval before major architecture changes
- when something is ambiguous, choose the simplest shippable path and explain the tradeoff
- keep the mvp moving; do not over-engineer

start now by inspecting the repo and giving me the t0–t9 implementation plan only. do not edit files yet.
