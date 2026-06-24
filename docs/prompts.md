

repo files → task wrapper → readback → approval → implementation → tests → build log → review → commit

use this as your first codex prompt:

```text
read AGENTS.md, docs/product-spec.md, and docs/task-board.md.

before doing any coding, confirm the repo instruction chain by returning:

1. the project goal in one sentence
2. the hard constraints you must follow
3. the current t0–t9 task board summary
4. the exact files you will use as source of truth
5. the first task you recommend starting with

do not edit files yet.

task: t[number] — [task name]

before editing files:

1. read AGENTS.md
2. read docs/product-spec.md
3. read docs/task-board.md
4. read docs/ai-build-log.md
5. read docs/known-limitations.md
6. read docs/source-notes.md if this touches hyperliquid, eas, viem, wagmi, or protocol assumptions

then respond with:

- task id
- relevant acceptance criteria from docs/task-board.md
- relevant product-spec sections
- files you expect to change
- tests/checks you expect to run
- risks or assumptions

do not code until i say “proceed.”

run the task closeout.

1. run relevant tests/checks
2. inspect the diff
3. verify the implementation against AGENTS.md and docs/product-spec.md
4. update docs/ai-build-log.md with:
   - task id
   - what codex generated
   - what was rejected or changed
   - human review points
   - tests/checks run
   - remaining risks
5. update docs/known-limitations.md if needed
6. give me a merge/no-merge recommendation

review this branch with parallel subagents.

spawn one subagent for each:

1. risk math correctness
2. security and privacy
3. frontend state handling
4. api failure modes
5. test coverage

wait for all subagents, then return:

- blockers
- non-blockers
- file references
- suggested fixes
- whether this is safe to merge

use the $perp-risk-receipt skill.

read:
- AGENTS.md
- docs/product-spec.md
- docs/task-board.md
- docs/session-handoff.md
- docs/ai-build-log.md
- docs/known-limitations.md

then summarize:
1. current objective
2. completed tasks
3. active task
4. next recommended action
5. files you expect to touch
6. checks you will run

do not edit files yet.

close out this task.

run relevant checks, inspect the diff, then update:
- docs/ai-build-log.md
- docs/session-handoff.md
- docs/known-limitations.md if needed

in docs/session-handoff.md, include:
- completed task
- current repo state
- files changed
- tests/checks run
- blockers
- exact next recommended action

then give me a merge/no-merge recommendation.