"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import {
  formatIsoDate,
  formatPercentFromBps,
  formatUsd,
  truncateMiddle,
} from "@/lib/formatters.ts";
import type { receipt_verification, risk_receipt } from "@/lib/perps/types.ts";
import { getLocalReceiptStorageKey } from "@/lib/receipts/local-receipts.ts";
import {
  getPortableReceiptBundlePreview,
  parsePortableReceiptBundleJson,
  type portable_receipt_bundle_preview,
} from "@/lib/receipts/portable-receipt-bundle.ts";
import { verifyReceipt } from "@/lib/receipts/receipt.ts";

type import_state =
  | { status: "empty" }
  | { status: "invalid"; message: string }
  | {
      status: "preview";
      receipt: risk_receipt;
      preview: portable_receipt_bundle_preview;
      verification: receipt_verification;
    };

export function ReceiptImportClient() {
  const router = useRouter();
  const [bundleText, setBundleText] = useState("");
  const [state, setState] = useState<import_state>({ status: "empty" });
  const importPreviewRequestIdRef = useRef(0);

  async function updateBundleText(value: string) {
    const requestId = importPreviewRequestIdRef.current + 1;

    importPreviewRequestIdRef.current = requestId;
    setBundleText(value);

    if (!value.trim()) {
      setState({ status: "empty" });
      return;
    }

    const parsed = parsePortableReceiptBundleJson(value);

    if (parsed.status === "invalid") {
      setState({ status: "invalid", message: parsed.message });
      return;
    }

    const verification = await verifyReceipt(parsed.bundle.receipt);

    if (importPreviewRequestIdRef.current !== requestId) {
      return;
    }

    setState({
      status: "preview",
      receipt: parsed.bundle.receipt,
      preview: getPortableReceiptBundlePreview(parsed.bundle),
      verification,
    });
  }

  function importReceipt() {
    if (state.status !== "preview" || !state.verification.matches) {
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
              Import portable bundle
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
          A portable bundle contains a full private risk snapshot: account,
          positions, sizes, prices, liquidation prices, funding estimates, and
          risk metrics. Import only bundles you intend to review in this browser.
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
              Paste an exported receipt bundle to preview and verify it before
              saving it locally.
            </p>
          ) : null}

          {state.status === "invalid" ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-950">
              {state.message}
            </p>
          ) : null}
        </section>

        {state.status === "preview" ? (
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
      </div>
    </main>
  );
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
