# perp risk receipt — 1-day product spec

## product bet

perp users do not need another trading ui. they need a clear, shareable, verifiable snapshot of their risk.

perp risk receipt is a read-only risk dashboard that normalizes perpetual position data, explains liquidation/funding exposure in plain english, runs simple price scenarios, and creates a verifiable receipt for the snapshot.

## mvp promise

a reviewer can:

1. open the app
2. choose a demo account or paste a hyperliquid address
3. see account-level risk
4. inspect position-level liquidation/funding exposure
5. run price scenarios
6. create a risk receipt
7. open a shareable receipt page with:
   - snapshot hash
   - account/protocol/market summary
   - timestamp
   - risk score
   - data freshness state
   - optional eas attestation uid / tx hash

## target user

primary: a crypto product/engineering hiring manager evaluating whether i can build serious onchain financial ux.

secondary: a perp trader who wants a plain-english risk receipt before sharing, reviewing, or archiving a position state.

## non-goals

- no trading
- no order placement
- no strategy recommendations
- no private keys on the server
- no exact clone of hyperliquid liquidation logic
- no multi-protocol support in v0
- no financial advice language
- no storing full private trading state onchain by default

## mvp scope

required:

- next.js/react/typescript app
- fixture-based demo accounts
- hyperliquid read-only adapter if time allows
- normalized account snapshot model
- risk engine with tests
- dashboard page
- scenario simulator
- receipt creation
- receipt detail page
- snapshot hash verification
- ai-build-log.md
- clear readme with architecture, assumptions, limitations, tests, and demo steps

onchain requirement:

- preferred: eas testnet attestation containing minimal risk metadata + snapshot hash
- fallback: implement eas schema + encoded attestation payload + documented manual tx steps if testnet/rpc/wallet setup blocks final tx

## core screens

### 1. dashboard

route: `/`

states:

- demo account selector
- hyperliquid address input
- loading
- invalid address
- api error
- stale data
- no open positions
- account risk loaded

content:

- account value
- margin used
- margin usage %
- total notional
- min liquidation distance
- daily funding cost/earn
- 30-day funding estimate
- risk score
- data source
- data timestamp

### 2. position detail

route: same page or `/account/[account]`

per position:

- market
- side
- size
- entry price
- mark price
- liquidation price
- liquidation distance
- notional
- unrealized pnl
- funding 8h bps
- funding daily usd
- funding 30d usd
- plain-english risk note

### 3. scenario simulator

price moves:

- -10%
- -5%
- -2%
- +2%
- +5%
- +10%

per scenario:

- estimated account value
- estimated pnl change
- positions at/through liquidation
- risk score after move
- plain-english summary

### 4. receipt page

route: `/receipt/[id]`

content:

- receipt id
- account
- protocol
- created at
- data timestamp
- snapshot hash
- hash verification status
- risk score
- summary metrics
- optional eas schema uid
- optional eas attestation uid
- optional tx hash
- limitations

## data source

v0 protocol: hyperliquid.

use fixture data first so the app can ship even if api work gets delayed.

live data adapter should use hyperliquid read-only info endpoints only. do not use exchange/trading endpoints.

needed live data:

- user account summary
- open positions
- mark prices
- funding rates
- open interest if easy
- funding history if easy

## normalized types

```ts
export type perp_protocol = "hyperliquid" | "fixture";

export type position_side = "long" | "short";

export type data_freshness = "live" | "stale" | "fixture" | "error";

export type normalized_position = {
  market: string;
  side: position_side;
  size: number;
  entry_price_usd: number;
  mark_price_usd: number;
  liquidation_price_usd: number | null;
  notional_usd: number;
  unrealized_pnl_usd: number;
  funding_8h_bps_user_perspective: number;
  open_interest_usd?: number;
};

export type normalized_account_snapshot = {
  account: string;
  protocol: perp_protocol;
  source: "live" | "fixture";
  created_at_iso: string;
  data_time_iso: string;
  freshness: data_freshness;
  stale_reason?: string;
  account_value_usd: number;
  margin_used_usd: number;
  withdrawable_usd?: number;
  positions: normalized_position[];
  aggregate: {
    total_notional_usd: number;
    margin_usage_bps: number;
    min_liquidation_distance_bps: number | null;
    daily_funding_usd: number;
    thirty_day_funding_usd: number;
    risk_score: number;
    risk_label: "low" | "medium" | "high" | "critical";
  };
};

export type risk_receipt = {
  id: string;
  snapshot_hash: string;
  snapshot: normalized_account_snapshot;
  created_at_iso: string;
  eas_schema_uid?: string;
  eas_attestation_uid?: string;
  tx_hash?: string;
  chain_id?: number;
};
