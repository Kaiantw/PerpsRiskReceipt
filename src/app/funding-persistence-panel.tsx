"use client";

import { useMemo, useState } from "react";

import { formatIsoDate, formatSignedBps, formatSignedUsd } from "@/lib/formatters.ts";
import {
  buildFundingPersistenceRead,
  type funding_persistence_read,
} from "@/lib/funding/funding-persistence.ts";
import type { hyperliquid_market_history } from "@/lib/hyperliquid/adapter.ts";
import type { normalized_account_snapshot } from "@/lib/perps/types.ts";

const MAX_HISTORY_MARKET_COUNT = 5;

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

type hyperliquid_market_history_response =
  | {
      fetched_at_iso: string;
      interval: string;
      window_hours: number;
      histories: hyperliquid_market_history[];
    }
  | { error: string; fallback?: string };

const labelCopy: Record<funding_persistence_read["label"], string> = {
  no_positions: "no positions",
  no_history: "no history",
  persistent_cost: "persistent cost",
  recent_cost: "recent cost",
  persistent_credit: "persistent credit",
  mixed: "mixed",
  neutral: "near flat",
};

const labelTone: Record<funding_persistence_read["label"], string> = {
  no_positions: "border-stone-200 bg-stone-100 text-stone-700",
  no_history: "border-stone-200 bg-stone-100 text-stone-700",
  persistent_cost: "border-red-200 bg-red-100 text-red-950",
  recent_cost: "border-amber-200 bg-amber-100 text-amber-950",
  persistent_credit: "border-emerald-200 bg-emerald-100 text-emerald-950",
  mixed: "border-yellow-200 bg-yellow-100 text-yellow-950",
  neutral: "border-stone-200 bg-stone-100 text-stone-700",
};

function getFundingMarkets(snapshot: normalized_account_snapshot) {
  return Array.from(new Set(snapshot.positions.map((position) => position.market))).slice(
    0,
    MAX_HISTORY_MARKET_COUNT,
  );
}

function formatNullableSignedBps(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return formatSignedBps(value);
}

function formatNullableSignedUsd(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return formatSignedUsd(value);
}

function formatNullablePercent(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return `${value.toFixed(0)}%`;
}

