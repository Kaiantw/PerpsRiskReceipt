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
   - Show `Position risk drivers`.
   - Point out the top driver score, gross exposure, largest position share, directional bias, and the visible score components for listed buffer, notional, funding, and unrealized loss.
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
   - Point out next hourly funding, 8-hour rate-basis funding, net daily funding, 30-day estimate, hourly burden, largest cost, and largest earn.
   - Explain that the estimate assumes current funding and notional stay unchanged.
   - Show `Recent funding persistence`.
   - Click `Load 24h funding` and point out whether the public funding-history points show persistent cost, recent cost, persistent credit, mixed funding, neutral funding, or no history.
   - Explain that positive side-adjusted funding means cost to the current side and that this is public market history, not a private user funding ledger.

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
   - Click `Load 24h trends`.
   - Point out the close-price sparkline, 24h price move, high/low range, average funding, latest funding, and that this uses public candle/funding history only.
   - Show `Review watchlist`.
   - Point out high/watch/info cues for thin or tight disclosed buffers, adverse public trend, persistent or more expensive funding, public range versus disclosed buffer, and missing market context.
   - Explain that the watchlist helps a reviewer decide what to inspect first, but it does not prove hidden receipt state or recommend trades.
   - Show `Freshness verdict`.
   - Point out whether the redacted receipt is `reviewable`, `stale but informative`, or `needs full recheck`.
   - Explain that the verdict combines receipt age, disclosed liquidation buffer, loaded public current context, 24h trend, funding movement, and watchlist severity without exposing hidden account fields.
   - Show `Redacted review sensitivity`.
   - Switch between `Strict`, `Standard`, and `Relaxed`.
   - Point out that the app is not trying to make the old receipt live; it is tuning how quickly public age, buffer, adverse move, funding, and range cues should make the reviewer ask for a full recheck.
   - Point out that the sensitivity profile updates the watchlist, freshness verdict, comparison read, assistant answers, and copied packet without changing the receipt hash or bundle contents.
   - Show `Redacted snapshot compare`.
   - Paste a second redacted share and point out previous/latest receipt ids, risk score delta, changed cue counts, redacted-only freshness movement, disclosed buffer movement, funding bucket movement, and market rows that were added, removed, improved, worsened, or changed.
   - Explain that this is useful for privacy-preserving review of visible risk cues over time, but it cannot prove hidden exact account values changed or recompute the full snapshot hash.
   - Show `Redacted share assistant`.
   - Click `Thresholds`, `Compare`, `Freshness`, `Current`, `24h Trend`, `Watchlist`, `Top Cue`, `Funding`, and `Privacy` to show cited answers from disclosed fields, loaded public context, active sensitivity, and the loaded redacted comparison.
   - Ask `Should I increase leverage?` and show that it refuses trade recommendations while still explaining visible redacted-share cues.
   - Show `Redacted review packet`, keep `Compact` selected, click `Copy compact markdown`, then click `Download compact .md`, and point out that it creates a short public risk note with the hash reference, active thresholds, freshness verdict, redacted comparison headline, and capped top cues.
   - Switch to `Full`, click `Copy full markdown`, then click `Download full .md`, and point out that the detailed packet adds disclosed market rows, loaded public context rows, threshold detail, comparison detail, watchlist cues, and hash-reference-only caveats without exposing the full snapshot.
   - Point out the `redacted review thresholds` section in the copied packet so another reviewer can see the local sensitivity profile that produced the read.
   - Return to the local receipt, switch to `Full receipt`, click `Copy full bundle`, open `/receipt/import`, paste the bundle, and show the import preview with `Hash verified`.
   - Click `Import receipt` and show that the app opens the same local receipt route in this browser.
   - Show `Receipt account-value context`.
   - Point out receipt value, nearest sampled account value, sample gap, latest sampled value, receipt drawdown, current drawdown, and max drawdown.
   - Click `Recheck live account`.
   - Show `Local recheck history`.
   - Point out the saved-check count, latest recheck timestamp, current risk score, account value, minimum listed buffer, latest snapshot-drift score, drift delta, market-regime label, focus market, top cue, watch cue counts, and whether volatility context was loaded for that history row.
   - Explain that running recheck again adds another compact local row without changing the saved receipt hash.
   - Click `Rechecks` in the receipt assistant, or ask `What does local recheck history show?`, and point out the latest-versus-oldest risk score, snapshot-drift score, regime movement, repeated focus market, watchlist counts, volatility-loaded coverage, and local-only/no-alert caveat.
   - Show `Receipt change summary`.
   - Point out that it combines account match, position state, liquidation buffer movement, funding changes, market movement, and sampled account-value context.
   - Show `Snapshot drift`.
   - Point out the close/drift/stale/not-comparable label, drift score, receipt age, focus market, max mark move, current minimum listed buffer, daily funding delta, and high/watch cue counts.
   - Explain that hash verification can still be valid while the frozen receipt is stale versus current market context.
   - Show `Market regime`.
   - Point out the calm/active/stretched/stress/not-comparable label, focus market, funding burden, sampled drawdown, max mark move, and high/watch/info regime signals.
   - Show `Regime by market`.
   - Point out that the account-level regime label is explained row-by-row with current listed buffer, funding burden, mark movement, volatility status, open-interest movement, and watch cue counts.
   - Show `Risk drivers since receipt`.
   - Point out saved top driver versus current top driver, score delta, gross exposure delta, closest listed-buffer delta, daily funding delta, and the per-market driver table.
   - Explain that this answers what is valuable in the current market: whether the current account is still driven by the same risk, whether the buffer tightened or widened, and whether funding burden changed.
   - Show `Market context since receipt`.
   - Point out saved mark price vs current mark price, whether the move is toward or away from liquidation, 8-hour funding change, and open-interest change.
   - Show `Current funding window`.
   - Point out next hourly net funding, 8-hour rate-basis net funding, hourly burden, largest next cost, largest next earn, and the oracle-price settlement caveat.
   - Show `Recent funding persistence`.
   - Click `Load 24h funding`.
   - Point out focus market, matched markets, history window, average 8-hour funding, latest 8-hour funding, average daily estimate, and whether the funding cost or credit has been persistent.
   - Click `Load 24h volatility`.
   - Show `Volatility buffer`.
   - Point out current listed buffer, public 24h range, hourly ATR-style movement, ATR buffer multiple, and the no-forecast/no-advice caveat.
   - Point out that high/watch volatility rows now feed into `Recheck watchlist`.
   - Show `Review thresholds`.
   - Point out that the reviewer can tune what counts as a thin/tight listed buffer, adverse mark move, driver-score delta, funding delta, or open-interest move for this review.
   - Change `Tight buffer bps` and point out that the watchlist and review packet update without changing the receipt hash or live data.
   - Show `Recheck watchlist`.
   - Point out the high/watch/info counts and the ranked items for position changes, thin listed buffer, volatility-buffer cues, adverse mark movement, higher funding cost, driver-score movement, open-interest movement, or missing market context.
   - Show `Receipt risk assistant`.
   - Click `Review`, `Regime`, `Regime rows`, `Watchlist`, `Volatility`, `Rechecks`, `Drivers`, `Funding`, and `Hash` to show cited answers from the receipt summary, market-regime read, per-market regime rows, ranked recheck watchlist, loaded volatility buffer, local recheck history, risk-driver comparison, live recheck, funding delta, and snapshot hash.
   - Ask `What should I inspect first?` and show that the answer cites `receipt_recheck_watchlist` item fields while preserving the no-trade-recommendation caveat.
   - Show `Review packet`, click `Copy markdown`, click `Download .md`, and point out that it packages the hash, live recheck, snapshot drift, compact local recheck-history and drift trend, market regime, per-market regime rows, current funding window, recent funding persistence, watchlist, active thresholds, loaded volatility buffer, assistant read, driver comparison, and market context for quick review.
   - Point out that the packet includes only the local-history summary, not raw local history rows or full private snapshots.
   - Explain that the review packet is for communication; a full portable receipt bundle is still required when another browser needs to recompute the snapshot hash.
   - Click `Top market` or ask `Why is ETH-PERP the current risk driver?` to show a named-market driver drilldown with saved/current component scores plus mark, listed-buffer, funding, and open-interest context.
   - Ask `Should I increase leverage?` and show that it refuses trade recommendations while still explaining receipt signals.
   - Show saved-vs-current risk score, margin usage, liquidation distance, funding, mark movement, and position-state comparison.
   - Point out that live receipts are stored locally and move across browsers only when the user explicitly exports/imports a portable bundle.

10. Close with evidence.
   - Mention `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.
   - Open `docs/ai-build-log.md` to show the task-by-task build evidence and human review points.

## exact resume bullet

Built a fixture-first Perp Risk Receipt app in Next.js/TypeScript with tested risk math, live account-value history, position risk drivers, saved-vs-live receipt risk-driver comparison with configurable full-recheck watchlists, snapshot-drift freshness reads, local recheck history with drift trends, history-aware assistant and packet reads, market-regime summaries, per-market regime drilldowns and volatility-buffer cues, assistant-cited watchlist/volatility/regime-row reads, copyable/downloadable full receipt review packets and compact/full redacted review packets, redacted freshness verdicts, redacted snapshot comparison, redacted public-only sensitivity profiles, redacted-share assistant answers, market-context drilldowns, portable full/redacted receipt bundles, redacted-share market context, 24h trend history and review watchlist, receipt change summaries, receipt account-history context, receipt risk assistant, liquidation buffer ladder, funding carry watch with next-hour funding-window and recent funding-persistence reads, receipt live rechecks with market context, scenario simulation, deterministic snapshot hashing, guarded risk-assistant chat, read-only Hyperliquid lookup, and documented EAS Sepolia attestation fallback.
