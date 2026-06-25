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
   - Show `Liquidation buffer ladder`.
   - Point out that BTC-PERP has the closest listed buffer, the adverse move percent, and approximate PnL distance to listed liquidation.
   - Open the position row mentally: market, side, size, entry, mark, liquidation price, distance, unrealized PnL, funding, and plain-English note.

4. Use the scenario simulator.
   - Show the six fixed moves: `-10%`, `-5%`, `-2%`, `+2%`, `+5%`, and `+10%`.
   - Point out estimated account value, estimated PnL change, liquidation flags, and risk score after each move.

5. Select `demo-mixed-book`.
   - Show that long, short, and missing-liquidation positions can exist in one normalized snapshot.
   - Point out that missing liquidation price does not break aggregate risk calculation.
   - Show `Funding carry watch`.
   - Point out net daily funding, 30-day estimate, daily burden, largest cost, and largest earn.
   - Explain that the estimate assumes current funding and notional stay unchanged.

6. Use the risk assistant.
   - Click `Liquidation` and show the assistant explains the closest listed liquidation distance with snapshot-field citations.
   - Ask `Should I close this long?` and show that the assistant refuses trade recommendations while still explaining the current signals.
   - Point out that this is a local deterministic assistant in this build, not a connected LLM.

7. Create a fixture receipt.
   - Click `Create receipt`.
   - Show receipt id, account, protocol, timestamps, risk score, summary metrics, and market summary.
   - Show `Snapshot hash`, expected hash, recomputed hash, and `Hash verified`.

8. Show EAS fallback.
   - Show Sepolia chain id, EAS contract, SchemaRegistry contract, schema, encoded data, and manual steps.
   - Explain that this is the fallback path, not a submitted transaction.

9. Optional live lookup.
   - Paste a valid Hyperliquid address.
   - Show loading, live/stale freshness, source, no-open-positions handling if applicable, and graceful API error behavior if the endpoint is unavailable.
   - Show `Account value history`.
   - Point out sampled account value, period change, current drawdown, max drawdown, PnL history, and volume.
   - Click `Create local receipt`.
   - Show that the live receipt page has a snapshot hash, hash verification, and market summary.
   - Show `Portable receipt bundle`.
   - Point out that redacted share mode is the default for lightweight/public review: it hides raw account and exact position values, keeps the risk score, timestamp, market list, bucketed values, and original snapshot hash reference.
   - Click `Copy redacted share`, open `/receipt/import`, paste the bundle, and show the redacted preview.
   - Point out that the redacted preview cannot recompute the hidden full snapshot hash, so it is for minimized review rather than full verification.
   - Click `Load current markets`.
   - Point out current mark price, side-adjusted funding, open interest, and the note that the lookup uses public market data without a raw account address.
   - Return to the local receipt, switch to `Full receipt`, click `Copy full bundle`, open `/receipt/import`, paste the bundle, and show the import preview with `Hash verified`.
   - Click `Import receipt` and show that the app opens the same local receipt route in this browser.
   - Show `Receipt account-value context`.
   - Point out receipt value, nearest sampled account value, sample gap, latest sampled value, receipt drawdown, current drawdown, and max drawdown.
   - Click `Recheck live account`.
   - Show `Receipt change summary`.
   - Point out that it combines account match, position state, liquidation buffer movement, funding changes, market movement, and sampled account-value context.
   - Show `Receipt risk assistant`.
   - Click `Review`, `Funding`, and `Hash` to show cited answers from the receipt summary, live recheck, funding delta, and snapshot hash.
   - Ask `Should I increase leverage?` and show that it refuses trade recommendations while still explaining receipt signals.
   - Show saved-vs-current risk score, margin usage, liquidation distance, funding, mark movement, and position-state comparison.
   - Show `Market context since receipt`.
   - Point out saved mark price vs current mark price, whether the move is toward or away from liquidation, 8-hour funding change, and open-interest change.
   - Point out that live receipts are stored locally and move across browsers only when the user explicitly exports/imports a portable bundle.

10. Close with evidence.
   - Mention `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.
   - Open `docs/ai-build-log.md` to show the task-by-task build evidence and human review points.

## exact resume bullet

Built a fixture-first Perp Risk Receipt app in Next.js/TypeScript with tested risk math, live account-value history, portable full/redacted receipt bundles, redacted-share market context, receipt change summaries, receipt account-history context, receipt risk assistant, liquidation buffer ladder, funding carry watch, receipt live rechecks with market context, scenario simulation, deterministic snapshot hashing, guarded risk-assistant chat, read-only Hyperliquid lookup, and documented EAS Sepolia attestation fallback.
