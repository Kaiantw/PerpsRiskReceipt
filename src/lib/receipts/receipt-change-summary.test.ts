import assert from "node:assert/strict";
import test from "node:test";

import { buildAccountValueTimeline } from "../history/account-value-timeline.ts";
import { buildReceiptAccountValueContext } from "../history/receipt-account-value-context.ts";
import { buildMarketContext } from "../market/market-context.ts";
import { loadFixtureAccount } from "../perps/fixtures.ts";
import type {
  account_snapshot_input,
  normalized_account_snapshot,
} from "../perps/types.ts";
import { normalizeAccountSnapshot } from "../risk/risk-engine.ts";
import { compareSnapshots } from "./snapshot-comparison.ts";
import { buildReceiptChangeSummary } from "./receipt-change-summary.ts";

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

function summarizeSnapshots(input: {
  receiptSnapshot: normalized_account_snapshot;
  currentSnapshot: normalized_account_snapshot;
}) {
  const comparison = compareSnapshots(input);

  return buildReceiptChangeSummary({
    comparison,
    marketContext: buildMarketContext(comparison),
  });
}

test("account mismatch is the highest priority summary", () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = normalizeAccountSnapshot({
    ...toSnapshotInput(receiptSnapshot),
    account: "0x0000000000000000000000000000000000000000",
  });
  const summary = summarizeSnapshots({ receiptSnapshot, currentSnapshot });

  assert.equal(summary.label, "account_mismatch");
  assert.equal(summary.severity, "critical");
  assert.match(summary.primary_detail, /historical receipt only/);
});

test("position changes outrank market movement", () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = normalizeAccountSnapshot({
    ...toSnapshotInput(receiptSnapshot),
    positions: toSnapshotInput(receiptSnapshot).positions.map((position) => ({
      ...position,
      size: position.size + 1,
      mark_price_usd: position.mark_price_usd * 1.1,
    })),
  });
  const summary = summarizeSnapshots({ receiptSnapshot, currentSnapshot });

  assert.equal(summary.label, "position_changed");
  assert.equal(summary.severity, "changed");
  assert.match(summary.primary_detail, /position state change/);
});

test("movement toward listed liquidation becomes liquidation watch", () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = normalizeAccountSnapshot({
    ...toSnapshotInput(receiptSnapshot),
    positions: toSnapshotInput(receiptSnapshot).positions.map((position) => ({
      ...position,
      mark_price_usd: 2_400,
    })),
  });
  const summary = summarizeSnapshots({ receiptSnapshot, currentSnapshot });

  assert.equal(summary.label, "liquidation_watch");
  assert.equal(summary.severity, "critical");
  assert.match(summary.primary_detail, /ETH-PERP/);
});

test("risk score worsening is summarized when market direction is not the main issue", () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = normalizeAccountSnapshot({
    ...toSnapshotInput(receiptSnapshot),
    margin_used_usd: 15_000,
  });
  const summary = summarizeSnapshots({ receiptSnapshot, currentSnapshot });

  assert.equal(summary.label, "risk_worsened");
  assert.equal(summary.severity, "critical");
  assert.match(summary.primary_detail, /Risk score moved/);
});

test("account history watch includes sampled account value context", () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const comparison = compareSnapshots({
    receiptSnapshot,
    currentSnapshot: receiptSnapshot,
  });
  const accountValueContext = buildReceiptAccountValueContext({
    receipt_data_time_iso: "2026-06-24T12:00:00.000Z",
    receipt_account_value_usd: 1_000,
    timelines: [
      buildAccountValueTimeline({
        window_id: "perpWeek",
        points: [
          {
            time_ms: Date.parse("2026-06-24T12:00:00.000Z"),
            account_value_usd: 1_000,
          },
          {
            time_ms: Date.parse("2026-06-24T12:15:00.000Z"),
            account_value_usd: 900,
          },
        ],
      }),
    ],
  });
  const summary = buildReceiptChangeSummary({
    comparison,
    marketContext: buildMarketContext(comparison),
    accountValueContext,
  });

  assert.equal(summary.label, "account_history_watch");
  assert.equal(summary.severity, "changed");
  assert.match(summary.primary_detail, /materially lower/);
});

test("funding changes are summarized when risk and position state are stable", () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = normalizeAccountSnapshot({
    ...toSnapshotInput(receiptSnapshot),
    positions: toSnapshotInput(receiptSnapshot).positions.map((position) => ({
      ...position,
      funding_8h_bps_user_perspective: 6,
    })),
  });
  const summary = summarizeSnapshots({ receiptSnapshot, currentSnapshot });

  assert.equal(summary.label, "funding_watch");
  assert.equal(summary.severity, "watch");
  assert.match(summary.primary_detail, /Daily funding estimate changed/);
});

test("unchanged snapshots produce a little changed summary", () => {
  const snapshot = loadFixtureAccount("demo-safe-eth-long");
  const summary = summarizeSnapshots({
    receiptSnapshot: snapshot,
    currentSnapshot: snapshot,
  });

  assert.equal(summary.label, "little_changed");
  assert.equal(summary.severity, "neutral");
  assert.match(summary.primary_detail, /do not show a material change/);
});
