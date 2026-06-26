"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  answerReceiptRiskQuestion,
  type receipt_risk_assistant_context,
} from "@/lib/assistant/receipt-risk-assistant.ts";
import {
  formatPercentFromBps,
  formatIsoDate,
  formatSignedBps,
  formatSignedUsd,
  formatUsd,
} from "@/lib/formatters.ts";
import type { receipt_account_value_context } from "@/lib/history/receipt-account-value-context.ts";
import type { hyperliquid_market_history } from "@/lib/hyperliquid/adapter.ts";
import {
  buildMarketContext,
  type market_context,
  type market_context_position,
} from "@/lib/market/market-context.ts";
import type {
  normalized_account_snapshot,
  risk_receipt,
} from "@/lib/perps/types.ts";
import type {
  metric_comparison,
  snapshot_comparison,
} from "@/lib/receipts/snapshot-comparison.ts";
import type { position_risk_driver_category } from "@/lib/risk/position-risk-drivers.ts";
import {
  buildReceiptChangeSummary,
  type receipt_change_summary,
} from "@/lib/receipts/receipt-change-summary.ts";
import {
  compareReceiptRiskDrivers,
  type receipt_risk_driver_comparison,
  type receipt_risk_driver_comparison_label,
  type receipt_risk_driver_comparison_severity,
  type receipt_risk_driver_market_status,
} from "@/lib/receipts/receipt-risk-driver-comparison.ts";
import {
  buildReceiptRecheckWatchlist,
  defaultReceiptRecheckWatchlistThresholds,
  type receipt_recheck_watch_severity,
  type receipt_recheck_watchlist,
  type receipt_recheck_watchlist_label,
  type receipt_recheck_watchlist_thresholds,
} from "@/lib/receipts/receipt-recheck-watchlist.ts";
import {
  buildReceiptReviewPacket,
  type receipt_review_packet,
} from "@/lib/receipts/receipt-review-packet.ts";
import {
  buildReceiptRecheckHistorySummary,
  createReceiptRecheckHistoryEntry,
  getLocalRecheckHistoryStorageKey,
  parseStoredReceiptRecheckHistory,
  stringifyReceiptRecheckHistory,
  upsertReceiptRecheckHistoryEntry,
  type receipt_recheck_history_entry,
  type receipt_recheck_history_summary,
} from "@/lib/receipts/receipt-recheck-history.ts";
import {
  buildReceiptMarketRegime,
  type receipt_market_regime,
  type receipt_market_regime_label,
  type receipt_market_regime_severity,
} from "@/lib/receipts/receipt-market-regime.ts";
import {
  buildReceiptMarketRegimeDrilldown,
  type receipt_market_regime_drilldown,
} from "@/lib/receipts/receipt-market-regime-drilldown.ts";
import {
  buildReceiptVolatilityBuffer,
  type receipt_volatility_buffer,
  type receipt_volatility_buffer_label,
  type receipt_volatility_buffer_severity,
} from "@/lib/receipts/receipt-volatility-buffer.ts";
import { compareSnapshots } from "@/lib/receipts/snapshot-comparison.ts";
import { ReceiptRiskAssistantPanel } from "./receipt-risk-assistant-panel.tsx";

type recheck_state =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "loaded";
      comparison: snapshot_comparison;
      currentSnapshot: normalized_account_snapshot;
      rechecked_at_iso: string;
    };

type hyperliquid_snapshot_response =
  | { snapshot: normalized_account_snapshot }
  | { error: string; fallback?: string };

type hyperliquid_market_history_response =
  | {
      fetched_at_iso: string;
      interval: string;
      window_hours: number;
      histories: hyperliquid_market_history[];
    }
  | { error: string; fallback?: string };

type market_history_state =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "loaded";
      fetchedAtIso: string;
      histories: hyperliquid_market_history[];
      interval: string;
      windowHours: number;
    };

const statusLabels: Record<snapshot_comparison["status"], string> = {
  account_mismatch: "account mismatch",
  position_state_changed: "position state changed",
  risk_worsened: "risk worsened",
  risk_improved: "risk improved",
  market_moved: "market moved",
  little_changed: "little changed",
};

const positionStatusLabels = {
  same_position: "same position",
  position_changed: "position changed",
  closed: "closed",
  new: "new",
};

const marketContextLabels: Record<market_context["label"], string> = {
  no_positions: "no positions",
  position_state_changed: "position state changed",
  through_liquidation: "through liquidation",
  toward_liquidation: "toward liquidation",
  market_moved: "market moved",
  funding_more_expensive: "funding more expensive",
  funding_more_favorable: "funding more favorable",
  little_changed: "little changed",
};

const marketContextTone: Record<market_context["label"], string> = {
  no_positions: "border-stone-300 bg-white text-stone-700",
  position_state_changed: "border-amber-200 bg-amber-100 text-amber-950",
  through_liquidation: "border-red-200 bg-red-100 text-red-950",
  toward_liquidation: "border-red-200 bg-red-100 text-red-950",
  market_moved: "border-yellow-200 bg-yellow-100 text-yellow-950",
  funding_more_expensive: "border-amber-200 bg-amber-100 text-amber-950",
  funding_more_favorable: "border-emerald-200 bg-emerald-100 text-emerald-950",
  little_changed: "border-emerald-200 bg-emerald-100 text-emerald-950",
};

const markMoveLabels: Record<
  market_context_position["mark_move_direction"],
  string
> = {
  toward_liquidation: "toward liq.",
  away_from_liquidation: "away from liq.",
  flat: "flat",
  not_comparable: "not comparable",
};

const receiptSummaryLabels: Record<receipt_change_summary["label"], string> = {
  account_mismatch: "account mismatch",
  position_changed: "position changed",
  liquidation_watch: "liquidation watch",
  risk_worsened: "risk worsened",
  risk_improved: "risk improved",
  account_history_watch: "account history watch",
  funding_watch: "funding watch",
  market_moved: "market moved",
  little_changed: "little changed",
};

const receiptSummaryTone: Record<receipt_change_summary["severity"], string> = {
  critical: "border-red-200 bg-red-100 text-red-950",
  changed: "border-amber-200 bg-amber-100 text-amber-950",
  watch: "border-yellow-200 bg-yellow-100 text-yellow-950",
  neutral: "border-emerald-200 bg-emerald-100 text-emerald-950",
};

const riskDriverComparisonLabels: Record<
  receipt_risk_driver_comparison_label,
  string
> = {
  no_live_snapshot: "no live snapshot",
  account_mismatch: "account mismatch",
  positions_changed: "positions changed",
  driver_worsened: "driver higher",
  driver_improved: "driver lower",
  driver_changed: "driver changed",
  little_changed: "little changed",
};

const riskDriverComparisonTone: Record<
  receipt_risk_driver_comparison_severity,
  string
> = {
  critical: "border-red-200 bg-red-100 text-red-950",
  changed: "border-amber-200 bg-amber-100 text-amber-950",
  watch: "border-yellow-200 bg-yellow-100 text-yellow-950",
  neutral: "border-emerald-200 bg-emerald-100 text-emerald-950",
};

const riskDriverMarketStatusLabels: Record<
  receipt_risk_driver_market_status,
  string
> = {
  same_position: "same position",
  position_changed: "position changed",
  closed: "closed",
  new: "new",
};

const recheckWatchlistLabels: Record<
  receipt_recheck_watchlist_label,
  string
> = {
  no_live_recheck: "no live recheck",
  no_watch_items: "no watch items",
  watch_items_loaded: "watch items",
  high_attention: "high attention",
};

const recheckWatchlistTone: Record<receipt_recheck_watchlist_label, string> = {
  no_live_recheck: "border-stone-300 bg-white text-stone-700",
  no_watch_items: "border-emerald-200 bg-emerald-100 text-emerald-950",
  watch_items_loaded: "border-yellow-200 bg-yellow-100 text-yellow-950",
  high_attention: "border-red-200 bg-red-100 text-red-950",
};

