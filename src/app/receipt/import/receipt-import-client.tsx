"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import {
  formatIsoDate,
  formatPercentFromBps,
  formatSignedBps,
  formatUsd,
  truncateMiddle,
} from "@/lib/formatters.ts";
import {
  buildRedactedMarketContext,
  type redacted_market_context,
} from "@/lib/market/redacted-market-context.ts";
import type { hyperliquid_market_context } from "@/lib/hyperliquid/adapter.ts";
import type { receipt_verification, risk_receipt } from "@/lib/perps/types.ts";
import { getLocalReceiptStorageKey } from "@/lib/receipts/local-receipts.ts";
import {
  getPortableReceiptBundlePreview,
  isFullReceiptBundle,
  isRedactedReceiptBundle,
  parsePortableReceiptBundleJson,
  type portable_receipt_bundle_preview,
  type redacted_receipt_bundle,
  type redacted_receipt_bundle_preview,
} from "@/lib/receipts/portable-receipt-bundle.ts";
import { verifyReceipt } from "@/lib/receipts/receipt.ts";

type import_state =
  | { status: "empty" }
  | { status: "invalid"; message: string }
  | {
      status: "full_preview";
      receipt: risk_receipt;
      preview: portable_receipt_bundle_preview;
      verification: receipt_verification;
    }
  | {
      status: "redacted_preview";
      bundle: redacted_receipt_bundle;
      preview: redacted_receipt_bundle_preview;
    };

type redacted_market_context_state =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; context: redacted_market_context }
  | { status: "error"; message: string };

type hyperliquid_markets_payload = {
  fetched_at_iso: string;
  markets: hyperliquid_market_context[];
};

