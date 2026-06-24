import Link from "next/link";

import {
  formatIsoDate,
  formatPercentFromBps,
  formatSignedUsd,
  formatUsd,
  truncateMiddle,
} from "@/lib/formatters.ts";
import {
  getFixtureReceiptById,
  getFixtureReceipts,
  verifyReceipt,
} from "@/lib/receipts/receipt.ts";

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
  const snapshot = receipt.snapshot;
  const aggregate = snapshot.aggregate;

  return (
    <main className="min-h-screen px-4 py-6 text-stone-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-stone-300 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-800">
              Risk receipt
            </p>
            <h1 className="mt-2 break-words text-3xl font-semibold tracking-normal">
              {receipt.id}
            </h1>
          </div>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-950"
            href="/"
          >
            Dashboard
          </Link>
        </header>

        <section className="rounded-lg border border-stone-300 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ReceiptMetric label="Account" value={snapshot.account} />
            <ReceiptMetric label="Protocol" value={snapshot.protocol} />
            <ReceiptMetric label="Created" value={formatIsoDate(receipt.created_at_iso)} />
            <ReceiptMetric label="Data timestamp" value={formatIsoDate(snapshot.data_time_iso)} />
            <ReceiptMetric label="Risk score" value={`${aggregate.risk_score} · ${aggregate.risk_label}`} />
            <ReceiptMetric label="Account value" value={formatUsd(snapshot.account_value_usd)} />
            <ReceiptMetric label="Margin usage" value={formatPercentFromBps(aggregate.margin_usage_bps)} />
            <ReceiptMetric label="Total notional" value={formatUsd(aggregate.total_notional_usd)} />
          </div>
        </section>

        <section className="rounded-lg border border-stone-300 bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Snapshot hash</h2>
              <p className="mt-2 break-all font-mono text-sm text-stone-700">
                {receipt.snapshot_hash}
              </p>
            </div>
            <span
              className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                verification.matches
                  ? "border-emerald-200 bg-emerald-100 text-emerald-950"
                  : "border-red-200 bg-red-100 text-red-950"
              }`}
            >
              {verification.matches ? "Hash verified" : "Hash mismatch"}
            </span>
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <ReceiptMetric
              label="Expected hash"
              value={truncateMiddle(verification.expected_hash, 14)}
            />
            <ReceiptMetric
              label="Recomputed hash"
              value={truncateMiddle(verification.recomputed_hash, 14)}
            />
          </dl>
        </section>

        <section className="rounded-lg border border-stone-300 bg-white">
          <div className="border-b border-stone-200 px-4 py-3">
            <h2 className="text-lg font-semibold">Market summary</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead className="bg-stone-100 text-xs uppercase text-stone-600">
                <tr>
                  <th className="px-4 py-3">Market</th>
                  <th className="px-4 py-3">Side</th>
                  <th className="px-4 py-3">Notional</th>
                  <th className="px-4 py-3">Unrealized PnL</th>
                  <th className="px-4 py-3">Liquidation distance</th>
                  <th className="px-4 py-3">Daily funding</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.positions.map((position) => (
                  <tr className="border-t border-stone-200" key={position.market}>
                    <td className="px-4 py-3 font-mono">{position.market}</td>
                    <td className="px-4 py-3 capitalize">{position.side}</td>
                    <td className="px-4 py-3">{formatUsd(position.notional_usd)}</td>
                    <td className="px-4 py-3">
                      {formatSignedUsd(position.unrealized_pnl_usd)}
                    </td>
                    <td className="px-4 py-3">
                      {formatPercentFromBps(
                        position.liquidation_price_usd === null
                          ? null
                          : snapshot.aggregate.min_liquidation_distance_bps,
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {formatSignedUsd(snapshot.aggregate.daily_funding_usd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-stone-300 bg-white p-4">
          <h2 className="text-lg font-semibold">Attestation</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <ReceiptMetric
              label="EAS schema UID"
              value={receipt.eas_schema_uid ?? "not attested"}
            />
            <ReceiptMetric
              label="EAS attestation UID"
              value={receipt.eas_attestation_uid ?? "not attested"}
            />
            <ReceiptMetric label="Tx hash" value={receipt.tx_hash ?? "not attested"} />
            <ReceiptMetric
              label="Chain ID"
              value={receipt.chain_id ? String(receipt.chain_id) : "not attested"}
            />
          </dl>
        </section>

        <section className="rounded-lg border border-stone-300 bg-white p-4">
          <h2 className="text-lg font-semibold">Limitations</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-stone-700">
            <li>Risk score is heuristic, not official protocol risk.</li>
            <li>Fixture data may not reflect live account or market state.</li>
            <li>Snapshot hash verifies this JSON snapshot, not the external data source.</li>
            <li>No trading, order placement, or strategy recommendations are included.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}

function ReceiptMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
      <dt className="text-xs font-medium uppercase text-stone-500">{label}</dt>
      <dd className="mt-2 break-words font-mono text-sm font-semibold text-stone-950">
        {value}
      </dd>
    </div>
  );
}