const recheckWatchSeverityLabels: Record<
  receipt_recheck_watch_severity,
  string
> = {
  high: "high",
  watch: "watch",
  info: "info",
};

const recheckWatchSeverityTone: Record<
  receipt_recheck_watch_severity,
  string
> = {
  high: "border-red-200 bg-red-100 text-red-950",
  watch: "border-yellow-200 bg-yellow-100 text-yellow-950",
  info: "border-stone-200 bg-stone-100 text-stone-700",
};

const volatilityBufferLabels: Record<receipt_volatility_buffer_label, string> = {
  no_comparable_positions: "no comparable positions",
  no_history: "no history",
  missing_buffer: "missing buffer",
  range_exceeds_buffer: "range exceeds buffer",
  range_near_buffer: "range near buffer",
  adverse_trend_near_buffer: "adverse trend near buffer",
  volatility_context_loaded: "volatility loaded",
};

const volatilityBufferTone: Record<receipt_volatility_buffer_label, string> = {
  no_comparable_positions: "border-stone-300 bg-white text-stone-700",
  no_history: "border-amber-200 bg-amber-100 text-amber-950",
  missing_buffer: "border-amber-200 bg-amber-100 text-amber-950",
  range_exceeds_buffer: "border-red-200 bg-red-100 text-red-950",
  range_near_buffer: "border-yellow-200 bg-yellow-100 text-yellow-950",
  adverse_trend_near_buffer: "border-red-200 bg-red-100 text-red-950",
  volatility_context_loaded: "border-emerald-200 bg-emerald-100 text-emerald-950",
};

const volatilityBufferSeverityTone: Record<
  receipt_volatility_buffer_severity,
  string
> = {
  high: "border-red-200 bg-red-100 text-red-950",
  watch: "border-yellow-200 bg-yellow-100 text-yellow-950",
  info: "border-stone-200 bg-stone-100 text-stone-700",
};

const marketRegimeLabels: Record<receipt_market_regime_label, string> = {
  not_comparable: "not comparable",
  calm: "calm",
  active: "active",
  stretched: "stretched",
  stress: "stress",
};

const marketRegimeTone: Record<receipt_market_regime_severity, string> = {
  critical: "border-red-200 bg-red-100 text-red-950",
  high: "border-red-200 bg-red-100 text-red-950",
  watch: "border-yellow-200 bg-yellow-100 text-yellow-950",
  info: "border-emerald-200 bg-emerald-100 text-emerald-950",
};

export function LiveRecheckPanel({
  hashVerified,
  receipt,
  receiptAccountValueContext,
}: {
  hashVerified?: boolean;
  receipt: risk_receipt;
  receiptAccountValueContext?: receipt_account_value_context | null;
}) {
  const [state, setState] = useState<recheck_state>({ status: "idle" });
  const canRecheck = receipt.snapshot.protocol === "hyperliquid";
  const historyStorageKey = getLocalRecheckHistoryStorageKey(receipt.id);
  const [historyEntries, setHistoryEntries] = useState<
    receipt_recheck_history_entry[]
  >([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const recheckHistorySummary =
    buildReceiptRecheckHistorySummary(historyEntries);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const historyState = readReceiptRecheckHistory(historyStorageKey);

      setHistoryEntries(historyState.entries);
      setHistoryError(historyState.error);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [historyStorageKey]);

  const appendHistoryEntry = useCallback(
    (entry: receipt_recheck_history_entry) => {
      setHistoryEntries((entries) => {
        const nextEntries = upsertReceiptRecheckHistoryEntry({
          entries,
          entry,
        });

        try {
          window.localStorage.setItem(
            historyStorageKey,
            stringifyReceiptRecheckHistory(nextEntries),
          );
          setHistoryError(null);
        } catch {
          setHistoryError("Local recheck history could not be saved.");
        }

        return nextEntries;
      });
    },
    [historyStorageKey],
  );

  const clearHistory = useCallback(() => {
    try {
      window.localStorage.removeItem(historyStorageKey);
      setHistoryEntries([]);
      setHistoryError(null);
    } catch {
      setHistoryError("Local recheck history could not be cleared.");
    }
  }, [historyStorageKey]);

  async function recheckLiveAccount() {
    setState({ status: "loading" });

    try {
      const response = await fetch(
        `/api/hyperliquid/snapshot?address=${encodeURIComponent(
          receipt.snapshot.account,
        )}`,
      );
      const body = (await response.json()) as hyperliquid_snapshot_response;

      if (!response.ok || !("snapshot" in body)) {
        throw new Error(
          "error" in body ? body.error : "Hyperliquid live recheck failed.",
        );
      }

      setState({
        status: "loaded",
        currentSnapshot: body.snapshot,
        comparison: compareSnapshots({
          receiptSnapshot: receipt.snapshot,
          currentSnapshot: body.snapshot,
        }),
        rechecked_at_iso: new Date().toISOString(),
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Hyperliquid live recheck failed.",
      });
    }
  }

  return (
    <section className="rounded-lg border border-stone-300 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Live recheck</h2>
          <p className="mt-1 text-sm text-stone-600">
            Saved receipt compared with a fresh read-only Hyperliquid snapshot.
          </p>
        </div>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-stone-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-stone-400"
          disabled={!canRecheck || state.status === "loading"}
          onClick={recheckLiveAccount}
          type="button"
        >
          {state.status === "loading" ? "Rechecking..." : "Recheck live account"}
        </button>
      </div>

      {!canRecheck ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-950">
          Live recheck is only available for Hyperliquid receipts.
        </p>
      ) : null}

      {state.status === "idle" ? (
        <p className="mt-4 text-sm text-stone-600">No live recheck run yet.</p>
      ) : null}

      {state.status === "error" ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-950">
          {state.message}
        </p>
      ) : null}

      {state.status === "loaded" ? (
        <LiveRecheckResult
          comparison={state.comparison}
          currentSnapshot={state.currentSnapshot}
          hashVerified={hashVerified}
          key={`${state.rechecked_at_iso}:${state.currentSnapshot.data_time_iso}:${state.comparison.status}`}
          onHistoryEntry={appendHistoryEntry}
          receipt={receipt}
          receiptAccountValueContext={receiptAccountValueContext ?? null}
          recheckHistorySummary={recheckHistorySummary}
          recheckedAtIso={state.rechecked_at_iso}
        />
      ) : null}

      {canRecheck ? (
        <ReceiptRecheckHistoryResult
          entries={historyEntries}
          error={historyError}
          onClear={clearHistory}
          summary={recheckHistorySummary}
        />
      ) : null}
    </section>
  );
}

function readReceiptRecheckHistory(storageKey: string): {
  entries: receipt_recheck_history_entry[];
  error: string | null;
} {
  if (typeof window === "undefined") {
    return { entries: [], error: null };
  }

  try {
    return {
      entries: parseStoredReceiptRecheckHistory(
        window.localStorage.getItem(storageKey),
      ),
      error: null,
    };
  } catch {
    return {
      entries: [],
      error: "Local recheck history could not be loaded.",
    };
  }
}

