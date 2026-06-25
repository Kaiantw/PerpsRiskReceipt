"use client";

import { useMemo, useState, type ReactNode } from "react";

import {
  formatIsoDate,
  formatSignedUsd,
  formatUsd,
} from "@/lib/formatters.ts";
import type {
  account_value_history_point,
  account_value_timeline,
  account_value_timeline_label,
} from "@/lib/history/account-value-timeline.ts";

export type account_value_history_state =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; timelines: account_value_timeline[] }
  | { status: "error"; message: string };

const preferredWindowOrder = [
  "perpDay",
  "perpWeek",
  "perpMonth",
  "perpAllTime",
  "day",
  "week",
  "month",
  "allTime",
];

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

const labelCopy: Record<account_value_timeline_label, string> = {
  no_history: "no history",
  single_point: "single point",
  higher: "higher",
  lower: "lower",
  flat: "flat",
  drawdown_watch: "drawdown watch",
};

const labelTone: Record<account_value_timeline_label, string> = {
  no_history: "border-stone-200 bg-stone-100 text-stone-700",
  single_point: "border-stone-200 bg-stone-100 text-stone-700",
  higher: "border-emerald-200 bg-emerald-100 text-emerald-950",
  lower: "border-amber-200 bg-amber-100 text-amber-950",
  flat: "border-stone-200 bg-stone-100 text-stone-700",
  drawdown_watch: "border-red-200 bg-red-100 text-red-950",
};

export function AccountValueHistoryPanel({
  state,
}: {
  state: account_value_history_state;
}) {
  if (state.status === "idle") {
    return null;
  }

  if (state.status === "loading") {
    return (
      <HistoryShell
        label="Loading"
        title="Account value history"
        tone="border-blue-200 bg-blue-50 text-blue-950"
      >
        <p className="p-4 text-sm text-stone-600">
          Loading read-only Hyperliquid portfolio history.
        </p>
      </HistoryShell>
    );
  }

  if (state.status === "error") {
    return (
      <HistoryShell
        label="Unavailable"
        title="Account value history"
        tone="border-amber-200 bg-amber-100 text-amber-950"
      >
        <p className="p-4 text-sm text-stone-600">{state.message}</p>
      </HistoryShell>
    );
  }

  return <LoadedAccountValueHistory timelines={state.timelines} />;
}

