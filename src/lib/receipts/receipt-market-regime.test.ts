import assert from "node:assert/strict";
import test from "node:test";

import type { hyperliquid_market_history } from "../hyperliquid/adapter.ts";
import { buildAccountValueTimeline } from "../history/account-value-timeline.ts";
import { buildReceiptAccountValueContext } from "../history/receipt-account-value-context.ts";
import { buildMarketContext } from "../market/market-context.ts";
import { loadFixtureAccount } from "../perps/fixtures.ts";
import type {
  account_snapshot_input,
  normalized_account_snapshot,
} from "../perps/types.ts";
import { normalizeAccountSnapshot } from "../risk/risk-engine.ts";
import {
  buildReceiptMarketRegime,
  type receipt_market_regime,
} from "./receipt-market-regime.ts";
import { compareReceiptRiskDrivers } from "./receipt-risk-driver-comparison.ts";
import { buildReceiptRecheckWatchlist } from "./receipt-recheck-watchlist.ts";
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

function buildRegime(input: {
  receiptSnapshot: normalized_account_snapshot;
  currentSnapshot: normalized_account_snapshot;
  volatilityHistories?: hyperliquid_market_history[];
  withAccountDrawdown?: boolean;
}): receipt_market_regime {
  const comparison = compareSnapshots({
    receiptSnapshot: input.receiptSnapshot,
    currentSnapshot: input.currentSnapshot,
  });
  const marketContext = buildMarketContext(comparison);
  const riskDriverComparison = compareReceiptRiskDrivers({
    savedSnapshot: input.receiptSnapshot,
    currentSnapshot: input.currentSnapshot,
  });
  const volatilityBuffer = input.volatilityHistories
    ? buildReceiptVolatilityBuffer({
        marketContext,
        histories: input.volatilityHistories,
        fetchedAtIso: "2026-06-26T00:00:00.000Z",
        windowHours: 24,
        interval: "1h",
      })
    : null;
  const watchlist = buildReceiptRecheckWatchlist({
    marketContext,
    riskDriverComparison,
    volatilityBuffer,
  });
  const accountValueContext = input.withAccountDrawdown
    ? buildReceiptAccountValueContext({
        receipt_data_time_iso: input.receiptSnapshot.data_time_iso,
        receipt_account_value_usd: input.receiptSnapshot.account_value_usd,
        timelines: [
          buildAccountValueTimeline({
            window_id: "perpDay",
            points: [
              {
                time_ms: Date.parse("2026-06-24T00:00:00.000Z"),
                account_value_usd: 112_000,
                pnl_usd: 0,
              },
              {
                time_ms: Date.parse("2026-06-24T01:00:00.000Z"),
                account_value_usd: 100_000,
                pnl_usd: -12_000,
              },
            ],
            volume_usd: 1_000_000,
          }),
        ],
      })
    : null;

  return buildReceiptMarketRegime({
    accountValueContext,
    comparison,
    marketContext,
    riskDriverComparison,
    volatilityBuffer,
    watchlist,
  });
}

function buildEthHistory(): hyperliquid_market_history {
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
        open_price_usd: 2_500,
        high_price_usd: 2_650,
        low_price_usd: 2_100,
        close_price_usd: 2_500,
        volume_base: 100,
        trade_count: 10,
      },
      {
        open_time_ms: Date.parse("2026-06-25T23:00:00.000Z"),
        close_time_ms: Date.parse("2026-06-25T23:59:59.999Z"),
        market: "ETH-PERP",
        interval: "1h",
        open_price_usd: 2_500,
        high_price_usd: 2_650,
        low_price_usd: 2_100,
        close_price_usd: 2_400,
        volume_base: 140,
        trade_count: 12,
      },
    ],
    funding: [],
  };
}

test("labels unchanged receipts as calm when no watch signals are loaded", () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const regime = buildRegime({
    receiptSnapshot,
    currentSnapshot: receiptSnapshot,
  });

  assert.equal(regime.label, "calm");
  assert.equal(regime.high_count, 0);
  assert.equal(regime.watch_count, 0);
  assert.ok(
    regime.signals.some((signal) => signal.id === "volatility:not-loaded"),
  );
});

test("labels large public volatility versus listed buffer as stressed", () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = normalizeAccountSnapshot({
    ...toSnapshotInput(receiptSnapshot),
    positions: toSnapshotInput(receiptSnapshot).positions.map((position) => ({
      ...position,
      mark_price_usd: 2_400,
    })),
  });
  const regime = buildRegime({
    receiptSnapshot,
    currentSnapshot,
    volatilityHistories: [buildEthHistory()],
  });

  assert.equal(regime.label, "stress");
  assert.equal(regime.severity, "high");
  assert.equal(regime.focus_market, "ETH-PERP");
  assert.ok(
    regime.signals.some(
      (signal) =>
        signal.category === "volatility" &&
        signal.title === "Public volatility is large versus listed buffer",
    ),
  );
});

test("labels changed positions as not directly comparable", () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = normalizeAccountSnapshot({
    ...toSnapshotInput(receiptSnapshot),
    positions: [],
  });
  const regime = buildRegime({ receiptSnapshot, currentSnapshot });

  assert.equal(regime.label, "not_comparable");
  assert.equal(regime.severity, "critical");
  assert.equal(regime.critical_count, 0);
  assert.equal(regime.high_count, 2);
  assert.ok(
    regime.signals.some(
      (signal) =>
        signal.category === "comparability" &&
        signal.title === "Position state changed since receipt",
    ),
  );
});

test("labels account mismatch as critical and not directly comparable", () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = {
    ...receiptSnapshot,
    account: "0x0000000000000000000000000000000000000001",
  } satisfies normalized_account_snapshot;
  const regime = buildRegime({ receiptSnapshot, currentSnapshot });

  assert.equal(regime.label, "not_comparable");
  assert.equal(regime.severity, "critical");
  assert.equal(regime.critical_count, 1);
  assert.ok(
    regime.signals.some(
      (signal) =>
        signal.category === "comparability" &&
        signal.title === "Live account does not match receipt account",
    ),
  );
});

test("combines elevated funding and sampled drawdown into a stretched regime", () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = normalizeAccountSnapshot({
    ...toSnapshotInput(receiptSnapshot),
    positions: toSnapshotInput(receiptSnapshot).positions.map((position) => ({
      ...position,
      funding_8h_bps_user_perspective: 20,
    })),
  });
  const regime = buildRegime({
    receiptSnapshot,
    currentSnapshot,
    withAccountDrawdown: true,
  });

  assert.equal(regime.label, "stretched");
  assert.ok(
    regime.signals.some(
      (signal) =>
        signal.category === "account_value" &&
        signal.title === "Current sampled drawdown is meaningful",
    ),
  );
  assert.ok(
    regime.signals.some(
      (signal) =>
        signal.category === "funding" &&
        signal.title === "Current funding burden is elevated",
    ),
  );
});
