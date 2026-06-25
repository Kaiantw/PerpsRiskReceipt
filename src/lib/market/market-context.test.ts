import assert from "node:assert/strict";
import test from "node:test";

import { loadFixtureAccount } from "../perps/fixtures.ts";
import type {
  account_snapshot_input,
  normalized_account_snapshot,
} from "../perps/types.ts";
import { normalizeAccountSnapshot } from "../risk/risk-engine.ts";
import { compareSnapshots } from "../receipts/snapshot-comparison.ts";
import { buildMarketContext } from "./market-context.ts";

function toSnapshotInput(
  snapshot: normalized_account_snapshot,
): account_snapshot_input {
  return {
    account: snapshot.account,
    protocol: snapshot.protocol,
    source: snapshot.source,
    created_at_iso: snapshot.created_at_iso,
    data_time_iso: snapshot.data_time_iso,
    freshness: snapshot.freshness,
    stale_reason: snapshot.stale_reason,
    account_value_usd: snapshot.account_value_usd,
    margin_used_usd: snapshot.margin_used_usd,
    withdrawable_usd: snapshot.withdrawable_usd,
    positions: snapshot.positions.map((position) => ({
      market: position.market,
      side: position.side,
      size: position.size,
      entry_price_usd: position.entry_price_usd,
      mark_price_usd: position.mark_price_usd,
      liquidation_price_usd: position.liquidation_price_usd,
      funding_8h_bps_user_perspective:
        position.funding_8h_bps_user_perspective,
      open_interest_usd: position.open_interest_usd,
    })),
  };
}

function compare(
  receiptSnapshot: normalized_account_snapshot,
  currentSnapshot: normalized_account_snapshot,
) {
  return buildMarketContext(
    compareSnapshots({
      receiptSnapshot,
      currentSnapshot,
    }),
  );
}

test("long mark moving down is called out as toward liquidation", () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = normalizeAccountSnapshot({
    ...toSnapshotInput(receiptSnapshot),
    positions: toSnapshotInput(receiptSnapshot).positions.map((position) => ({
      ...position,
      mark_price_usd: 2_880,
      funding_8h_bps_user_perspective: 5,
      open_interest_usd: 900_000_000,
    })),
  });
  const context = compare(receiptSnapshot, currentSnapshot);
  const ethContext = context.positions[0];

  assert.equal(context.label, "toward_liquidation");
  assert.equal(context.most_relevant_position?.market, "ETH-PERP");
  assert.equal(ethContext.mark_move_direction, "toward_liquidation");
  assert.equal(ethContext.mark_price_change_percent, -10);
  assert.equal(ethContext.funding_8h_bps_user_perspective.delta, 2.5);
  assert.equal(ethContext.open_interest_usd.delta, 50_000_000);
  assert.match(ethContext.summary, /toward the listed liquidation price/);
});

test("short mark moving down is called out as away from liquidation", () => {
  const receiptSnapshot = loadFixtureAccount("demo-near-liquidation-btc-short");
  const currentSnapshot = normalizeAccountSnapshot({
    ...toSnapshotInput(receiptSnapshot),
    positions: toSnapshotInput(receiptSnapshot).positions.map((position) => ({
      ...position,
      mark_price_usd: 66_500,
    })),
  });
  const context = compare(receiptSnapshot, currentSnapshot);
  const btcContext = context.positions[0];

  assert.equal(context.label, "market_moved");
  assert.equal(btcContext.mark_move_direction, "away_from_liquidation");
  assert.equal(btcContext.mark_price_change_percent, -5);
  assert.match(btcContext.summary, /away from the listed liquidation price/);
});

test("funding-only increase is called out as more expensive", () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = normalizeAccountSnapshot({
    ...toSnapshotInput(receiptSnapshot),
    positions: toSnapshotInput(receiptSnapshot).positions.map((position) => ({
      ...position,
      funding_8h_bps_user_perspective: 10,
    })),
  });
  const context = compare(receiptSnapshot, currentSnapshot);

  assert.equal(context.label, "funding_more_expensive");
  assert.equal(context.total_daily_funding_delta_usd, 36);
  assert.match(context.summary, /\+36.00 USD/);
});

test("position state changes remain the highest-priority context", () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = normalizeAccountSnapshot({
    ...toSnapshotInput(receiptSnapshot),
    positions: [],
  });
  const context = compare(receiptSnapshot, currentSnapshot);

  assert.equal(context.label, "position_state_changed");
  assert.equal(context.positions[0].status, "closed");
  assert.equal(context.positions[0].mark_move_direction, "not_comparable");
  assert.match(context.positions[0].summary, /Position state changed/);
});
