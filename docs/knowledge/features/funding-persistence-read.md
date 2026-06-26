# funding persistence read

## status

Implemented in this slice.

## product idea

Add current-market funding context that answers: "Is the funding cost or credit
I see now a one-off point, or has it repeated through the recent public funding
history?"

## source links

- [[../sources/perp-funding-persistence]]
- [[../sources/perp-funding-window]]
- [[../sources/perp-funding-mechanics]]
- [[funding-window-read]]
- [[funding-carry-watch]]
- [[receipt-risk-assistant]]
- [[receipt-review-packet]]

## implemented behavior

- Adds a pure funding-persistence read over normalized positions and bounded
  Hyperliquid `fundingHistory` market data.
- Side-adjusts public funding history so positive means cost to the current
  position side and negative means funding credit.
- Labels each position as persistent cost, recent cost, persistent credit,
  mixed, neutral, or no history.
- Shows recent funding persistence on the dashboard with a `Load 24h funding`
  action.
- Shows recent funding persistence on local receipt live rechecks by reusing
  the existing public market-history fetch.
- Adds funding-persistence context to receipt assistant funding answers and
  full receipt review packets.

## review guardrails

- Uses read-only Hyperliquid `fundingHistory` only through the existing
  `market-history` route.
- Does not use trading endpoints, predicted funding, private `userFunding`
  history, wallets, backend persistence, or new dependencies.
- Uses public market history only, not exact account settlement history.
- Keeps copy descriptive and no-advice.

## next connected feature

A future slice could add a compact market-momentum overview that combines
volatility buffer, funding persistence, open-interest changes, and mark movement
into a single "what changed in the current market?" checklist.