export function ReceiptImportClient() {
  const router = useRouter();
  const [bundleText, setBundleText] = useState("");
  const [state, setState] = useState<import_state>({ status: "empty" });
  const [redactedMarketContextState, setRedactedMarketContextState] =
    useState<redacted_market_context_state>({ status: "idle" });
  const importPreviewRequestIdRef = useRef(0);
  const redactedMarketContextRequestIdRef = useRef(0);

  async function updateBundleText(value: string) {
    const requestId = importPreviewRequestIdRef.current + 1;

    importPreviewRequestIdRef.current = requestId;
    redactedMarketContextRequestIdRef.current += 1;
    setBundleText(value);
    setRedactedMarketContextState({ status: "idle" });

    if (!value.trim()) {
      setState({ status: "empty" });
      return;
    }

    const parsed = parsePortableReceiptBundleJson(value);

    if (parsed.status === "invalid") {
      setState({ status: "invalid", message: parsed.message });
      return;
    }

    if (isRedactedReceiptBundle(parsed.bundle)) {
      setState({
        status: "redacted_preview",
        bundle: parsed.bundle,
        preview: getPortableReceiptBundlePreview(parsed.bundle),
      });
      return;
    }

    if (!isFullReceiptBundle(parsed.bundle)) {
      setState({
        status: "invalid",
        message: "Bundle format is not supported by this version of the app.",
      });
      return;
    }

    const verification = await verifyReceipt(parsed.bundle.receipt);

    if (importPreviewRequestIdRef.current !== requestId) {
      return;
    }

    setState({
      status: "full_preview",
      receipt: parsed.bundle.receipt,
      preview: getPortableReceiptBundlePreview(parsed.bundle),
      verification,
    });
  }

  async function loadRedactedMarketContext(bundle: redacted_receipt_bundle) {
    const requestId = redactedMarketContextRequestIdRef.current + 1;

    redactedMarketContextRequestIdRef.current = requestId;

    if (bundle.protocol !== "hyperliquid") {
      setRedactedMarketContextState({
        status: "error",
        message: "Current market context is only available for Hyperliquid shares.",
      });
      return;
    }

    if (bundle.markets.length === 0) {
      setRedactedMarketContextState({
        status: "error",
        message: "This redacted share does not disclose any markets.",
      });
      return;
    }

    setRedactedMarketContextState({ status: "loading" });

    try {
      const marketList = Array.from(
        new Set(bundle.markets.map((market) => market.market)),
      ).join(",");
      const response = await fetch(
        `/api/hyperliquid/markets?markets=${encodeURIComponent(marketList)}`,
      );
      const payload = (await response.json()) as
        | hyperliquid_markets_payload
        | { error?: string };

      if (!response.ok || !("markets" in payload)) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "Hyperliquid market context lookup failed.",
        );
      }

      if (redactedMarketContextRequestIdRef.current !== requestId) {
        return;
      }

      setRedactedMarketContextState({
        status: "loaded",
        context: buildRedactedMarketContext({
          bundle,
          currentMarkets: payload.markets,
          fetchedAtIso: payload.fetched_at_iso,
        }),
      });
    } catch (error) {
      if (redactedMarketContextRequestIdRef.current !== requestId) {
        return;
      }

      setRedactedMarketContextState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Hyperliquid market context lookup failed.",
      });
    }
  }

  function importReceipt() {
    if (state.status !== "full_preview" || !state.verification.matches) {
      return;
    }

    window.localStorage.setItem(
      getLocalReceiptStorageKey(state.receipt.id),
      JSON.stringify(state.receipt),
    );
    router.push(`/receipt/local/${state.receipt.id}`);
  }

  return (
    <main className="min-h-screen px-4 py-6 text-stone-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-stone-300 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-800">
              Risk receipt
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">
              Inspect portable bundle
            </h1>
          </div>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-950"
            href="/"
          >
            Dashboard
          </Link>
        </header>

        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-950">
          Full bundles contain private account and position details. Redacted
          bundles hide those details and preserve only a hash reference plus a
          minimized risk summary.
        </section>

        <section className="rounded-lg border border-stone-300 bg-white p-4">
          <label
            className="text-sm font-semibold text-stone-900"
            htmlFor="portable-receipt-bundle"
          >
            Bundle JSON
          </label>
          <textarea
            className="mt-3 h-72 w-full resize-y rounded-lg border border-stone-300 bg-stone-50 p-3 font-mono text-xs text-stone-950"
            id="portable-receipt-bundle"
            onChange={(event) => {
              void updateBundleText(event.target.value);
            }}
            placeholder="Paste a portable receipt bundle JSON export."
            value={bundleText}
          />

          {state.status === "empty" ? (
            <p className="mt-3 text-sm text-stone-600">
              Paste a full bundle to import a local receipt, or paste a
              redacted bundle to inspect the minimized share summary.
            </p>
          ) : null}

          {state.status === "invalid" ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-950">
              {state.message}
            </p>
          ) : null}
        </section>

        {state.status === "full_preview" ? (
          <section className="rounded-lg border border-stone-300 bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Import preview</h2>
                <p className="mt-1 text-sm text-stone-600">
                  The app recomputes the snapshot hash before saving this
                  receipt into local browser storage.
                </p>
              </div>
              <span
                className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                  state.verification.matches
                    ? "border-emerald-200 bg-emerald-100 text-emerald-950"
                    : "border-red-200 bg-red-100 text-red-950"
                }`}
              >
                {state.verification.matches ? "Hash verified" : "Hash mismatch"}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ImportMetric label="Receipt" value={state.preview.receipt_id} />
              <ImportMetric
                label="Account"
                value={truncateMiddle(state.preview.account, 18)}
              />
              <ImportMetric label="Protocol" value={state.preview.protocol} />
              <ImportMetric
                label="Data timestamp"
                value={formatIsoDate(state.preview.data_time_iso)}
              />
              <ImportMetric
                label="Risk score"
                value={`${state.preview.risk_score} · ${state.preview.risk_label}`}
              />
              <ImportMetric
                label="Account value"
                value={formatUsd(state.receipt.snapshot.account_value_usd)}
              />
              <ImportMetric
                label="Margin usage"
                value={formatPercentFromBps(
                  state.receipt.snapshot.aggregate.margin_usage_bps,
                )}
              />
              <ImportMetric
                label="Positions"
                value={String(state.preview.position_count)}
              />
            </div>

            <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-3">
              <p className="text-xs font-medium uppercase text-stone-500">
                Snapshot hash
              </p>
              <p className="mt-2 break-all font-mono text-xs font-semibold text-stone-950">
                {state.preview.snapshot_hash}
              </p>
            </div>

            <button
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-stone-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-stone-400"
              disabled={!state.verification.matches}
              onClick={importReceipt}
              type="button"
            >
              Import receipt
            </button>
          </section>
        ) : null}

        {state.status === "redacted_preview" ? (
          <section className="rounded-lg border border-stone-300 bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Redacted share preview</h2>
                <p className="mt-1 text-sm text-stone-600">
                  This bundle hides the full snapshot. The original snapshot
                  hash is preserved as a reference, but the app cannot recompute
                  it without the hidden account and position fields.
                </p>
              </div>
              <span className="rounded-lg border border-emerald-200 bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-950">
                Redacted
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ImportMetric label="Receipt" value={state.preview.receipt_id} />
              <ImportMetric label="Protocol" value={state.preview.protocol} />
              <ImportMetric
                label="Data timestamp"
                value={formatIsoDate(state.preview.data_time_iso)}
              />
              <ImportMetric
                label="Risk score"
                value={`${state.preview.risk_score} · ${state.preview.risk_label}`}
              />
              <ImportMetric
                label="Account value"
                value={state.bundle.aggregate.account_value_bucket_usd}
              />
              <ImportMetric
                label="Total notional"
                value={state.bundle.aggregate.total_notional_bucket_usd}
              />
              <ImportMetric
                label="Margin usage"
                value={formatPercentFromBps(
                  state.bundle.aggregate.margin_usage_bps,
                )}
              />
              <ImportMetric
                label="Positions"
                value={String(state.preview.position_count)}
              />
            </div>

            <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-3">
              <p className="text-xs font-medium uppercase text-stone-500">
                Snapshot hash reference
              </p>
              <p className="mt-2 break-all font-mono text-xs font-semibold text-stone-950">
                {state.preview.snapshot_hash}
              </p>
            </div>

            {state.bundle.markets.length > 0 ? (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-[640px] w-full text-left text-sm">
                  <thead className="bg-stone-100 text-xs uppercase text-stone-600">
                    <tr>
                      <th className="px-4 py-3">Market</th>
                      <th className="px-4 py-3">Side</th>
                      <th className="px-4 py-3">Notional bucket</th>
                      <th className="px-4 py-3">Liq. distance</th>
                      <th className="px-4 py-3">Funding 8h</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.bundle.markets.map((market) => (
                      <tr className="border-t border-stone-200" key={market.market}>
                        <td className="px-4 py-3 font-mono">{market.market}</td>
                        <td className="px-4 py-3 capitalize">{market.side}</td>
                        <td className="px-4 py-3">{market.notional_bucket_usd}</td>
                        <td className="px-4 py-3">
                          {formatPercentFromBps(market.liquidation_distance_bps)}
                        </td>
                        <td className="px-4 py-3">
                          {market.funding_8h_bps_user_perspective.toFixed(2)} bps
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 text-sm text-stone-600">
                No market rows were disclosed in this redacted bundle.
              </p>
            )}

            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-950">
              Redacted bundles cannot be imported as full local receipts. Use a
              full receipt bundle if the reviewer needs hash recomputation, live
              recheck, EAS payload generation, or receipt assistant context.
            </div>

            <RedactedMarketContextPanel
              bundle={state.bundle}
              marketContextState={redactedMarketContextState}
              onLoadMarketContext={() => {
                void loadRedactedMarketContext(state.bundle);
              }}
            />
          </section>
        ) : null}
      </div>
    </main>
  );
}

function RedactedMarketContextPanel({
  bundle,
  marketContextState,
  onLoadMarketContext,
}: {
  bundle: redacted_receipt_bundle;
  marketContextState: redacted_market_context_state;
  onLoadMarketContext: () => void;
}) {
  const canLoadMarketContext =
    bundle.protocol === "hyperliquid" && bundle.markets.length > 0;

  return (
    <div className="mt-4 rounded-lg border border-stone-300 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold">Current market context</h3>
          <p className="mt-1 text-sm text-stone-600">
            Load public Hyperliquid mark, funding, and open-interest context for
            the disclosed markets without using a raw account address.
          </p>
        </div>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-stone-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-stone-400"
          disabled={!canLoadMarketContext || marketContextState.status === "loading"}
          onClick={onLoadMarketContext}
          type="button"
        >
          {marketContextState.status === "loading"
            ? "Loading market context"
            : "Load current markets"}
        </button>
      </div>

      {!canLoadMarketContext ? (
        <p className="mt-3 rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">
          Current market context is available for Hyperliquid redacted shares
          with at least one disclosed market.
        </p>
      ) : null}

      {marketContextState.status === "error" ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-950">
          {marketContextState.message}
        </p>
      ) : null}

      {marketContextState.status === "loaded" ? (
        <RedactedMarketContextResult context={marketContextState.context} />
      ) : null}
    </div>
  );
}

function RedactedMarketContextResult({
  context,
}: {
  context: redacted_market_context;
}) {
  return (
    <div className="mt-4">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
        <p className="text-sm font-semibold text-emerald-950">
          {context.headline}
        </p>
        <p className="mt-1 text-sm text-emerald-900">{context.summary}</p>
        <p className="mt-2 text-xs font-medium uppercase text-emerald-900">
          Fetched {formatIsoDate(context.fetched_at_iso)} · matched{" "}
          {context.matched_market_count}/{context.rows.length} markets
        </p>
      </div>

      {context.rows.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-stone-100 text-xs uppercase text-stone-600">
              <tr>
                <th className="px-4 py-3">Market</th>
                <th className="px-4 py-3">Side</th>
                <th className="px-4 py-3">Current mark</th>
                <th className="px-4 py-3">Funding now</th>
                <th className="px-4 py-3">Funding at receipt</th>
                <th className="px-4 py-3">Open interest</th>
                <th className="px-4 py-3">Read</th>
              </tr>
            </thead>
            <tbody>
              {context.rows.map((row) => (
                <tr className="border-t border-stone-200" key={row.market}>
                  <td className="px-4 py-3 font-mono">{row.market}</td>
                  <td className="px-4 py-3 capitalize">{row.side}</td>
                  <td className="px-4 py-3">
                    {formatNullableUsd(row.current_mark_price_usd)}
                  </td>
                  <td className="px-4 py-3">
                    {formatNullableSignedBps(
                      row.current_funding_8h_bps_user_perspective,
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {formatSignedBps(
                      row.receipt_funding_8h_bps_user_perspective,
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {formatNullableUsd(row.current_open_interest_usd)}
                  </td>
                  <td className="px-4 py-3 text-stone-700">{row.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function formatNullableUsd(value: number | null) {
  return value === null ? "n/a" : formatUsd(value);
}

function formatNullableSignedBps(value: number | null) {
  return value === null ? "n/a" : formatSignedBps(value);
}

function ImportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
      <p className="text-xs font-medium uppercase text-stone-500">{label}</p>
      <p className="mt-2 break-words font-mono text-sm font-semibold text-stone-950">
        {value}
      </p>
    </div>
  );
}
