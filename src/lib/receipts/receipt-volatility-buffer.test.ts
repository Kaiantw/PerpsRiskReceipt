import assert from "node:assert/strict";
import test from "node:test";

import type { hyperliquid_market_history } from "../hyperliquid/adapter.ts";
import { loadFixtureAccount } from "../perps/fixtures.ts";
import type {
  account_snapshot_input,
  normalized_account_snapshot,
} from "../perps/types.ts";
import { normalizeAccountSnapshot } from "../risk/risk-engine.ts";
import { buildMarketContext } from "../market/market-context.ts";
import { compareSnapshots } from "./snapshot-comparison.ts";
import { buildReceiptVolatilityBuffer } from "./receipt-volatility-buffer.ts";

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

function buildContext(input: {
  receiptSnapshot: normalized_account_snapshot;
  currentSnapshot: normalized_account_snapshot;
}) {
  return buildMarketContext(
    compareSnapshots({
      receiptSnapshot: input.receiptSnapshot,
      currentSnapshot: input.currentSnapshot,
    }),
  );
}

function buildEthHistory(input?: {
  closePrices?: [number, number];
  highPriceUsd?: number;
  lowPriceUsd?: number;
}): hyperliquid_market_history {
  const closePrices = input?.closePrices ?? [2_500, 2_400];

  return {
    market: "ETH-PERP",
    coin: "ETH",
    interval: "1h",
    start_time_ms: Date.parse("2026-06-25T00:00:00.000Z"),
    end_time_ms: Date.parse("2026-06-26T00:00:00.000Z"),
    candles: [
      {
        open_time_ms: Date.parse("2026-06-25T00:00:00.000Z"),
        close_time_ms: Date.parse("2026-06-25T00:59:59.999Z"),
        market: "ETH-PERP",
        interval: "1h",
        open_price_usd: closePrices[0],
        high_price_usd: input?.highPriceUsd ?? 2_650,
        low_price_usd: input?.lowPriceUsd ?? 2_100,
        close_price_usd: closePrices[0],
        volume_base: 100,
        trade_count: 10,
      },
      {
        open_time_ms: Date.parse("2026-06-25T23:00:00.000Z"),
        close_time_ms: Date.parse("2026-06-25T23:59:59.999Z"),
        market: "ETH-PERP",
        interval: "1h",
        open_price_usd: closePrices[0],
        high_price_usd: input?.highPriceUsd ?? 2_650,
        low_price_usd: input?.lowPriceUsd ?? 2_100,
        close_price_usd: closePrices[1],
        volume_base: 140,
        trade_count: 12,
      },
    ],
    funding: [],
  };
}

test("flags when public 24h range exceeds the current listed buffer", () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = normalizeAccountSnapshot({
    ...toSnapshotInput(receiptSnapshot),
    positions: toSnapshotInput(receiptSnapshot).positions.map((position) => ({
      ...position,
      mark_price_usd: 2_400,
    })),
  });
  const context = buildContext({ receiptSnapshot, currentSnapshot });
  const volatilityBuffer = buildReceiptVolatilityBuffer({
    marketContext: context,
    histories: [buildEthHistory()],
    fetchedAtIso: "2026-06-26T00:00:00.000Z",
    windowHours: 24,
    interval: "1h",
  });

  assert.equal(volatilityBuffer.label, "range_exceeds_buffer");
  assert.equal(volatilityBuffer.high_count, 1);
  assert.equal(volatilityBuffer.rows[0]?.severity, "high");
  assert.equal(
    volatilityBuffer.rows[0]?.current_liquidation_distance_percent,
    12.5,
  );
  assert.equal(volatilityBuffer.rows[0]?.high_low_range_percent, 22.92);
  assert.match(volatilityBuffer.rows[0]?.summary ?? "", /larger/);
});

test("flags when public range uses at least half the current listed buffer", () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const context = buildContext({
    receiptSnapshot,
    currentSnapshot: receiptSnapshot,
  });
  const volatilityBuffer = buildReceiptVolatilityBuffer({
    marketContext: context,
    histories: [
      buildEthHistory({
        closePrices: [3_200, 3_200],
        highPriceUsd: 3_700,
        lowPriceUsd: 2_700,
      }),
    ],
    fetchedAtIso: "2026-06-26T00:00:00.000Z",
    windowHours: 24,
    interval: "1h",
  });

  assert.equal(volatilityBuffer.label, "range_near_buffer");
  assert.equal(volatilityBuffer.watch_count, 1);
  assert.equal(volatilityBuffer.rows[0]?.severity, "watch");
  assert.equal(volatilityBuffer.rows[0]?.range_to_buffer_ratio, 0.91);
  assert.match(volatilityBuffer.rows[0]?.summary ?? "", /half/);
});

test("reports unavailable history without inventing volatility reads", () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const context = buildContext({
    receiptSnapshot,
    currentSnapshot: receiptSnapshot,
  });
  const volatilityBuffer = buildReceiptVolatilityBuffer({
    marketContext: context,
    histories: [],
    fetchedAtIso: "2026-06-26T00:00:00.000Z",
    windowHours: 24,
    interval: "1h",
  });

  assert.equal(volatilityBuffer.label, "no_history");
  assert.equal(volatilityBuffer.matched_market_count, 0);
  assert.equal(volatilityBuffer.rows[0]?.has_history, false);
  assert.match(volatilityBuffer.rows[0]?.summary ?? "", /No 24h public/);
});

test("does not compare volatility buffer for changed positions", () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = normalizeAccountSnapshot({
    ...toSnapshotInput(receiptSnapshot),
    positions: [],
  });
  const context = buildContext({ receiptSnapshot, currentSnapshot });
  const volatilityBuffer = buildReceiptVolatilityBuffer({
    marketContext: context,
    histories: [buildEthHistory()],
    fetchedAtIso: "2026-06-26T00:00:00.000Z",
    windowHours: 24,
    interval: "1h",
  });

  assert.equal(volatilityBuffer.label, "no_comparable_positions");
  assert.equal(volatilityBuffer.rows[0]?.severity, "info");
  assert.match(volatilityBuffer.rows[0]?.summary ?? "", /not directly comparable/);
});