function LiveRecheckResult({
  comparison,
  currentSnapshot,
  hashVerified,
  onHistoryEntry,
  receipt,
  receiptAccountValueContext,
  recheckHistorySummary,
  recheckedAtIso,
}: {
  comparison: snapshot_comparison;
  currentSnapshot: normalized_account_snapshot;
  hashVerified?: boolean;
  onHistoryEntry: (entry: receipt_recheck_history_entry) => void;
  receipt: risk_receipt;
  receiptAccountValueContext: receipt_account_value_context | null;
  recheckHistorySummary: receipt_recheck_history_summary;
  recheckedAtIso: string;
}) {
  const savedHistoryEntrySignatureRef = useRef<string | null>(null);
  const [thresholds, setThresholds] =
    useState<receipt_recheck_watchlist_thresholds>(
      defaultReceiptRecheckWatchlistThresholds,
    );
  const [marketHistoryState, setMarketHistoryState] =
    useState<market_history_state>({ status: "idle" });
  const marketContext = buildMarketContext(comparison);
  const marketHistoryMarkets = getMarketHistoryMarkets(marketContext);
  const volatilityBuffer =
    marketHistoryState.status === "loaded"
      ? buildReceiptVolatilityBuffer({
          marketContext,
          histories: marketHistoryState.histories,
          fetchedAtIso: marketHistoryState.fetchedAtIso,
          windowHours: marketHistoryState.windowHours,
          interval: marketHistoryState.interval,
        })
      : null;
  const riskDriverComparison = compareReceiptRiskDrivers({
    savedSnapshot: receipt.snapshot,
    currentSnapshot,
  });
  const recheckWatchlist = buildReceiptRecheckWatchlist({
    marketContext,
    riskDriverComparison,
    thresholds,
    volatilityBuffer,
  });
  const changeSummary = buildReceiptChangeSummary({
    comparison,
    marketContext,
    accountValueContext: receiptAccountValueContext,
  });
  const marketRegime = buildReceiptMarketRegime({
    accountValueContext: receiptAccountValueContext,
    comparison,
    marketContext,
    riskDriverComparison,
    volatilityBuffer,
    watchlist: recheckWatchlist,
  });
  const marketRegimeDrilldown = buildReceiptMarketRegimeDrilldown({
    comparison,
    marketContext,
    riskDriverComparison,
    volatilityBuffer,
    watchlist: recheckWatchlist,
  });
  const assistantContext: receipt_risk_assistant_context = {
    receipt,
    comparison,
    marketContext,
    changeSummary,
    riskDriverComparison,
    recheckWatchlist,
    marketRegime,
    marketRegimeDrilldown,
    volatilityBuffer,
    accountValueContext: receiptAccountValueContext,
    recheckHistorySummary,
    hashVerified,
  };
  const watchlistAssistantResponse = answerReceiptRiskQuestion({
    context: assistantContext,
    question: "What should I inspect first in the recheck watchlist?",
  });
  const reviewPacket = buildReceiptReviewPacket({
    receipt,
    comparison,
    marketContext,
    changeSummary,
    riskDriverComparison,
    marketRegime,
    marketRegimeDrilldown,
    recheckHistorySummary,
    volatilityBuffer,
    watchlist: recheckWatchlist,
    watchlistAssistantResponse,
    hashVerified,
  });
  const historyEntry = createReceiptRecheckHistoryEntry({
    comparison,
    currentSnapshot,
    marketRegime,
    marketRegimeDrilldown,
    receiptId: receipt.id,
    recheckedAtIso,
    volatilityLoaded: marketHistoryState.status === "loaded",
    watchlist: recheckWatchlist,
  });
  const historyEntrySignature = JSON.stringify(historyEntry);
  const assistantKey = [
    receipt.id,
    comparison.status,
    comparison.changed_position_count,
    comparison.max_abs_mark_price_change_percent,
    changeSummary.label,
    riskDriverComparison.label,
    riskDriverComparison.current_top_driver_market ?? "no-current-driver",
    recheckWatchlist.label,
    String(recheckWatchlist.high_count),
    marketRegime.label,
    String(marketRegime.high_count),
    marketRegimeDrilldown.focus_market ?? "no-regime-drilldown-focus",
    String(marketRegimeDrilldown.high_count),
    volatilityBuffer?.label ?? "no-volatility-buffer",
    String(volatilityBuffer?.high_count ?? 0),
    recheckHistorySummary.label,
    String(recheckHistorySummary.entry_count),
    recheckHistorySummary.latest_entry?.id ?? "no-latest-history",
    String(recheckHistorySummary.risk_score_delta ?? "no-history-delta"),
    formatThresholdSignature(recheckWatchlist.thresholds),
    receiptAccountValueContext?.label ?? "no-account-context",
  ].join(":");

  useEffect(() => {
    if (savedHistoryEntrySignatureRef.current === historyEntrySignature) {
      return;
    }

    savedHistoryEntrySignatureRef.current = historyEntrySignature;
    onHistoryEntry(historyEntry);
  }, [historyEntry, historyEntrySignature, onHistoryEntry]);

  async function loadMarketHistory() {
    if (marketHistoryMarkets.length === 0) {
      return;
    }

    setMarketHistoryState({ status: "loading" });

    try {
      const response = await fetch(
        `/api/hyperliquid/market-history?markets=${encodeURIComponent(
          marketHistoryMarkets.join(","),
        )}`,
      );
      const body = (await response.json()) as hyperliquid_market_history_response;

      if (!response.ok || !("histories" in body)) {
        throw new Error(
          "error" in body
            ? body.error
            : "Hyperliquid market history lookup failed.",
        );
      }

      setMarketHistoryState({
        status: "loaded",
        fetchedAtIso: body.fetched_at_iso,
        histories: body.histories,
        interval: body.interval,
        windowHours: body.window_hours,
      });
    } catch (error) {
      setMarketHistoryState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Hyperliquid market history lookup failed.",
      });
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="rounded-lg border border-stone-300 bg-white px-3 py-1 text-sm font-semibold text-stone-950">
              {statusLabels[comparison.status]}
            </span>
            <p className="mt-3 text-sm font-medium text-stone-800">
              {comparison.headline}
            </p>
          </div>
          <dl className="grid gap-2 text-sm sm:min-w-52">
            <MiniMetric
              label="Position changes"
              value={String(comparison.changed_position_count)}
            />
            <MiniMetric
              label="Max mark move"
              value={formatAbsPercent(
                comparison.max_abs_mark_price_change_percent,
              )}
            />
          </dl>
        </div>
      </div>

      <ReceiptChangeSummaryResult summary={changeSummary} />
      <ReceiptMarketRegimeResult regime={marketRegime} />
      <ReceiptMarketRegimeDrilldownResult drilldown={marketRegimeDrilldown} />
      <ReceiptRiskDriverComparisonResult comparison={riskDriverComparison} />
      <MarketContextResult context={marketContext} />
      <ReceiptVolatilityBufferResult
        marketHistoryMarkets={marketHistoryMarkets}
        onLoadMarketHistory={loadMarketHistory}
        state={marketHistoryState}
        volatilityBuffer={volatilityBuffer}
      />
      <ReceiptRecheckThresholdsResult
        onThresholdsChange={setThresholds}
        thresholds={thresholds}
      />
      <ReceiptRecheckWatchlistResult watchlist={recheckWatchlist} />
      <ReceiptRiskAssistantPanel
        context={assistantContext}
        key={assistantKey}
      />
      <ReceiptReviewPacketResult packet={reviewPacket} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ComparisonMetric
          comparison={comparison.metrics.risk_score}
          label="Risk score"
          valueFormatter={formatScore}
        />
        <ComparisonMetric
          comparison={comparison.metrics.margin_usage_bps}
          deltaFormatter={formatSignedPercentFromBps}
          label="Margin usage"
          valueFormatter={formatPercentFromBps}
        />
        <ComparisonMetric
          comparison={comparison.metrics.min_liquidation_distance_bps}
          deltaFormatter={formatSignedPercentFromBps}
          label="Min liquidation distance"
          valueFormatter={formatPercentFromBps}
        />
        <ComparisonMetric
          comparison={comparison.metrics.account_value_usd}
          label="Account value"
          valueFormatter={formatNullableUsd}
        />
        <ComparisonMetric
          comparison={comparison.metrics.total_notional_usd}
          label="Total notional"
          valueFormatter={formatNullableUsd}
        />
        <ComparisonMetric
          comparison={comparison.metrics.daily_funding_usd}
          label="Daily funding"
          valueFormatter={formatSignedNullableUsd}
        />
      </div>

      {comparison.positions.length === 0 ? (
        <p className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-stone-600">
          No receipt or current open positions to compare.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-stone-200">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-stone-100 text-xs uppercase text-stone-600">
              <tr>
                <th className="px-4 py-3">Market</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Mark move</th>
                <th className="px-4 py-3">Liquidation distance</th>
                <th className="px-4 py-3">Daily funding</th>
                <th className="px-4 py-3">Notional</th>
              </tr>
            </thead>
            <tbody>
              {comparison.positions.map((position) => (
                <tr className="border-t border-stone-200" key={position.market}>
                  <td className="px-4 py-3 font-mono">{position.market}</td>
                  <td className="px-4 py-3">
                    {positionStatusLabels[position.status]}
                  </td>
                  <td className="px-4 py-3">
                    {formatNullableSignedPercent(
                      position.mark_price_change_percent,
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {formatMetricPair(
                      position.liquidation_distance_bps,
                      formatPercentFromBps,
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {formatMetricPair(
                      position.daily_funding_usd,
                      formatSignedNullableUsd,
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {formatMetricPair(position.notional_usd, formatNullableUsd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ReceiptRecheckThresholdsResult({
  onThresholdsChange,
  thresholds,
}: {
  onThresholdsChange: (thresholds: receipt_recheck_watchlist_thresholds) => void;
  thresholds: receipt_recheck_watchlist_thresholds;
}) {
  function updateThreshold(
    key: keyof receipt_recheck_watchlist_thresholds,
    value: number,
  ) {
    onThresholdsChange(
      normalizeUiThresholds({
        ...thresholds,
        [key]: value,
      }),
    );
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-stone-200 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold">Review thresholds</h3>
          <p className="mt-1 text-sm text-stone-600">
            Tune which saved/current market changes appear in the recheck
            watchlist and copied review packet.
          </p>
        </div>
        <button
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-950"
          onClick={() =>
            onThresholdsChange(defaultReceiptRecheckWatchlistThresholds)
          }
          type="button"
        >
          Reset defaults
        </button>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <ThresholdInput
          description="High cue when listed buffer is at or below this value."
          label="Thin buffer bps"
          min={0}
          onValueChange={(value) =>
            updateThreshold("thin_liquidation_distance_bps", value)
          }
          step={50}
          value={thresholds.thin_liquidation_distance_bps}
        />
        <ThresholdInput
          description="Watch cue when listed buffer is at or below this value."
          label="Tight buffer bps"
          min={0}
          onValueChange={(value) =>
            updateThreshold("tight_liquidation_distance_bps", value)
          }
          step={50}
          value={thresholds.tight_liquidation_distance_bps}
        />
        <ThresholdInput
          description="Watch cue when mark moves this percent toward liquidation."
          label="Adverse mark %"
          min={0}
          onValueChange={(value) =>
            updateThreshold("material_mark_move_percent", value)
          }
          step={0.25}
          value={thresholds.material_mark_move_percent}
        />
        <ThresholdInput
          description="Cue when the heuristic driver score changes this much."
          label="Driver score delta"
          min={0}
          onValueChange={(value) =>
            updateThreshold("material_driver_score_delta", value)
          }
          step={1}
          value={thresholds.material_driver_score_delta}
        />
        <ThresholdInput
          description="Cue when daily funding cost increases by this amount."
          label="Daily funding USD"
          min={0}
          onValueChange={(value) =>
            updateThreshold("material_daily_funding_usd", value)
          }
          step={1}
          value={thresholds.material_daily_funding_usd}
        />
        <ThresholdInput
          description="Cue when the 8h funding rate changes by this many bps."
          label="8h funding bps"
          min={0}
          onValueChange={(value) =>
            updateThreshold("material_funding_8h_bps", value)
          }
          step={0.25}
          value={thresholds.material_funding_8h_bps}
        />
        <ThresholdInput
          description="Info cue when open interest changes by this many millions."
          label="Open interest USD m"
          min={0}
          onValueChange={(value) =>
            updateThreshold("material_open_interest_delta_usd", value * 1_000_000)
          }
          step={5}
          value={thresholds.material_open_interest_delta_usd / 1_000_000}
        />
      </div>

      <p className="border-t border-stone-200 px-4 py-3 text-xs text-stone-500">
        These local settings change review sensitivity only. They do not change
        the saved receipt, snapshot hash, live Hyperliquid data, or the app risk
        model.
      </p>
    </section>
  );
}

function ThresholdInput({
  description,
  label,
  min,
  onValueChange,
  step,
  value,
}: {
  description: string;
  label: string;
  min: number;
  onValueChange: (value: number) => void;
  step: number;
  value: number;
}) {
  return (
    <label className="flex min-h-36 flex-col gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3">
      <span className="text-sm font-semibold text-stone-950">{label}</span>
      <input
        aria-label={label}
        className="min-h-10 w-full rounded-lg border border-stone-300 bg-white px-3 font-mono text-sm text-stone-950 outline-none focus:border-stone-950"
        min={min}
        onChange={(event) =>
          onValueChange(parseThresholdInput(event.target.value))
        }
        step={step}
        type="number"
        value={formatThresholdInput(value)}
      />
      <span className="text-xs leading-5 text-stone-600">{description}</span>
    </label>
  );
}

function ReceiptVolatilityBufferResult({
  marketHistoryMarkets,
  onLoadMarketHistory,
  state,
  volatilityBuffer,
}: {
  marketHistoryMarkets: string[];
  onLoadMarketHistory: () => void;
  state: market_history_state;
  volatilityBuffer: receipt_volatility_buffer | null;
}) {
  const canLoad = marketHistoryMarkets.length > 0 && state.status !== "loading";

  return (
    <section className="rounded-lg border border-stone-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-stone-200 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold">Volatility buffer</h3>
          <p className="mt-1 text-sm text-stone-600">
            Compare current listed liquidation distance with public 24h
            Hyperliquid candle range and ATR-style movement.
          </p>
        </div>
        <button
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-stone-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-stone-400"
          disabled={!canLoad}
          onClick={onLoadMarketHistory}
          type="button"
        >
          {state.status === "loading" ? "Loading..." : "Load 24h volatility"}
        </button>
      </div>

      {state.status === "idle" ? (
        <p className="px-4 py-3 text-sm text-stone-600">
          {marketHistoryMarkets.length === 0
            ? "No comparable live positions are available for 24h volatility context."
            : `Ready to load public candle history for ${marketHistoryMarkets.join(", ")}.`}
        </p>
      ) : null}

      {state.status === "loading" ? (
        <p className="px-4 py-3 text-sm text-stone-600">
          Loading public market history from the read-only Hyperliquid info
          endpoint.
        </p>
      ) : null}

      {state.status === "error" ? (
        <p className="border-t border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-950">
          {state.message}
        </p>
      ) : null}

      {state.status === "loaded" && volatilityBuffer ? (
        <>
          <div className="flex flex-col gap-3 border-t border-stone-200 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-stone-800">
                {volatilityBuffer.headline}
              </p>
              <p className="mt-1 text-sm text-stone-600">
                {volatilityBuffer.summary}
              </p>
            </div>
            <span
              className={`w-fit rounded-lg border px-3 py-2 text-sm font-semibold ${volatilityBufferTone[volatilityBuffer.label]}`}
            >
              {volatilityBufferLabels[volatilityBuffer.label]}
            </span>
          </div>

          <dl className="grid gap-3 border-t border-stone-200 p-4 text-sm sm:grid-cols-2 lg:grid-cols-5">
            <MiniMetric
              label="Focus market"
              value={volatilityBuffer.focus_market ?? "n/a"}
            />
            <MiniMetric
              label="Matched"
              value={String(volatilityBuffer.matched_market_count)}
            />
            <MiniMetric label="High" value={String(volatilityBuffer.high_count)} />
            <MiniMetric
              label="Watch"
              value={String(volatilityBuffer.watch_count)}
            />
            <MiniMetric
              label="Window"
              value={`${volatilityBuffer.window_hours}h ${volatilityBuffer.interval}`}
            />
          </dl>

          {volatilityBuffer.rows.length === 0 ? (
            <p className="border-t border-stone-200 px-4 py-3 text-sm text-stone-600">
              No volatility-buffer rows are available.
            </p>
          ) : (
            <div className="overflow-x-auto border-t border-stone-200">
              <table className="w-full min-w-[1120px] text-left text-sm">
                <thead className="bg-stone-100 text-xs uppercase text-stone-600">
                  <tr>
                    <th className="px-4 py-3">Market</th>
                    <th className="px-4 py-3">Read</th>
                    <th className="px-4 py-3">Current buffer</th>
                    <th className="px-4 py-3">24h range</th>
                    <th className="px-4 py-3">Hourly ATR</th>
                    <th className="px-4 py-3">ATR buffer</th>
                    <th className="px-4 py-3">24h move</th>
                  </tr>
                </thead>
                <tbody>
                  {volatilityBuffer.rows.map((row) => (
                    <tr className="border-t border-stone-200" key={row.market}>
                      <td className="px-4 py-3 font-mono">{row.market}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-lg border px-2 py-1 text-xs font-semibold uppercase ${volatilityBufferSeverityTone[row.severity]}`}
                        >
                          {row.severity}
                        </span>
                        <p className="mt-2 max-w-72 text-xs leading-5 text-stone-600">
                          {row.summary}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {formatNullablePlainPercent(
                          row.current_liquidation_distance_percent,
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {formatNullablePlainPercent(row.high_low_range_percent)}
                        <p className="mt-1 text-xs text-stone-500">
                          Ratio: {formatNullableMultiple(row.range_to_buffer_ratio)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {formatNullablePlainPercent(
                          row.average_true_range_percent,
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {formatNullableMultiple(row.atr_buffer_multiple)}
                      </td>
                      <td className="px-4 py-3">
                        {formatNullableSignedPercent(row.price_change_percent)}
                        <p className="mt-1 text-xs text-stone-500">
                          Adverse:{" "}
                          {formatNullablePlainPercent(
                            row.adverse_price_change_percent,
                          )}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}

      <p className="border-t border-stone-200 px-4 py-3 text-xs text-stone-500">
        Volatility buffer uses public 24h candles for context. It is not an
        exact liquidation monitor, price forecast, or trade recommendation.
      </p>
    </section>
  );
}

function ReceiptReviewPacketResult({
  packet,
}: {
  packet: receipt_review_packet;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );

  async function copyPacket() {
    try {
      await navigator.clipboard.writeText(packet.markdown);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-stone-200 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold">Review packet</h3>
          <p className="mt-1 text-sm font-medium text-stone-800">
            {packet.title}
          </p>
          <p className="mt-1 text-sm text-stone-600">{packet.summary}</p>
        </div>
        <button
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-stone-950 px-4 text-sm font-semibold text-white"
          onClick={copyPacket}
          type="button"
        >
          Copy markdown
        </button>
      </div>

      {copyState === "copied" ? (
        <p className="border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          Review packet copied.
        </p>
      ) : null}
      {copyState === "error" ? (
        <p className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900">
          Clipboard copy failed. Select and copy the markdown below.
        </p>
      ) : null}

      <textarea
        className="h-72 w-full resize-y border-0 bg-stone-50 p-4 font-mono text-xs leading-5 text-stone-950 outline-none"
        readOnly
        value={packet.markdown}
      />

      <p className="border-t border-stone-200 px-4 py-3 text-xs text-stone-500">
        This packet is a copyable review summary. Use the full portable receipt
        bundle when another browser needs to recompute the snapshot hash.
      </p>
    </section>
  );
}

function ReceiptRecheckWatchlistResult({
  watchlist,
}: {
  watchlist: receipt_recheck_watchlist;
}) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-stone-200 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold">Recheck watchlist</h3>
          <p className="mt-1 text-sm font-medium text-stone-800">
            {watchlist.headline}
          </p>
          <p className="mt-1 text-sm text-stone-600">{watchlist.summary}</p>
        </div>
        <span
          className={`rounded-lg border px-3 py-2 text-sm font-semibold ${recheckWatchlistTone[watchlist.label]}`}
        >
          {recheckWatchlistLabels[watchlist.label]}
        </span>
      </div>

      <dl className="grid gap-3 p-4 text-sm sm:grid-cols-4">
        <MiniMetric label="Items" value={String(watchlist.item_count)} />
        <MiniMetric label="High" value={String(watchlist.high_count)} />
        <MiniMetric label="Watch" value={String(watchlist.watch_count)} />
        <MiniMetric label="Info" value={String(watchlist.info_count)} />
      </dl>

      {watchlist.items.length === 0 ? (
        <p className="border-t border-stone-200 px-4 py-3 text-sm text-stone-600">
          No ranked review cues crossed the current watchlist thresholds.
        </p>
      ) : (
        <div className="divide-y divide-stone-200 border-t border-stone-200">
          {watchlist.items.map((item) => (
            <article className="px-4 py-3" key={item.id}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-mono text-xs text-stone-500">
                    {item.market}
                  </p>
                  <h4 className="mt-1 text-sm font-semibold text-stone-950">
                    {item.title}
                  </h4>
                  <p className="mt-1 text-sm text-stone-700">{item.detail}</p>
                </div>
                <span
                  className={`w-fit rounded-lg border px-2 py-1 text-xs font-semibold uppercase ${recheckWatchSeverityTone[item.severity]}`}
                >
                  {recheckWatchSeverityLabels[item.severity]}
                </span>
              </div>
              <ul className="mt-3 space-y-1 text-xs leading-5 text-stone-600">
                {item.review_points.map((point) => (
                  <li className="flex gap-2" key={point}>
                    <span
                      aria-hidden="true"
                      className="mt-2 h-1.5 w-1.5 rounded-full bg-stone-400"
                    />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}

      <p className="border-t border-stone-200 px-4 py-3 text-xs text-stone-500">
        The watchlist ranks saved/current receipt review cues. It is not a
        trading recommendation or Hyperliquid&apos;s official risk engine.
      </p>
    </section>
  );
}

function ReceiptRecheckHistoryResult({
  entries,
  error,
  onClear,
  summary,
}: {
  entries: receipt_recheck_history_entry[];
  error: string | null;
  onClear: () => void;
  summary: receipt_recheck_history_summary;
}) {
  const latestEntry = entries[0] ?? null;

  return (
    <section className="mt-4 rounded-lg border border-stone-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-stone-200 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold">Local recheck history</h3>
          <p className="mt-1 text-sm text-stone-600">
            Newest-first compact timeline saved in this browser only.
          </p>
        </div>
        <button
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-950 disabled:cursor-not-allowed disabled:text-stone-400"
          disabled={entries.length === 0}
          onClick={onClear}
          type="button"
        >
          Clear history
        </button>
      </div>

      {error ? (
        <p className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-950">
          {error}
        </p>
      ) : null}

      {latestEntry ? (
        <>
          <div className="border-b border-stone-200 px-4 py-3">
            <p className="text-sm font-medium text-stone-800">
              {summary.headline}
            </p>
            <p className="mt-1 text-sm text-stone-600">{summary.summary}</p>
          </div>
          <dl className="grid gap-3 p-4 text-sm sm:grid-cols-2 lg:grid-cols-5">
            <MiniMetric label="Saved checks" value={String(entries.length)} />
            <MiniMetric
              label="Latest recheck"
              value={formatIsoDate(latestEntry.rechecked_at_iso)}
            />
            <MiniMetric
              label="Risk score"
              value={`${formatScore(latestEntry.current_risk_score)} · ${latestEntry.current_risk_label}`}
            />
            <MiniMetric
              label="Account value"
              value={formatUsd(latestEntry.current_account_value_usd)}
            />
            <MiniMetric
              label="Min buffer"
              value={formatPercentFromBps(
                latestEntry.current_min_liquidation_distance_bps,
              )}
            />
          </dl>
        </>
      ) : null}

      {entries.length === 0 ? (
        <p className="px-4 py-3 text-sm text-stone-600">
          Run a live recheck to save a compact local history row for this
          receipt.
        </p>
      ) : (
        <div className="divide-y divide-stone-200 border-t border-stone-200">
          {entries.map((entry) => (
            <article className="px-4 py-3" key={entry.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-mono text-xs text-stone-500">
                    {formatIsoDate(entry.rechecked_at_iso)} · data{" "}
                    {formatIsoDate(entry.current_data_time_iso)}
                  </p>
                  <h4 className="mt-1 text-sm font-semibold text-stone-950">
                    {entry.comparison_headline}
                  </h4>
                  <p className="mt-1 text-sm text-stone-600">
                    {entry.top_drilldown_market
                      ? `${entry.top_drilldown_market}: ${entry.top_drilldown_primary_cue}`
                      : "No per-market drilldown row captured."}
                  </p>
                </div>
                <span
                  className={`w-fit rounded-lg border px-3 py-2 text-sm font-semibold ${marketRegimeTone[entry.market_regime_severity]}`}
                >
                  {marketRegimeLabels[entry.market_regime_label]}
                </span>
              </div>

              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <MiniMetric
                  label="Risk"
                  value={`${formatScore(entry.current_risk_score)} · ${entry.current_risk_label}`}
                />
                <MiniMetric
                  label="Focus"
                  value={entry.market_regime_focus_market ?? "n/a"}
                />
                <MiniMetric
                  label="Watch cues"
                  value={formatHistoryWatchCounts(entry)}
                />
                <MiniMetric
                  label="Volatility"
                  value={entry.volatility_loaded ? "loaded" : "not loaded"}
                />
              </dl>

              {entry.top_drilldown_summary ? (
                <p className="mt-3 text-xs leading-5 text-stone-600">
                  {entry.top_drilldown_summary}
                </p>
              ) : null}

              <p className="mt-2 text-xs leading-5 text-stone-500">
                Current buffer{" "}
                {formatPercentFromBps(
                  entry.top_drilldown_current_liquidation_distance_bps,
                )}{" "}
                · funding burden{" "}
                {formatNullablePlainBps(
                  entry.top_drilldown_current_funding_burden_bps,
                )}{" "}
                · max mark move{" "}
                {formatAbsPercent(entry.max_abs_mark_price_change_percent)}
              </p>
            </article>
          ))}
        </div>
      )}

      <p className="border-t border-stone-200 px-4 py-3 text-xs text-stone-500">
        History entries are local-only summaries for comparing rechecks over
        time. They are not a live alert feed, accounting ledger, or trading
        recommendation.
      </p>
    </section>
  );
}

function ReceiptRiskDriverComparisonResult({
  comparison,
}: {
  comparison: receipt_risk_driver_comparison;
}) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-stone-200 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold">
            Risk drivers since receipt
          </h3>
          <p className="mt-1 text-sm font-medium text-stone-800">
            {comparison.headline}
          </p>
          <p className="mt-1 text-sm text-stone-600">
            {comparison.summary}
          </p>
        </div>
        <span
          className={`rounded-lg border px-3 py-2 text-sm font-semibold ${riskDriverComparisonTone[comparison.severity]}`}
        >
          {riskDriverComparisonLabels[comparison.label]}
        </span>
      </div>

      <dl className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniMetric
          label="Saved top"
          value={comparison.saved_top_driver_market ?? "n/a"}
        />
        <MiniMetric
          label="Current top"
          value={comparison.current_top_driver_market ?? "n/a"}
        />
        <MiniMetric
          label="Score delta"
          value={formatSignedNullableNumber(
            comparison.top_driver_score_delta,
          )}
        />
        <MiniMetric
          label="Daily funding delta"
          value={formatSignedNullableUsd(comparison.daily_funding_delta_usd)}
        />
        <MiniMetric
          label="Gross exposure delta"
          value={formatSignedPercentFromBps(
            comparison.gross_exposure_delta_bps,
          )}
        />
        <MiniMetric
          label="Largest share delta"
          value={formatSignedPercentFromBps(
            comparison.largest_position_share_delta_bps,
          )}
        />
        <MiniMetric
          label="Closest buffer delta"
          value={formatSignedPercentFromBps(
            comparison.closest_liquidation_distance_delta_bps,
          )}
        />
        <MiniMetric
          label="Net directional delta"
          value={formatSignedNullableUsd(
            comparison.net_directional_notional_delta_usd,
          )}
        />
      </dl>

      <ul className="space-y-2 border-t border-stone-200 p-4 text-sm text-stone-700">
        {comparison.review_points.map((point) => (
          <li className="flex gap-2" key={point}>
            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 rounded-full bg-stone-400" />
            <span>{point}</span>
          </li>
        ))}
      </ul>

      {comparison.market_changes.length === 0 ? (
        <p className="border-t border-stone-200 px-4 py-3 text-sm text-stone-600">
          No position-level driver rows are available.
        </p>
      ) : (
        <div className="overflow-x-auto border-t border-stone-200">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="bg-stone-100 text-xs uppercase text-stone-600">
              <tr>
                <th className="px-4 py-3">Market</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Primary factor</th>
                <th className="px-4 py-3">Driver score</th>
                <th className="px-4 py-3">Liq. buffer</th>
                <th className="px-4 py-3">Daily funding</th>
                <th className="px-4 py-3">Read</th>
              </tr>
            </thead>
            <tbody>
              {comparison.market_changes.map((marketChange) => (
                <tr className="border-t border-stone-200" key={marketChange.market}>
                  <td className="px-4 py-3 font-mono">{marketChange.market}</td>
                  <td className="px-4 py-3">
                    {riskDriverMarketStatusLabels[marketChange.status]}
                  </td>
                  <td className="px-4 py-3">
                    {formatPrimaryDriverPair(
                      marketChange.saved_driver?.primary_driver ?? null,
                      marketChange.current_driver?.primary_driver ?? null,
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {formatDriverScorePair(
                      marketChange.saved_driver?.driver_score ?? null,
                      marketChange.current_driver?.driver_score ?? null,
                    )}
                    <p className="mt-1 text-xs text-stone-500">
                      Delta:{" "}
                      {formatSignedNullableNumber(
                        marketChange.driver_score_delta,
                      )}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {formatDriverMetricPair(
                      marketChange.saved_driver?.liquidation_distance_bps ??
                        null,
                      marketChange.current_driver?.liquidation_distance_bps ??
                        null,
                      formatPercentFromBps,
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {formatDriverMetricPair(
                      marketChange.saved_driver?.daily_funding_usd ?? null,
                      marketChange.current_driver?.daily_funding_usd ?? null,
                      formatSignedNullableUsd,
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="max-w-72 text-xs leading-5 text-stone-600">
                      {marketChange.summary}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="border-t border-stone-200 px-4 py-3 text-xs text-stone-500">
        Driver comparison reuses the app&apos;s heuristic position-driver score
        on the saved receipt and fresh snapshot. It is not a protocol-official
        liquidation monitor or a trade recommendation.
      </p>
    </section>
  );
}

function ReceiptChangeSummaryResult({
  summary,
}: {
  summary: receipt_change_summary;
}) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-stone-200 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold">Receipt change summary</h3>
          <p className="mt-1 text-sm font-medium text-stone-800">
            {summary.headline}
          </p>
          <p className="mt-1 text-sm text-stone-600">
            {summary.primary_detail}
          </p>
        </div>
        <span
          className={`rounded-lg border px-3 py-2 text-sm font-semibold ${receiptSummaryTone[summary.severity]}`}
        >
          {receiptSummaryLabels[summary.label]}
        </span>
      </div>

      <ul className="space-y-2 p-4 text-sm text-stone-700">
        {summary.review_points.map((point) => (
          <li className="flex gap-2" key={point}>
            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 rounded-full bg-stone-400" />
            <span>{point}</span>
          </li>
        ))}
      </ul>

      <p className="border-t border-stone-200 px-4 py-3 text-xs text-stone-500">
        This summary is a read-only review aid. It does not recommend opening,
        closing, increasing, or reducing any position.
      </p>
    </section>
  );
}

function ReceiptMarketRegimeResult({
  regime,
}: {
  regime: receipt_market_regime;
}) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-stone-200 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold">Market regime</h3>
          <p className="mt-1 text-sm font-medium text-stone-800">
            {regime.headline}
          </p>
          <p className="mt-1 text-sm text-stone-600">{regime.summary}</p>
        </div>
        <span
          className={`rounded-lg border px-3 py-2 text-sm font-semibold ${marketRegimeTone[regime.severity]}`}
        >
          {marketRegimeLabels[regime.label]}
        </span>
      </div>

      <dl className="grid gap-3 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <MiniMetric label="Focus market" value={regime.focus_market ?? "n/a"} />
        <MiniMetric label="Critical" value={String(regime.critical_count)} />
        <MiniMetric label="High" value={String(regime.high_count)} />
        <MiniMetric label="Watch" value={String(regime.watch_count)} />
        <MiniMetric label="Info" value={String(regime.info_count)} />
        <MiniMetric
          label="Current min buffer"
          value={formatPercentFromBps(
            regime.metrics.current_min_liquidation_distance_bps,
          )}
        />
        <MiniMetric
          label="Funding burden"
          value={formatNullablePlainBps(
            regime.metrics.current_funding_burden_bps,
          )}
        />
        <MiniMetric
          label="Current drawdown"
          value={formatNullablePlainPercent(
            regime.metrics.current_drawdown_percent,
          )}
        />
        <MiniMetric
          label="Max mark move"
          value={formatAbsPercent(regime.metrics.max_mark_move_percent)}
        />
      </dl>

      {regime.signals.length === 0 ? (
        <p className="border-t border-stone-200 px-4 py-3 text-sm text-stone-600">
          No market-regime signals crossed the current app thresholds.
        </p>
      ) : (
        <div className="divide-y divide-stone-200 border-t border-stone-200">
          {regime.signals.map((signal) => (
            <article className="px-4 py-3" key={signal.id}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-mono text-xs text-stone-500">
                    {signal.category.replaceAll("_", " ")}
                  </p>
                  <h4 className="mt-1 text-sm font-semibold text-stone-950">
                    {signal.title}
                  </h4>
                  <p className="mt-1 text-sm text-stone-700">
                    {signal.detail}
                  </p>
                </div>
                <span
                  className={`w-fit rounded-lg border px-2 py-1 text-xs font-semibold uppercase ${marketRegimeTone[signal.severity]}`}
                >
                  {signal.severity}
                </span>
              </div>
              <ul className="mt-3 space-y-1 text-xs leading-5 text-stone-600">
                {signal.review_points.map((point) => (
                  <li className="flex gap-2" key={point}>
                    <span
                      aria-hidden="true"
                      className="mt-2 h-1.5 w-1.5 rounded-full bg-stone-400"
                    />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}

      <p className="border-t border-stone-200 px-4 py-3 text-xs text-stone-500">
        Market regime combines local receipt recheck signals, funding burden,
        sampled account drawdown, and loaded public volatility context. It is
        not a forecast, liquidation alert, or trade recommendation.
      </p>
    </section>
  );
}

function ReceiptMarketRegimeDrilldownResult({
  drilldown,
}: {
  drilldown: receipt_market_regime_drilldown;
}) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white">
      <div className="border-b border-stone-200 px-4 py-3">
        <h3 className="text-base font-semibold">Regime by market</h3>
        <p className="mt-1 text-sm font-medium text-stone-800">
          {drilldown.headline}
        </p>
        <p className="mt-1 text-sm text-stone-600">{drilldown.summary}</p>
      </div>

      <dl className="grid gap-3 p-4 text-sm sm:grid-cols-2 lg:grid-cols-5">
        <MiniMetric label="Focus market" value={drilldown.focus_market ?? "n/a"} />
        <MiniMetric label="Critical" value={String(drilldown.critical_count)} />
        <MiniMetric label="High" value={String(drilldown.high_count)} />
        <MiniMetric label="Watch" value={String(drilldown.watch_count)} />
        <MiniMetric label="Info" value={String(drilldown.info_count)} />
      </dl>

      {drilldown.rows.length === 0 ? (
        <p className="border-t border-stone-200 px-4 py-3 text-sm text-stone-600">
          No per-market regime rows are available for this recheck.
        </p>
      ) : (
        <div className="overflow-x-auto border-t border-stone-200">
          <table className="w-full min-w-[1280px] text-left text-sm">
            <thead className="bg-stone-100 text-xs uppercase text-stone-600">
              <tr>
                <th className="px-4 py-3">Market</th>
                <th className="px-4 py-3">Cue</th>
                <th className="px-4 py-3">Listed buffer</th>
                <th className="px-4 py-3">Funding burden</th>
                <th className="px-4 py-3">Mark move</th>
                <th className="px-4 py-3">Volatility</th>
                <th className="px-4 py-3">Open interest</th>
                <th className="px-4 py-3">Watch cues</th>
              </tr>
            </thead>
            <tbody>
              {drilldown.rows.map((row) => (
                <tr className="border-t border-stone-200" key={row.market}>
                  <td className="px-4 py-3 align-top">
                    <span className="font-mono">{row.market}</span>
                    <p className="mt-1 text-xs text-stone-500">
                      {positionStatusLabels[row.status]}
                    </p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span
                      className={`w-fit rounded-lg border px-2 py-1 text-xs font-semibold uppercase ${marketRegimeTone[row.severity]}`}
                    >
                      {row.severity}
                    </span>
                    <p className="mt-2 max-w-80 font-medium text-stone-950">
                      {row.primary_cue}
                    </p>
                    <p className="mt-1 max-w-80 text-xs leading-5 text-stone-600">
                      {row.summary}
                    </p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    {formatPercentFromBps(row.current_liquidation_distance_bps)}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className="font-mono">
                      {formatNullablePlainBps(row.current_funding_burden_bps)}
                    </span>
                    <p className="mt-1 text-xs text-stone-500">
                      {formatSignedNullableUsd(row.current_daily_funding_usd)}
                      /day
                    </p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span>{markMoveLabels[row.mark_move_direction]}</span>
                    <p className="mt-1 font-mono text-xs text-stone-500">
                      {formatNullableSignedPercent(row.mark_price_change_percent)}
                    </p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    {row.volatility_severity ?? "not loaded"}
                    <p className="mt-1 text-xs text-stone-500">
                      Range/buffer{" "}
                      {formatNullableMultiple(
                        row.volatility_range_to_buffer_ratio,
                      )}
                    </p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    {formatSignedNullableUsd(row.open_interest_delta_usd)}
                  </td>
                  <td className="px-4 py-3 align-top">
                    {formatDrilldownWatchCounts(row)}
                    <ul className="mt-2 space-y-1 text-xs leading-5 text-stone-600">
                      {row.review_points.slice(0, 2).map((point) => (
                        <li className="flex gap-2" key={point}>
                          <span
                            aria-hidden="true"
                            className="mt-2 h-1.5 w-1.5 rounded-full bg-stone-400"
                          />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="border-t border-stone-200 px-4 py-3 text-xs text-stone-500">
        Per-market regime rows explain the account-level regime with visible
        receipt recheck fields. They are review context, not forecasts,
        liquidation alerts, or trade recommendations.
      </p>
    </section>
  );
}

function MarketContextResult({ context }: { context: market_context }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-stone-200 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold">Market context since receipt</h3>
          <p className="mt-1 text-sm font-medium text-stone-800">
            {context.headline}
          </p>
          <p className="mt-1 text-sm text-stone-600">{context.summary}</p>
        </div>
        <span
          className={`rounded-lg border px-3 py-2 text-sm font-semibold ${marketContextTone[context.label]}`}
        >
          {marketContextLabels[context.label]}
        </span>
      </div>

      <dl className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniMetric
          label="Focus market"
          value={context.most_relevant_position?.market ?? "n/a"}
        />
        <MiniMetric
          label="Max mark move"
          value={formatAbsPercent(context.max_abs_mark_price_change_percent)}
        />
        <MiniMetric
          label="Daily funding delta"
          value={formatSignedNullableUsd(
            context.total_daily_funding_delta_usd,
          )}
        />
        <MiniMetric
          label="Open interest delta"
          value={formatSignedNullableUsd(
            context.total_open_interest_delta_usd,
          )}
        />
      </dl>

      {context.positions.length === 0 ? (
        <p className="border-t border-stone-200 px-4 py-3 text-sm text-stone-600">
          No market rows are available for this comparison.
        </p>
      ) : (
        <div className="overflow-x-auto border-t border-stone-200">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="bg-stone-100 text-xs uppercase text-stone-600">
              <tr>
                <th className="px-4 py-3">Market</th>
                <th className="px-4 py-3">Read</th>
                <th className="px-4 py-3">Mark price</th>
                <th className="px-4 py-3">Mark move</th>
                <th className="px-4 py-3">Current liq. distance</th>
                <th className="px-4 py-3">Funding 8h</th>
                <th className="px-4 py-3">Open interest</th>
              </tr>
            </thead>
            <tbody>
              {context.positions.map((position) => (
                <tr className="border-t border-stone-200" key={position.market}>
                  <td className="px-4 py-3 font-mono">{position.market}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-stone-950">
                      {markMoveLabels[position.mark_move_direction]}
                    </span>
                    <p className="mt-1 max-w-72 text-xs leading-5 text-stone-600">
                      {position.summary}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {formatMetricPair(position.mark_price_usd, formatNullableUsd)}
                  </td>
                  <td className="px-4 py-3">
                    {formatNullableSignedPercent(
                      position.mark_price_change_percent,
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {formatPercentFromBps(
                      position.liquidation_distance_bps.current_value,
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {formatMetricPair(
                      position.funding_8h_bps_user_perspective,
                      formatNullableSignedBps,
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {formatMetricPair(
                      position.open_interest_usd,
                      formatNullableUsd,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="border-t border-stone-200 px-4 py-3 text-xs text-stone-500">
        Market context compares the saved receipt with the latest read-only
        Hyperliquid snapshot. It is descriptive and does not recommend changing
        a position.
      </p>
    </section>
  );
}

function ComparisonMetric({
  comparison,
  label,
  valueFormatter,
  deltaFormatter,
}: {
  comparison: metric_comparison;
  label: string;
  valueFormatter: (value: number | null) => string;
  deltaFormatter?: (value: number | null) => string;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
      <dt className="text-xs font-medium uppercase text-stone-500">{label}</dt>
      <dd className="mt-2 font-mono text-sm font-semibold text-stone-950">
        {valueFormatter(comparison.receipt_value)} to{" "}
        {valueFormatter(comparison.current_value)}
      </dd>
      <p className="mt-1 text-xs text-stone-600">
        Delta: {(deltaFormatter ?? valueFormatter)(comparison.delta)}
      </p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-stone-600">{label}</dt>
      <dd className="font-mono font-semibold text-stone-950">{value}</dd>
    </div>
  );
}

function formatScore(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return value.toFixed(0);
}

function formatNullableUsd(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return formatUsd(value);
}

function formatSignedNullableUsd(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return formatSignedUsd(value);
}

function formatNullableSignedBps(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return formatSignedBps(value);
}

function formatSignedPercentFromBps(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  const sign = value > 0 ? "+" : "";

  return `${sign}${formatPercentFromBps(value)}`;
}

function formatAbsPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function formatSignedPercent(value: number) {
  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(2)}%`;
}

function formatNullableSignedPercent(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return formatSignedPercent(value);
}

function formatNullablePlainPercent(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return `${value.toFixed(2)}%`;
}

function formatNullablePlainBps(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return `${value.toFixed(2)} bps`;
}

function formatNullableMultiple(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return `${value.toFixed(2)}x`;
}

function formatDrilldownWatchCounts(
  row: receipt_market_regime_drilldown["rows"][number],
) {
  return `${row.watchlist_high_count} high / ${row.watchlist_watch_count} watch / ${row.watchlist_info_count} info`;
}

function formatHistoryWatchCounts(entry: receipt_recheck_history_entry) {
  return `${entry.watchlist_high_count} high / ${entry.watchlist_watch_count} watch / ${entry.watchlist_info_count} info`;
}

function formatSignedNullableNumber(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  if (value === 0) {
    return "0";
  }

  return `${value > 0 ? "+" : "-"}${Math.abs(value).toFixed(2)}`;
}

function normalizeUiThresholds(
  thresholds: receipt_recheck_watchlist_thresholds,
) {
  const thinLiquidationDistanceBps = Math.max(
    0,
    thresholds.thin_liquidation_distance_bps,
  );

  return {
    material_daily_funding_usd: Math.max(
      0,
      thresholds.material_daily_funding_usd,
    ),
    material_driver_score_delta: Math.max(
      0,
      thresholds.material_driver_score_delta,
    ),
    material_funding_8h_bps: Math.max(0, thresholds.material_funding_8h_bps),
    material_mark_move_percent: Math.max(
      0,
      thresholds.material_mark_move_percent,
    ),
    material_open_interest_delta_usd: Math.max(
      0,
      thresholds.material_open_interest_delta_usd,
    ),
    thin_liquidation_distance_bps: thinLiquidationDistanceBps,
    tight_liquidation_distance_bps: Math.max(
      thinLiquidationDistanceBps,
      thresholds.tight_liquidation_distance_bps,
    ),
  };
}

function parseThresholdInput(value: string) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return 0;
  }

  return Math.max(0, parsedValue);
}

function formatThresholdInput(value: number) {
  if (Number.isInteger(value)) {
    return value.toFixed(0);
  }

  return value.toFixed(2);
}

function formatThresholdSignature(
  thresholds: receipt_recheck_watchlist_thresholds,
) {
  return [
    thresholds.material_daily_funding_usd,
    thresholds.material_driver_score_delta,
    thresholds.material_funding_8h_bps,
    thresholds.material_mark_move_percent,
    thresholds.material_open_interest_delta_usd,
    thresholds.thin_liquidation_distance_bps,
    thresholds.tight_liquidation_distance_bps,
  ].join(":");
}

function getMarketHistoryMarkets(context: market_context) {
  const markets = context.positions
    .filter((position) => position.status === "same_position")
    .map((position) => position.market);

  return Array.from(new Set(markets)).slice(0, 5);
}

function formatPrimaryDriver(category: position_risk_driver_category | null) {
  switch (category) {
    case "liquidation_buffer":
      return "liq. buffer";
    case "missing_liquidation":
      return "missing liq.";
    case "notional_concentration":
      return "notional";
    case "funding_cost":
      return "funding";
    case "unrealized_loss":
      return "unrealized loss";
    case null:
      return "n/a";
  }
}

function formatPrimaryDriverPair(
  savedValue: position_risk_driver_category | null,
  currentValue: position_risk_driver_category | null,
) {
  return `${formatPrimaryDriver(savedValue)} to ${formatPrimaryDriver(
    currentValue,
  )}`;
}

function formatDriverScorePair(
  savedValue: number | null,
  currentValue: number | null,
) {
  return `${formatScore(savedValue)} to ${formatScore(currentValue)}`;
}

function formatDriverMetricPair(
  savedValue: number | null,
  currentValue: number | null,
  formatter: (value: number | null) => string,
) {
  return `${formatter(savedValue)} to ${formatter(currentValue)}`;
}

function formatMetricPair(
  comparison: metric_comparison,
  formatter: (value: number | null) => string,
) {
  return `${formatter(comparison.receipt_value)} to ${formatter(
    comparison.current_value,
  )}`;
}
