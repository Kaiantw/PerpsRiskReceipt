"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { buildEasAttestationPayload } from "@/lib/eas/attestation.ts";
import type { receipt_account_value_context } from "@/lib/history/receipt-account-value-context.ts";
import type { receipt_verification, risk_receipt } from "@/lib/perps/types.ts";
import {
  getLocalReceiptStorageKey,
  parseStoredRiskReceipt,
} from "@/lib/receipts/local-receipts.ts";
import { verifyReceipt } from "@/lib/receipts/receipt.ts";
import { ReceiptView } from "../../receipt-view.tsx";
import { LiveRecheckPanel } from "./live-recheck-panel.tsx";
import { PortableReceiptPanel } from "./portable-receipt-panel.tsx";
import { ReceiptAccountValueContextPanel } from "./receipt-account-value-context-panel.tsx";

type eas_payload = Awaited<ReturnType<typeof buildEasAttestationPayload>>;

type local_receipt_state =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; message: string }
  | {
      status: "loaded";
      receipt: risk_receipt;
      verification: receipt_verification;
      easPayload: eas_payload;
    };

export function LocalReceiptClient({ receiptId }: { receiptId: string }) {
  const [state, setState] = useState<local_receipt_state>({
    status: "loading",
  });
  const [
    receiptAccountValueContextState,
    setReceiptAccountValueContextState,
  ] = useState<{
    receiptId: string;
    context: receipt_account_value_context | null;
  } | null>(null);
  const handleReceiptAccountValueContextLoaded = useCallback(
    (context: receipt_account_value_context | null) => {
      setReceiptAccountValueContextState({ receiptId, context });
    },
    [receiptId],
  );
  const receiptAccountValueContext =
    receiptAccountValueContextState?.receiptId === receiptId
      ? receiptAccountValueContextState.context
      : null;

  useEffect(() => {
    let isMounted = true;

    async function loadReceipt() {
      const storedReceipt = parseStoredRiskReceipt(
        window.localStorage.getItem(getLocalReceiptStorageKey(receiptId)),
      );

      if (!storedReceipt) {
        setState({ status: "missing" });
        return;
      }

      try {
        const [verification, easPayload] = await Promise.all([
          verifyReceipt(storedReceipt),
          buildEasAttestationPayload(storedReceipt),
        ]);

        if (isMounted) {
          setState({
            status: "loaded",
            receipt: storedReceipt,
            verification,
            easPayload,
          });
        }
      } catch (error) {
        if (isMounted) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Could not load local receipt.",
          });
        }
      }
    }

    void loadReceipt();

    return () => {
      isMounted = false;
    };
  }, [receiptId]);

  if (state.status === "loading") {
    return <ReceiptState title="Loading receipt" body="Reading the local receipt from this browser." />;
  }

  if (state.status === "missing") {
    return (
      <ReceiptState
        title="Local receipt not found"
        body="This live receipt was stored only in the browser that created it. Create a new live receipt from the dashboard or import a portable receipt bundle."
      />
    );
  }

  if (state.status === "error") {
    return <ReceiptState title="Receipt error" body={state.message} />;
  }

  return (
    <ReceiptView
      easPayload={state.easPayload}
      extraSections={
        <>
          <PortableReceiptPanel receipt={state.receipt} />
          <ReceiptAccountValueContextPanel
            onContextLoaded={handleReceiptAccountValueContextLoaded}
            receipt={state.receipt}
          />
          <LiveRecheckPanel
            hashVerified={state.verification.matches}
            receipt={state.receipt}
            receiptAccountValueContext={receiptAccountValueContext}
          />
        </>
      }
      receipt={state.receipt}
      storageNote="This live receipt is stored in this browser only. The URL will work here, but it is not synced to a backend or shared across devices."
      verification={state.verification}
    />
  );
}

function ReceiptState({ title, body }: { title: string; body: string }) {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-3xl rounded-lg border border-stone-300 bg-white p-6">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-800">
          Local receipt
        </p>
        <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm text-stone-600">{body}</p>
        <Link
          className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-stone-950 px-4 text-sm font-semibold text-white"
          href="/"
        >
          Back to dashboard
        </Link>
        <Link
          className="ml-0 mt-3 inline-flex min-h-11 items-center rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-950 sm:ml-3"
          href="/receipt/import"
        >
          Import bundle
        </Link>
      </section>
    </main>
  );
}
