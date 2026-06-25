# Perp Risk Receipt

Perp Risk Receipt is a read-only risk dashboard for perpetual positions. It normalizes account snapshots, explains liquidation and funding exposure, runs simple price scenarios, and creates a verifiable receipt with a canonical snapshot hash.

The project is built as a one-day, fixture-first portfolio demo for serious onchain financial UX. It does not trade, place orders, ask for private keys, or claim that its risk score is official protocol risk.

## What The Demo Shows

- Three fixture accounts: safe ETH long, near-liquidation BTC short, and a mixed multi-position book.
- Account-level risk metrics: account value, margin used, margin usage, total notional, minimum liquidation distance, daily funding, 30-day funding, risk score, source, freshness, and data timestamp.
- Position-level risk notes for liquidation distance and funding direction.
- Six scenario moves: `-10%`, `-5%`, `-2%`, `+2%`, `+5%`, and `+10%`.
- Deterministic fixture receipt pages with snapshot hash verification.
- Browser-local receipt pages for live Hyperliquid lookups.
- Live receipt recheck that compares a saved receipt against a fresh read-only Hyperliquid snapshot.
- Guarded local risk assistant chat that explains the loaded snapshot and refuses trade recommendations.
- Read-only Hyperliquid address lookup through `POST /info`.
- EAS Sepolia fallback payload and manual attestation steps.

## Architecture

- `src/app/page.tsx` loads fixture snapshots and deterministic fixture receipt routes.
- `src/app/dashboard-client.tsx` renders the dashboard, address lookup states, position table, scenario simulator, and fixture receipt link.
- `src/app/risk-assistant-panel.tsx` renders the local assistant chat for the selected snapshot.
- `src/app/api/hyperliquid/snapshot/route.ts` validates addresses and calls the read-only Hyperliquid adapter.
- `src/app/receipt/[id]/page.tsx` renders deterministic fixture receipts, recomputes the snapshot hash, and shows the EAS fallback payload.
- `src/app/receipt/local/[id]/page.tsx` renders browser-local live receipts created from pasted Hyperliquid addresses and supports live rechecks.
- `src/lib/perps/types.ts` defines the normalized snapshot, position, scenario, and receipt models.
- `src/lib/perps/fixtures.ts` contains the demo account snapshots.
- `src/lib/risk/risk-engine.ts` contains pure risk math.
- `src/lib/assistant/risk-assistant.ts` contains dependency-free assistant response logic and guardrails.
- `src/lib/receipts/receipt.ts` contains canonical JSON serialization, hashing, deterministic IDs, and verification.
- `src/lib/receipts/snapshot-comparison.ts` compares saved receipt snapshots against fresh live snapshots.
- `src/lib/hyperliquid/adapter.ts` maps Hyperliquid `info` responses into the normalized model.
- `src/lib/eas/attestation.ts` builds the minimal EAS Sepolia fallback payload.

## Risk Score

The risk score is heuristic and intentionally simple:

- Margin usage contributes up to 40 points.
- Liquidation distance contributes up to 50 points.
- Positive daily funding burden contributes up to 10 points.
- Zero or negative account value returns 100.

Labels are `low`, `medium`, `high`, and `critical`. The score is for UX review and comparison only; it is not Hyperliquid's liquidation logic and is not financial advice.

## Data And Protocol Assumptions

- Fixture data is the default source so the app is demoable without external services.
- Hyperliquid live lookup uses read-only `POST https://api.hyperliquid.xyz/info` calls only.
- No exchange/trading endpoints are used.
- Live response shapes and mappings are documented in `docs/source-notes.md`.
- EAS support is a fallback payload and manual Sepolia flow, not an in-app wallet transaction.
- The EAS payload hashes account/protocol identifiers instead of placing raw account identifiers onchain.
- The risk assistant is local and deterministic in this build; it does not call an LLM API.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Checks

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm audit --audit-level=moderate
```

`npm audit --audit-level=moderate` currently reports a known `postcss` advisory through Next. The suggested npm force fix would install a breaking/incorrect Next version, so it is documented instead of force-applied.

## Demo Flow

Use `docs/demo-script.md` for the reviewer-facing script. The short version:

1. Open the dashboard.
2. Switch between fixture accounts.
3. Explain account risk, position risk, funding direction, and scenarios.
4. Ask the risk assistant about liquidation, funding, and whether it can recommend a trade.
5. Create a fixture receipt.
6. Open the receipt page and show hash verification.
7. Show the EAS fallback payload and documented manual attestation steps.
8. Optionally paste a Hyperliquid address, create a local live receipt, run `Recheck live account`, and show that hash verification still works while the app compares the saved receipt with current live state.

## Known Limitations

See `docs/known-limitations.md` for the current list. The major limitations are:

- Live Hyperliquid receipts are stored in browser localStorage only and are not synced/shareable across devices.
- Live receipt recheck compares the saved receipt to a fresh snapshot but is not an exact liquidation monitor.
- Risk assistant responses are deterministic explanations of loaded fields, not financial advice or LLM reasoning.
- EAS schema registration and attestation transactions are not sent by the app.
- Scenario results apply the same percentage move to every position.
- Liquidation distance and risk score are heuristic and not exchange-official.

## Source Of Truth Docs

- `AGENTS.md`
- `docs/product-spec.md`
- `docs/task-board.md`
- `docs/ai-build-log.md`
- `docs/known-limitations.md`
- `docs/source-notes.md`
- `docs/session-handoff.md`

## Resume Bullet

Built a fixture-first Perp Risk Receipt app in Next.js/TypeScript with tested risk math, scenario simulation, deterministic snapshot hashing, guarded risk-assistant chat, read-only Hyperliquid lookup, and documented EAS Sepolia attestation fallback.
