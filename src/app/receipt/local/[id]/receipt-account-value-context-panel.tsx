"use client";

import { useEffect, useState, type ReactNode } from "react";

import {
  formatIsoDate,
  formatSignedUsd,
  formatUsd,
} from "@/lib/formatters.ts";
import type { account_value_timeline } from "@/lib/history/account-value-timeline.ts";
import {
  buildReceiptAccountValueContext,
  type receipt_account_value_context,
} from "@/lib/history/receipt-account-value-context.ts";
import type { risk_receipt } from "@/lib/perps/types.ts";

type portfolio_history_state =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; context: receipt_account_value_context };

type hyperliquid_portfolio_response =
  | { timelines: account_value_timeline[] }
  | { error: string; fallback?: string };

const windowLabelById: Record<string, string> = {
  perpDay: "Perp day",
  perpWeek: "Perp week",
  perpMonth: "Perp month",
  perpAllTime: "Perp all-time",
  day: "Day",
  week: "Week",
  month: "Month",
  allTime: "All-time",
};

const labelCopy: Record<receipt_account_value_context["label"], string> = {
  no_history: "no history",
  sample_gap_watch: "sample gap",
  near_peak: "near peak",
  in_drawdown: "in drawdown",
  latest_higher: "latest higher",
  latest_lower: "latest lower",
  little_changed: "little changed",
};

const labelTone: Record<receipt_account_value_context["label"], string> = {
  no_history: "border-stone-200 bg-stone-100 text-stone-700",
  sample_gap_watch: "border-amber-200 bg-amber-100 text-amber-950",
  near_peak: "border-emerald-200 bg-emerald-100 text-emerald-950",
  in_drawdown: "border-red-200 bg-red-100 text-red-950",
  latest_higher: "border-emerald-200 bg-emerald-100 text-emerald-950",
  latest_lower: "border-amber-200 bg-amber-100 text-amber-950",
  little_changed: "border-stone-200 bg-stone-100 text-stone-700",
};

export function ReceiptAccountValueContextPanel({
  receipt,
}: {
  receipt: risk_receipt;
}) {
  const [state, setState] = useState<portfolio_history_state>({
    status: "loading",
  });
  const canLoad = receipt.snapshot.protocol === "hyperliquid";

  useEffect(() => {
    if (!canLoad) {
      return;
    }

    let isMounted = true;

    async function loadPortfolioHistory() {
      setState({ status: "loading" });

      try {
        const response = await fetch(
          `/api/hyperliquid/portfolio?address=${encodeURIComponent(
            receipt.snapshot.account,
          )}`,
        );
        const body = (await response.json()) as hyperliquid_portfolio_response;

        if (!response.ok || !("timelines" in body)) {
          throw new Error(
            "error" in body
              ? body.error
              : "Hyperliquid portfolio history lookup failed.",
          );
        }

        if (isMounted) {
          setState({
            status: "loaded",
            context: buildReceiptAccountValueContext({
              receipt_account_value_usd: receipt.snapshot.account_value_usd,
              receipt_data_time_iso: receipt.snapshot.data_time_iso,
              timelines: body.timelines,
            }),
          });
        }
      } catch (error) {
        if (isMounted) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Hyperliquid portfolio history lookup failed.",
          });
        }
      }
    }

    void loadPortfolioHistory();

    return () => {
      isMounted = false;
    };
  }, [
    canLoad,
    receipt.snapshot.account,
    receipt.snapshot.account_value_usd,
    receipt.snapshot.data_time_iso,
  ]);

  if (!canLoad) {
    return null;
  }

  if (state.status === "loading") {
    return (
      <HistoryShell
        label="Loading"
        title="Receipt account-value context"
        tone="border-blue-200 bg-blue-50 text-blue-950"
      >
        <p className="p-4 text-sm text-stone-600">
          Loading sampled Hyperliquid portfolio history for this receipt.
        </p>
      </HistoryShell>
    );
  }

  if (state.status === "error") {
    return (
      <HistoryShell
        label="Unavailable"
        title="Receipt account-value context"
        tone="border-amber-200 bg-amber-100 text-amber-950"
      >
        <p className="p-4 text-sm text-stone-600">{state.message}</p>
      </HistoryShell>
    );
  }

  return <ReceiptHistoryResult context={state.context} receipt={receipt} />;
}

