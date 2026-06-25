"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { formatIsoDate, truncateMiddle } from "@/lib/formatters.ts";
import type { risk_receipt } from "@/lib/perps/types.ts";
import {
  createPortableReceiptBundle,
  getPortableReceiptBundlePreview,
  stringifyPortableReceiptBundle,
} from "@/lib/receipts/portable-receipt-bundle.ts";

type copy_state = "idle" | "copied" | "error";

export function PortableReceiptPanel({ receipt }: { receipt: risk_receipt }) {
  const [copyState, setCopyState] = useState<copy_state>("idle");
  const bundle = useMemo(() => createPortableReceiptBundle(receipt), [receipt]);
  const bundleJson = useMemo(
    () => stringifyPortableReceiptBundle(bundle),
    [bundle],
  );
  const preview = useMemo(
    () => getPortableReceiptBundlePreview(bundle),
    [bundle],
  );

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
    link.download = `${receipt.id}.perps-risk-receipt.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-lg border border-stone-300 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Portable receipt bundle</h2>
          <p className="mt-1 max-w-3xl text-sm text-stone-600">
            Export this full receipt snapshot as JSON so another browser can
            import it and recompute the same snapshot hash.
          </p>
        </div>
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-950"
          href="/receipt/import"
        >
          Import bundle
        </Link>
      </div>

      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-950">
        Full export includes the account, markets, position sizes, prices,
        liquidation prices, funding estimates, and risk metrics. Share only
        with someone you intend to show the full snapshot.
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          Copy bundle
        </button>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-950"
          onClick={downloadBundle}
          type="button"
        >
          Download JSON
        </button>
      </div>

      {copyState === "copied" ? (
        <p className="mt-3 text-sm font-medium text-emerald-800">
          Bundle copied.
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
