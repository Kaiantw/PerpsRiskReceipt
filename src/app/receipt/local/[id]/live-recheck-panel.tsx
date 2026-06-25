"use client";

import { useState } from "react";

import {
  formatPercentFromBps,
  formatSignedBps,
  formatSignedUsd,
  formatUsd,
} from "@/lib/formatters.ts";
import type { receipt_account_value_context } from "@/lib/history/receipt-account-value-context.ts";
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
import {
  buildReceiptChangeSummary,
  type receipt_change_summary,
} from "@/lib/receipts/receipt-change-summary.ts";
import { compareSnapshots } from "@/lib/receipts/snapshot-comparison.ts";
import { ReceiptRiskAssistantPanel } from "./receipt-risk-assistant-panel.tsx";

type recheck_state =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; comparison: snapshot_comparison };

type hyperliquid_snapshot_response =
  | { snapshot: normalized_account_snapshot }
  | { error: string; fallback?: string };

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
        comparison: compareSnapshots({
          receiptSnapshot: receipt.snapshot,
          currentSnapshot: body.snapshot,
        }),
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
          hashVerified={hashVerified}
          receipt={receipt}
          receiptAccountValueContext={receiptAccountValueContext ?? null}
        />
      ) : null}
    </section>
  );
}

function LiveRecheckResult({
  comparison,
  hashVerified,
  receipt,
  receiptAccountValueContext,
}: {
  comparison: snapshot_comparison;
  hashVerified?: boolean;
  receipt: risk_receipt;
  receiptAccountValueContext: receipt_account_value_context | null;
}) {
  const marketContext = buildMarketContext(comparison);
  const changeSummary = buildReceiptChangeSummary({
    comparison,
    marketContext,
    accountValueContext: receiptAccountValueContext,
  });
  const assistantKey = [
    receipt.id,
    comparison.status,
    comparison.changed_position_count,
    comparison.max_abs_mark_price_change_percent,
    changeSummary.label,
    receiptAccountValueContext?.label ?? "no-account-context",
  ].join(":");

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
      <ReceiptRiskAssistantPanel
        context={{
          receipt,
          comparison,
          marketContext,
          changeSummary,
          accountValueContext: receiptAccountValueContext,
          hashVerified,
        }}
        key={assistantKey}
      />
      <MarketContextResult context={marketContext} />

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

function formatMetricPair(
  comparison: metric_comparison,
  formatter: (value: number | null) => string,
) {
  return `${formatter(comparison.receipt_value)} to ${formatter(
    comparison.current_value,
  )}`;
}