function LoadedAccountValueHistory({
  timelines,
}: {
  timelines: account_value_timeline[];
}) {
  const [selectedWindowId, setSelectedWindowId] = useState<string | null>(null);
  const orderedTimelines = useMemo(() => orderTimelines(timelines), [timelines]);
  const selectedTimeline =
    orderedTimelines.find(
      (timeline) => timeline.window_id === selectedWindowId,
    ) ??
    orderedTimelines[0] ??
    null;

  if (!selectedTimeline) {
    return (
      <HistoryShell
        label="No history"
        title="Account value history"
        tone={labelTone.no_history}
      >
        <p className="p-4 text-sm text-stone-600">
          Hyperliquid did not return portfolio history for this account.
        </p>
      </HistoryShell>
    );
  }

  return (
    <section className="rounded-lg border border-stone-300 bg-white">
      <div className="flex flex-col gap-3 border-b border-stone-200 px-4 py-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Account value history</h2>
          <p className="mt-1 text-sm text-stone-600">
            {selectedTimeline.headline}
          </p>
        </div>
        <span
          className={`rounded-lg border px-3 py-2 text-sm font-semibold ${labelTone[selectedTimeline.label]}`}
        >
          {labelCopy[selectedTimeline.label]}
        </span>
      </div>

      <div className="border-b border-stone-200 px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {orderedTimelines.map((timeline) => (
            <button
              className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                selectedTimeline.window_id === timeline.window_id
                  ? "border-stone-950 bg-stone-950 text-white"
                  : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
              }`}
              key={timeline.window_id}
              onClick={() => setSelectedWindowId(timeline.window_id)}
              type="button"
            >
              {formatWindowLabel(timeline.window_id)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <div>
          <AccountValueSparkline points={selectedTimeline.points} />
          <p className="mt-3 text-xs leading-5 text-stone-500">
            Drawdown is measured from the highest sampled account value in this
            selected history window.
          </p>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <HistoryMetric
            label="Latest account value"
            value={formatNullableUsd(
              selectedTimeline.latest_point?.account_value_usd ?? null,
            )}
          />
          <HistoryMetric
            label="Period change"
            value={formatChange(selectedTimeline)}
          />
          <HistoryMetric
            label="Current drawdown"
            value={formatNullablePercent(
              selectedTimeline.current_drawdown_percent,
            )}
          />
          <HistoryMetric
            label="Max drawdown"
            value={formatNullablePercent(selectedTimeline.max_drawdown_percent)}
          />
          <HistoryMetric
            label="Sampled points"
            value={String(selectedTimeline.point_count)}
          />
          <HistoryMetric
            label="Window volume"
            value={formatNullableUsd(selectedTimeline.volume_usd)}
          />
        </dl>
      </div>

      <div className="overflow-x-auto border-t border-stone-200">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="bg-stone-100 text-xs uppercase text-stone-600">
            <tr>
              <th className="px-4 py-3">Sample time</th>
              <th className="px-4 py-3">Account value</th>
              <th className="px-4 py-3">PnL history</th>
            </tr>
          </thead>
          <tbody>
            {selectedTimeline.points.slice(-6).map((point) => (
              <tr className="border-t border-stone-200" key={point.time_ms}>
                <td className="px-4 py-3 font-mono">
                  {formatIsoDate(new Date(point.time_ms).toISOString())}
                </td>
                <td className="px-4 py-3">
                  {formatUsd(point.account_value_usd)}
                </td>
                <td className="px-4 py-3">
                  {formatNullableSignedUsd(point.pnl_usd)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="border-t border-stone-200 px-4 py-3 text-xs text-stone-500">
        Portfolio history comes from the Hyperliquid read-only info endpoint. It
        is sampled context, not complete accounting or financial advice.
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

function AccountValueSparkline({
  points,
}: {
  points: account_value_history_point[];
}) {
  const width = 360;
  const height = 120;
  const values = points.map((point) => point.account_value_usd);
  const minValue = values.length > 0 ? Math.min(...values) : 0;
  const maxValue = values.length > 0 ? Math.max(...values) : 0;
  const valueRange = maxValue - minValue;
  const coordinatePairs = points.map((point, index) => {
    const x =
      points.length <= 1 ? width / 2 : (index / (points.length - 1)) * width;
    const y =
      valueRange === 0
        ? height / 2
        : height -
          ((point.account_value_usd - minValue) / valueRange) * (height - 20) -
          10;

    return `${roundSvgNumber(x)},${roundSvgNumber(y)}`;
  });

  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
      <svg
        aria-label="Account value history sparkline"
        className="h-36 w-full"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        <rect fill="#fafaf9" height={height} width={width} x="0" y="0" />
        <line
          stroke="#d6d3d1"
          strokeDasharray="4 4"
          strokeWidth="1"
          x1="0"
          x2={width}
          y1={height / 2}
          y2={height / 2}
        />
        {points.length > 1 ? (
          <polyline
            fill="none"
            points={coordinatePairs.join(" ")}
            stroke="#047857"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
        ) : null}
        {points.length === 1 ? (
          <circle
            cx={width / 2}
            cy={height / 2}
            fill="#047857"
            r="5"
          />
        ) : null}
      </svg>
    </div>
  );
}

function orderTimelines(timelines: account_value_timeline[]) {
  return timelines
    .slice()
    .sort(
      (leftTimeline, rightTimeline) =>
        getWindowOrder(leftTimeline.window_id) -
          getWindowOrder(rightTimeline.window_id) ||
        leftTimeline.window_id.localeCompare(rightTimeline.window_id),
    );
}

function getWindowOrder(windowId: string) {
  const preferredIndex = preferredWindowOrder.indexOf(windowId);

  return preferredIndex === -1 ? preferredWindowOrder.length : preferredIndex;
}

function formatWindowLabel(windowId: string) {
  return windowLabelById[windowId] ?? windowId;
}

function formatChange(timeline: account_value_timeline) {
  if (
    timeline.account_value_change_usd === null ||
    timeline.account_value_change_percent === null
  ) {
    return "n/a";
  }

  return `${formatSignedUsd(timeline.account_value_change_usd)} (${formatSignedPercent(
    timeline.account_value_change_percent,
  )})`;
}

function formatNullableUsd(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return formatUsd(value);
}

function formatNullableSignedUsd(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "n/a";
  }

  return formatSignedUsd(value);
}

function formatSignedPercent(value: number) {
  if (value === 0) {
    return "0.00%";
  }

  return `${value > 0 ? "+" : "-"}${Math.abs(value).toFixed(2)}%`;
}

function formatNullablePercent(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return `${value.toFixed(2)}%`;
}

function roundSvgNumber(value: number) {
  return Math.round(value * 100) / 100;
}
