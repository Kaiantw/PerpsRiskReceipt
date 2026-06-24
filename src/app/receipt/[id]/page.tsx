import Link from "next/link";

import { buildEasAttestationPayload } from "@/lib/eas/attestation.ts";
import {
  getFixtureReceiptById,
  getFixtureReceipts,
  verifyReceipt,
} from "@/lib/receipts/receipt.ts";
import { ReceiptView } from "../receipt-view.tsx";

export async function generateStaticParams() {
  const receipts = await getFixtureReceipts();

  return receipts.map((receipt) => ({
    id: receipt.id,
  }));
}

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const receipt = await getFixtureReceiptById(id);

  if (!receipt) {
    return (
      <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-3xl rounded-lg border border-stone-300 bg-white p-6">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-red-800">
            Receipt not found
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Unknown receipt</h1>
          <p className="mt-3 text-sm text-stone-600">
            No fixture receipt matched this id.
          </p>
          <Link
            className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-stone-950 px-4 text-sm font-semibold text-white"
            href="/"
          >
            Back to dashboard
          </Link>
        </section>
      </main>
    );
  }

  const verification = await verifyReceipt(receipt);
  const easPayload = await buildEasAttestationPayload(receipt);

  return (
    <ReceiptView
      easPayload={easPayload}
      receipt={receipt}
      verification={verification}
    />
  );
}
