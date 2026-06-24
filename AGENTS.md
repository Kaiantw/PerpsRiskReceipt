# agent instructions for perp risk receipt

## source of truth

before every task, read:

- docs/product-spec.md
- docs/task-board.md
- docs/ai-build-log.md
- docs/known-limitations.md

also read docs/source-notes.md before touching:

- hyperliquid api work
- eas attestation work
- viem/wagmi/onchain code
- external protocol assumptions

do not rely only on chat context. repo files are the source of truth.

## project goal

ship perp risk receipt in one day.

the mvp is a read-only perpetuals risk dashboard with fixture demo accounts, tested risk math, scenario simulation, receipt creation, canonical snapshot hashing, a receipt page, and a credible eas testnet attestation path if time allows.

## hard constraints

- no trading
- no order placement
- no private keys in code
- no financial advice language
- no claims that the risk score is official protocol risk
- no large dependencies without asking first
- correctness over polish
- fixture mvp before live api work
- tests before or alongside risk math
- every page needs loading, empty, error, and stale-data behavior where relevant
- every external api response needs a fixture or mock
- every risk formula needs tests

## required task protocol

for every task, before editing files:

1. state the task id from docs/task-board.md
2. restate the relevant acceptance criteria
3. list the source files/docs you read
4. list the files you expect to change
5. give a short plan
6. wait for approval if the change affects architecture, dependencies, data model, or onchain behavior

after editing files:

1. run the relevant checks
2. summarize files changed
3. summarize tests added or changed
4. document failures and fixes
5. update docs/ai-build-log.md
6. update docs/known-limitations.md if any limitation changed
7. say what still needs human review

## verification commands

prefer these commands when available:

```bash
npm run lint
npm run typecheck
npm test
npm run build

if a command does not exist, add the smallest reasonable script or explain why it is missing.

definition of done

a task is not done until:

acceptance criteria are met
tests/checks were run or the blocker is documented
docs/ai-build-log.md is updated
risky assumptions are documented
the diff is small enough for human review
review guidelines

when reviewing code, focus on:

wrong decimals
basis point vs percentage mistakes
negative funding direction
missing liquidation price
zero or negative account value
stale market data
api outage states
leaking too much account data onchain
snapshot hash mismatch
private key exposure
financial advice wording