export function FundingPersistencePanel({
  snapshot,
}: {
  snapshot: normalized_account_snapshot;
}) {
  const [state, setState] = useState<market_history_state>({ status: "idle" });
  const markets = useMemo(() => getFundingMarkets(snapshot), [snapshot]);
  const read = useMemo(
    () =>
      state.status === "loaded"
        ? buildFundingPersistenceRead({
            fetchedAtIso: state.fetchedAtIso,
            histories: state.histories,
            interval: state.interval,
            snapshot,
            windowHours: state.windowHours,
          })
        : null,
    [snapshot, state],
  );

  async function loadFundingHistory() {
    if (markets.length === 0) {
      return;
    }

    setState({ status: "loading" });

    try {
      const response = await fetch(
        `/api/hyperliquid/market-history?markets=${encodeURIComponent(
          markets.join(","),
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

      setState({
        status: "loaded",
        fetchedAtIso: body.fetched_at_iso,
        histories: body.histories,
        interval: body.interval,
        windowHours: body.window_hours,
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Hyperliquid market history lookup failed.",
      });
    }
  }

  const canLoad = markets.length > 0 && state.status !== "loading";

  return (
    <section className="rounded-lg border border-stone-300 bg-white">
      <div className="flex flex-col gap-3 border-b border-stone-200 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Recent funding persistence</h2>
          <p className="mt-1 text-sm text-stone-600">
            Load public Hyperliquid funding history to see whether current
            funding cost or credit has been repeating across the recent market.
          </p>
        </div>
        <button
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-stone-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-stone-400"
          disabled={!canLoad}
          onClick={loadFundingHistory}
          type="button"
        >
          {state.status === "loading" ? "Loading..." : "Load 24h funding"}
        </button>
      </div>

      {state.status === "idle" ? (
        <p className="px-4 py-3 text-sm text-stone-600">
          {markets.length === 0
            ? "No open positions are available for funding-history context."
            : `Ready to load public funding history for ${markets.join(", ")}.`}
        </p>
      ) : null}

      {state.status === "loading" ? (
        <p className="px-4 py-3 text-sm text-stone-600">
          Loading public funding history from the read-only Hyperliquid info
          endpoint.
        </p>
      ) : null}

      {state.status === "error" ? (
        <p className="border-t border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-950">
          {state.message}
        </p>
      ) : null}

      {read ? (
        <>
          <div className="flex flex-col gap-3 border-t border-stone-200 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-stone-800">
                {read.headline}
              </p>
              <p className="mt-1 text-sm text-stone-600">{read.summary}</p>
            </div>
            <span
              className={`w-fit rounded-lg border px-3 py-2 text-sm font-semibold ${labelTone[read.label]}`}
            >
              {labelCopy[read.label]}
            </span>
          </div>

          <dl className="grid gap-3 border-t border-stone-200 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <FundingPersistenceMetric
              label="Focus market"
              value={read.focus_market ?? "n/a"}
            />
            <FundingPersistenceMetric
              label="Markets matched"
              value={`${read.matched_market_count}/${read.positions.length}`}
            />
            <FundingPersistenceMetric
              label="History window"
              value={`${read.window_hours}h ${read.interval}`}
            />
            <FundingPersistenceMetric
              label="Fetched"
              value={formatIsoDate(read.fetched_at_iso)}
            />
          </dl>

          {read.positions.length > 0 ? (
            <div className="overflow-x-auto border-t border-stone-200">
              <table className="w-full min-w-[1080px] text-left text-sm">
                <thead className="bg-stone-100 text-xs uppercase text-stone-600">
                  <tr>
                    <th className="px-4 py-3">Market</th>
                    <th className="px-4 py-3">Side</th>
                    <th className="px-4 py-3">Label</th>
                    <th className="px-4 py-3">Points</th>
                    <th className="px-4 py-3">Cost share</th>
                    <th className="px-4 py-3">Avg 8h</th>
                    <th className="px-4 py-3">Latest 8h</th>
                    <th className="px-4 py-3">Avg daily</th>
                    <th className="px-4 py-3">Read</th>
                  </tr>
                </thead>
                <tbody>
                  {read.positions.map((position) => (
                    <tr className="border-t border-stone-200 align-top" key={position.market}>
                      <td className="px-4 py-3 font-mono">{position.market}</td>
                      <td className="px-4 py-3 capitalize">{position.side}</td>
                      <td className="px-4 py-3">
                        {position.label.replaceAll("_", " ")}
                      </td>
                      <td className="px-4 py-3">
                        {position.funding_point_count}
                      </td>
                      <td className="px-4 py-3">
                        {formatNullablePercent(position.cost_persistence_percent)}
                      </td>
                      <td className="px-4 py-3">
                        {formatNullableSignedBps(
                          position.average_funding_8h_bps_user_perspective,
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {formatNullableSignedBps(
                          position.latest_funding_8h_bps_user_perspective,
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {formatNullableSignedUsd(
                          position.estimated_average_daily_funding_usd,
                        )}
                      </td>
                      <td className="px-4 py-3">{position.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <ul className="space-y-2 border-t border-stone-200 px-4 py-3 text-xs leading-5 text-stone-600">
            {read.review_points.map((point) => (
              <li className="flex gap-2" key={point}>
                <span
                  aria-hidden="true"
                  className="mt-2 h-1.5 w-1.5 rounded-full bg-stone-400"
                />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

function FundingPersistenceMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
      <dt className="text-xs font-medium uppercase text-stone-500">{label}</dt>
      <dd className="mt-2 break-words font-mono text-sm font-semibold text-stone-950">
        {value}
      </dd>
    </div>
  );
}
