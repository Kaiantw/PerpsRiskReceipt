import assert from "node:assert/strict";
import test from "node:test";

import type { hyperliquid_market_history } from "../hyperliquid/adapter.ts";
import { buildMarketContext } from "../market/market-context.ts";
import { loadFixtureAccount } from "../perps/fixtures.ts";
import type {
  account_snapshot_input,
  normalized_account_snapshot,
} from "../perps/types.ts";
import { normalizeAccountSnapshot } from "../risk/risk-engine.ts";
import {
  buildReceiptRecheckWatchlist,
  defaultReceiptRecheckWatchlistThresholds,
  type receipt_recheck_watchlist_thresholds,
} from "./receipt-recheck-watchlist.ts";
import { compareReceiptRiskDrivers } from "./receipt-risk-driver-comparison.ts";
import { buildReceiptVolatilityBuffer } from "./receipt-volatility-buffer.ts";
import { compareSnapshots } from "./snapshot-comparison.ts";

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

function buildWatchlist(input: {
  receiptSnapshot: normalized_account_snapshot;
  currentSnapshot: normalized_account_snapshot;
  thresholds?: Partial<receipt_recheck_watchlist_thresholds>;
  volatilityHistories?: hyperliquid_market_history[];
}) {
  const comparison = compareSnapshots({
    receiptSnapshot: input.receiptSnapshot,
    currentSnapshot: input.currentSnapshot,
  });
  const marketContext = buildMarketContext(comparison);
  const volatilityBuffer = input.volatilityHistories
    ? buildReceiptVolatilityBuffer({
        marketContext,
        histories: input.volatilityHistories,
        fetchedAtIso: "2026-06-26T00:00:00.000Z",
        windowHours: 24,
        interval: "1h",
      })
    : null;

  return buildReceiptRecheckWatchlist({
    marketContext,
    riskDriverComparison: compareReceiptRiskDrivers({
      savedSnapshot: input.receiptSnapshot,
      currentSnapshot: input.currentSnapshot,
    }),
    thresholds: input.thresholds,
    volatilityBuffer,
  });
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

test("builds high-attention cues from buffer, adverse mark, funding, and open interest", () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = normalizeAccountSnapshot({
    ...toSnapshotInput(receiptSnapshot),
    positions: toSnapshotInput(receiptSnapshot).positions.map((position) => ({
      ...position,
      mark_price_usd: 2_200,
      funding_8h_bps_user_perspective: 10,
      open_interest_usd: 950_000_000,
    })),
  });
  const watchlist = buildWatchlist({ receiptSnapshot, currentSnapshot });

  assert.equal(watchlist.label, "high_attention");
  assert.ok(watchlist.high_count >= 2);
  assert.ok(
    watchlist.items.some(
      (item) =>
        item.market === "ETH-PERP" &&
        item.category === "liquidation_buffer" &&
        item.severity === "high",
    ),
  );
  assert.ok(
    watchlist.items.some(
      (item) =>
        item.category === "adverse_mark_move" && item.severity === "high",
    ),
  );
  assert.ok(
    watchlist.items.some((item) => item.category === "funding_cost"),
  );
  assert.ok(
    watchlist.items.some(
      (item) =>
        item.category === "open_interest" &&
        item.detail.includes("Open interest moved"),
    ),
  );
});

test("reports position state changes as historical review cues", () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = normalizeAccountSnapshot({
    ...toSnapshotInput(receiptSnapshot),
    positions: [],
  });
  const watchlist = buildWatchlist({ receiptSnapshot, currentSnapshot });

  assert.equal(watchlist.label, "high_attention");
  assert.ok(
    watchlist.items.some(
      (item) =>
        item.category === "position_state" &&
        item.title === "Position state changed since receipt" &&
        item.severity === "high",
    ),
  );
});

test("adds volatility-buffer cues after public market history is loaded", () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = normalizeAccountSnapshot({
    ...toSnapshotInput(receiptSnapshot),
    positions: toSnapshotInput(receiptSnapshot).positions.map((position) => ({
      ...position,
      mark_price_usd: 2_400,
    })),
  });
  const watchlist = buildWatchlist({
    receiptSnapshot,
    currentSnapshot,
    volatilityHistories: [buildEthHistory()],
  });

  assert.equal(watchlist.label, "high_attention");
  assert.ok(
    watchlist.items.some(
      (item) =>
        item.market === "ETH-PERP" &&
        item.category === "volatility_buffer" &&
        item.severity === "high" &&
        item.title === "Public 24h range exceeds current listed buffer" &&
        item.detail.includes("Public 24h range: 22.92%"),
    ),
  );
});

test("returns no watch items when receipt and live snapshot are unchanged", () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const watchlist = buildWatchlist({
    receiptSnapshot,
    currentSnapshot: receiptSnapshot,
  });

  assert.equal(watchlist.label, "no_watch_items");
  assert.equal(watchlist.item_count, 0);
  assert.deepEqual(
    watchlist.thresholds,
    defaultReceiptRecheckWatchlistThresholds,
  );
  assert.match(watchlist.summary, /not protocol-official risk/i);
});

test("uses custom thresholds to tune current market review cues", () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const watchlist = buildWatchlist({
    receiptSnapshot,
    currentSnapshot: receiptSnapshot,
    thresholds: {
      tight_liquidation_distance_bps: 4_000,
    },
  });

  assert.equal(watchlist.label, "watch_items_loaded");
  assert.equal(watchlist.thresholds.tight_liquidation_distance_bps, 4_000);
  assert.ok(
    watchlist.items.some(
      (item) =>
        item.category === "liquidation_buffer" &&
        item.severity === "watch" &&
        item.title === "Tight current listed liquidation buffer",
    ),
  );
});

test("sanitizes custom thresholds before building watch items", () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const watchlist = buildWatchlist({
    receiptSnapshot,
    currentSnapshot: receiptSnapshot,
    thresholds: {
      material_open_interest_delta_usd: -1,
      thin_liquidation_distance_bps: 1_500,
      tight_liquidation_distance_bps: 500,
    },
  });

  assert.equal(watchlist.thresholds.material_open_interest_delta_usd, 0);
  assert.equal(watchlist.thresholds.thin_liquidation_distance_bps, 1_500);
  assert.equal(watchlist.thresholds.tight_liquidation_distance_bps, 1_500);
});

test("surfaces missing market context without inventing mark or funding reads", () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const driverComparison = compareReceiptRiskDrivers({
    savedSnapshot: receiptSnapshot,
    currentSnapshot: receiptSnapshot,
  });
  const watchlist = buildReceiptRecheckWatchlist({
    riskDriverComparison: driverComparison,
    marketContext: {
      label: "no_positions",
      headline: "No market context.",
      summary: "No rows.",
      max_abs_mark_price_change_percent: 0,
      total_daily_funding_delta_usd: null,
      total_open_interest_delta_usd: null,
      most_relevant_position: null,
      positions: [],
    },
  });

  assert.equal(watchlist.label, "watch_items_loaded");
  assert.equal(watchlist.info_count, 1);
  assert.ok(
    watchlist.items.some(
      (item) => item.category === "missing_market_context",
    ),
  );
});