function ReceiptHistoryResult({
  context,
  receipt,
}: {
  context: receipt_account_value_context;
  receipt: risk_receipt;
}) {
  return (
    <section className="rounded-lg border border-stone-300 bg-white">
      <div className="flex flex-col gap-3 border-b border-stone-200 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            Receipt account-value context
          </h2>
          <p className="mt-1 text-sm font-medium text-stone-800">
            {context.headline}
          </p>
          <p className="mt-1 text-sm text-stone-600">
            The saved receipt is compared with sampled Hyperliquid portfolio
            history for the same account.
          </p>
        </div>
        <span
          className={`rounded-lg border px-3 py-2 text-sm font-semibold ${labelTone[context.label]}`}
        >
          {labelCopy[context.label]}
        </span>
      </div>

      {context.label === "no_history" ? (
        <p className="p-4 text-sm text-stone-600">
          Hyperliquid did not return usable portfolio history for this account.
        </p>
      ) : (
        <dl className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <HistoryMetric
            label="History window"
            value={formatWindowLabel(context.selected_timeline?.window_id)}
          />
          <HistoryMetric
            label="Receipt value"
            value={formatUsd(receipt.snapshot.account_value_usd)}
          />
          <HistoryMetric
            label="Nearest sample"
            value={formatNullableUsd(
              context.nearest_point?.account_value_usd ?? null,
            )}
          />
          <HistoryMetric
            label="Sample gap"
            value={formatSampleGap(context.nearest_sample_gap_minutes)}
          />
          <HistoryMetric
            label="Nearest sample time"
            value={formatSampleTime(context)}
          />
          <HistoryMetric
            label="Receipt vs sample"
            value={formatSignedUsdAndPercent(
              context.receipt_vs_nearest_sample_usd,
              context.receipt_vs_nearest_sample_percent,
            )}
          />
          <HistoryMetric
            label="Latest vs receipt"
            value={formatSignedUsdAndPercent(
              context.latest_vs_receipt_usd,
              context.latest_vs_receipt_percent,
            )}
          />
          <HistoryMetric
            label="Receipt drawdown"
            value={formatNullablePercent(context.receipt_drawdown_percent)}
          />
          <HistoryMetric
            label="Current drawdown"
            value={formatNullablePercent(context.current_drawdown_percent)}
          />
          <HistoryMetric
            label="Max drawdown"
            value={formatNullablePercent(context.max_drawdown_percent)}
          />
          <HistoryMetric
            label="Latest sampled value"
            value={formatNullableUsd(
              context.selected_timeline?.latest_point?.account_value_usd ??
                null,
            )}
          />
          <HistoryMetric
            label="Sampled points"
            value={String(context.selected_timeline?.point_count ?? 0)}
          />
        </dl>
      )}

      <p className="border-t border-stone-200 px-4 py-3 text-xs text-stone-500">
        Portfolio history is sampled account-value context. It can show whether
        a receipt was near a sampled peak or drawdown, but it does not explain
        causality, import trades, or provide financial advice.
      </p>
    </section>
  );
}

function HistoryShell({
  children,
  label,
  title,
  tone,
}: {
  children: ReactNode;
  label: string;
  title: string;
  tone: string;
}) {
  return (
    <section className="rounded-lg border border-stone-300 bg-white">
      <div className="flex items-start justify-between gap-3 border-b border-stone-200 px-4 py-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span
          className={`rounded-lg border px-3 py-2 text-sm font-semibold ${tone}`}
        >
          {label}
        </span>
      </div>
      {children}
    </section>
  );
}

function HistoryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
      <dt className="text-xs font-medium uppercase text-stone-500">{label}</dt>
      <dd className="mt-2 break-words font-mono text-sm font-semibold text-stone-950">
        {value}
      </dd>
    </div>
  );
}

function formatWindowLabel(windowId: string | undefined) {
  if (!windowId) {
    return "n/a";
  }

  return windowLabelById[windowId] ?? windowId;
}

function formatNullableUsd(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return formatUsd(value);
}

function formatNullablePercent(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return `${value.toFixed(2)}%`;
}

function formatSignedPercent(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  if (value === 0) {
    return "0.00%";
  }

  return `${value > 0 ? "+" : "-"}${Math.abs(value).toFixed(2)}%`;
}

function formatSignedUsdAndPercent(
  usdValue: number | null,
  percentValue: number | null,
) {
  if (usdValue === null) {
    return "n/a";
  }

  return `${formatSignedUsd(usdValue)} (${formatSignedPercent(percentValue)})`;
}

function formatSampleGap(minutes: number | null) {
  if (minutes === null) {
    return "n/a";
  }

  if (minutes < 1) {
    return "<1 min";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = minutes / 60;

  return `${hours.toFixed(hours >= 10 ? 0 : 1)} hr`;
}

function formatSampleTime(context: receipt_account_value_context) {
  if (!context.nearest_point) {
    return "n/a";
  }

  return formatIsoDate(new Date(context.nearest_point.time_ms).toISOString());
}
