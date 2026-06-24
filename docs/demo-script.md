# demo script

## setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## 5-minute walkthrough

1. Start on the dashboard.
   - Point out that the app is read-only.
   - Point out that fixture data is loaded first so the demo works without any external service.

2. Select `demo-safe-eth-long`.
   - Show account value, margin usage, total notional, minimum liquidation distance, daily funding, 30-day funding, data source, and timestamp.
   - Explain that positive funding means estimated user cost.

3. Select `demo-near-liquidation-btc-short`.
   - Show the critical risk label.
   - Open the position row mentally: market, side, size, entry, mark, liquidation price, distance, unrealized PnL, funding, and plain-English note.

4. Use the scenario simulator.
   - Show the six fixed moves: `-10%`, `-5%`, `-2%`, `+2%`, `+5%`, and `+10%`.
   - Point out estimated account value, estimated PnL change, liquidation flags, and risk score after each move.

5. Select `demo-mixed-book`.
   - Show that long, short, and missing-liquidation positions can exist in one normalized snapshot.
   - Point out that missing liquidation price does not break aggregate risk calculation.

6. Create a fixture receipt.
   - Click `Create receipt`.
   - Show receipt id, account, protocol, timestamps, risk score, summary metrics, and market summary.
   - Show `Snapshot hash`, expected hash, recomputed hash, and `Hash verified`.

7. Show EAS fallback.
   - Show Sepolia chain id, EAS contract, SchemaRegistry contract, schema, encoded data, and manual steps.
   - Explain that this is the fallback path, not a submitted transaction.

8. Optional live lookup.
   - Paste a valid Hyperliquid address.
   - Show loading, live/stale freshness, source, no-open-positions handling if applicable, and graceful API error behavior if the endpoint is unavailable.
   - Point out that live lookup is dashboard-only in this build: arbitrary live receipts are not persisted or shareable yet.

9. Close with evidence.
   - Mention `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.
   - Open `docs/ai-build-log.md` to show the task-by-task build evidence and human review points.

## exact resume bullet

Built a fixture-first Perp Risk Receipt app in Next.js/TypeScript with tested risk math, scenario simulation, deterministic snapshot hashing, shareable receipt pages, read-only Hyperliquid lookup, and documented EAS Sepolia attestation fallback.
