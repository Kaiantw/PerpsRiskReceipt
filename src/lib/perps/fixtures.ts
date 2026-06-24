import { normalizeAccountSnapshot } from "../risk/risk-engine.ts";
import type {
  account_snapshot_input,
  normalized_account_snapshot,
} from "./types.ts";

const FIXTURE_CREATED_AT_ISO = "2026-06-24T12:00:00.000Z";
const FIXTURE_DATA_TIME_ISO = "2026-06-24T11:59:30.000Z";

const fixtureInputs = [
  {
    account: "demo-safe-eth-long",
    protocol: "fixture",
    source: "fixture",
    created_at_iso: FIXTURE_CREATED_AT_ISO,
    data_time_iso: FIXTURE_DATA_TIME_ISO,
    freshness: "fixture",
    account_value_usd: 50_000,
    margin_used_usd: 5_000,
    withdrawable_usd: 45_000,
    positions: [
      {
        market: "ETH-PERP",
        side: "long",
        size: 5,
        entry_price_usd: 3_000,
        mark_price_usd: 3_200,
        liquidation_price_usd: 2_100,
        funding_8h_bps_user_perspective: 2.5,
        open_interest_usd: 850_000_000,
      },
    ],
  },
  {
    account: "demo-near-liquidation-btc-short",
    protocol: "fixture",
    source: "fixture",
    created_at_iso: FIXTURE_CREATED_AT_ISO,
    data_time_iso: FIXTURE_DATA_TIME_ISO,
    freshness: "fixture",
    account_value_usd: 25_000,
    margin_used_usd: 18_000,
    withdrawable_usd: 7_000,
    positions: [
      {
        market: "BTC-PERP",
        side: "short",
        size: 0.8,
        entry_price_usd: 65_000,
        mark_price_usd: 70_000,
        liquidation_price_usd: 72_500,
        funding_8h_bps_user_perspective: -1.2,
        open_interest_usd: 2_400_000_000,
      },
    ],
  },
  {
    account: "demo-mixed-book",
    protocol: "fixture",
    source: "fixture",
    created_at_iso: FIXTURE_CREATED_AT_ISO,
    data_time_iso: FIXTURE_DATA_TIME_ISO,
    freshness: "fixture",
    account_value_usd: 75_000,
    margin_used_usd: 25_000,
    withdrawable_usd: 50_000,
    positions: [
      {
        market: "BTC-PERP",
        side: "long",
        size: 0.5,
        entry_price_usd: 60_000,
        mark_price_usd: 62_000,
        liquidation_price_usd: 48_000,
        funding_8h_bps_user_perspective: 1,
        open_interest_usd: 2_400_000_000,
      },
      {
        market: "SOL-PERP",
        side: "short",
        size: 100,
        entry_price_usd: 160,
        mark_price_usd: 150,
        liquidation_price_usd: 210,
        funding_8h_bps_user_perspective: -4,
        open_interest_usd: 410_000_000,
      },
      {
        market: "ETH-PERP",
        side: "long",
        size: 10,
        entry_price_usd: 2_800,
        mark_price_usd: 2_900,
        liquidation_price_usd: null,
        funding_8h_bps_user_perspective: 0.5,
        open_interest_usd: 850_000_000,
      },
    ],
  },
] satisfies account_snapshot_input[];

export type fixture_account_id = (typeof fixtureInputs)[number]["account"];

export const fixtureAccounts = fixtureInputs.map(normalizeAccountSnapshot);

export function listFixtureAccounts(): normalized_account_snapshot[] {
  return fixtureAccounts;
}

export function loadFixtureAccount(
  account: fixture_account_id,
): normalized_account_snapshot {
  const fixture = fixtureAccounts.find((snapshot) => snapshot.account === account);

  if (!fixture) {
    throw new Error(`Unknown fixture account: ${account}`);
  }

  return fixture;
}
