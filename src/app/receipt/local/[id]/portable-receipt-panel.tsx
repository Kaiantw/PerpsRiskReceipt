"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { formatIsoDate, truncateMiddle } from "@/lib/formatters.ts";
import type { risk_receipt } from "@/lib/perps/types.ts";
import {
  createPortableReceiptBundle,
  createRedactedReceiptBundle,
  getPortableReceiptBundlePreview,
  stringifyPortableReceiptBundle,
} from "@/lib/receipts/portable-receipt-bundle.ts";

type copy_state = "idle" | "copied" | "error";
type bundle_mode = "full" | "redacted";

export function PortableReceiptPanel({ receipt }: { receipt: risk_receipt }) {
  const [copyState, setCopyState] = useState<copy_state>("idle");
  const [bundleMode, setBundleMode] = useState<bundle_mode>("redacted");
  const fullBundle = useMemo(() => createPortableReceiptBundle(receipt), [receipt]);
  const redactedBundle = useMemo(
    () => createRedactedReceiptBundle(receipt),
    [receipt],
  );
  const isRedacted = bundleMode === "redacted";
  const activeBundle = bundleMode === "full" ? fullBundle : redactedBundle;
  const bundleJson = useMemo(
    () => stringifyPortableReceiptBundle(activeBundle),
    [activeBundle],
  );
  const preview = isRedacted
    ? getPortableReceiptBundlePreview(redactedBundle)
    : getPortableReceiptBundlePreview(fullBundle);
  const fileSuffix = isRedacted
    ? "redacted.perps-risk-receipt.json"
    : "full.perps-risk-receipt.json";

  async function copyBundle() {
    try {
      await navigator.clipboard.writeText(bundleJson);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  function downloadBundle() {
    const blob = new Blob([bundleJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${receipt.id}.${fileSuffix}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-lg border border-stone-300 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Portable receipt bundle</h2>
          <p className="mt-1 max-w-3xl text-sm text-stone-600">
            Export either a redacted share summary or the full receipt snapshot.
            Redacted mode hides raw account and position values while keeping
            the original snapshot hash reference.
          </p>
        </div>
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-950"
          href="/receipt/import"
        >
          Import bundle
        </Link>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          className={`inline-flex min-h-11 items-center justify-center rounded-lg border px-4 text-sm font-semibold ${
            isRedacted
              ? "border-stone-950 bg-stone-950 text-white"
              : "border-stone-300 bg-white text-stone-950"
          }`}
          onClick={() => {
            setBundleMode("redacted");
            setCopyState("idle");
          }}
          type="button"
        >
          Redacted share
        </button>
        <button
          className={`inline-flex min-h-11 items-center justify-center rounded-lg border px-4 text-sm font-semibold ${
            !isRedacted
              ? "border-stone-950 bg-stone-950 text-white"
              : "border-stone-300 bg-white text-stone-950"
          }`}
          onClick={() => {
            setBundleMode("full");
            setCopyState("idle");
          }}
          type="button"
        >
          Full receipt
        </button>
      </div>

      <div
        className={`mt-4 rounded-lg border p-3 text-sm font-medium ${
          isRedacted
            ? "border-emerald-200 bg-emerald-50 text-emerald-950"
            : "border-amber-200 bg-amber-50 text-amber-950"
        }`}
      >
        {isRedacted
          ? "Redacted share hides the account, exact account value, position sizes, entry/mark/liquidation prices, PnL, and exact funding dollars. It preserves the original snapshot hash reference, but the full snapshot is required to recompute that hash."
          : "Full export includes the account, markets, position sizes, prices, liquidation prices, funding estimates, and risk metrics. Share only with someone you intend to show the full snapshot."}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MiniMetric
          label="Mode"
          value={isRedacted ? "redacted summary" : "full snapshot"}
        />
        <MiniMetric label="Receipt" value={preview.receipt_id} />
        <MiniMetric
          label="Snapshot hash"
          value={truncateMiddle(preview.snapshot_hash, 14)}
        />
        <MiniMetric
          label="Data timestamp"
          value={formatIsoDate(preview.data_time_iso)}
        />
        <MiniMetric
          label="Positions"
          value={String(preview.position_count)}
        />
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-stone-950 px-4 text-sm font-semibold text-white"
          onClick={copyBundle}
          type="button"
        >
          {isRedacted ? "Copy redacted share" : "Copy full bundle"}
        </button>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-950"
          onClick={downloadBundle}
          type="button"
        >
          {isRedacted ? "Download redacted JSON" : "Download full JSON"}
        </button>
      </div>

      {copyState === "copied" ? (
        <p className="mt-3 text-sm font-medium text-emerald-800">
          {isRedacted ? "Redacted share copied." : "Full bundle copied."}
        </p>
      ) : null}
      {copyState === "error" ? (
        <p className="mt-3 text-sm font-medium text-red-800">
          Clipboard copy failed. Select and copy the JSON below.
        </p>
      ) : null}

      <textarea
        className="mt-4 h-56 w-full resize-y rounded-lg border border-stone-300 bg-stone-50 p-3 font-mono text-xs text-stone-950"
        readOnly
        value={bundleJson}
      />
    </section>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
      <p className="text-xs font-medium uppercase text-stone-500">{label}</p>
      <p className="mt-2 break-words font-mono text-sm font-semibold text-stone-950">
        {value}
      </p>
    </div>
  );
}
