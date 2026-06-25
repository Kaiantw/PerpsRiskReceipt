import {
  formatPercentFromBps,
  formatUsd,
} from "@/lib/formatters.ts";
import {
  buildLiquidationBufferLadder,
  type liquidation_buffer_label,
} from "@/lib/liquidation/liquidation-buffer.ts";
import type { normalized_account_snapshot } from "@/lib/perps/types.ts";

const labelCopy: Record<liquidation_buffer_label, string> = {
  no_positions: "no positions",
  unavailable: "unavailable",
  at_or_through: "through liq.",
  thin: "thin buffer",
  tight: "tight buffer",
  moderate: "moderate buffer",
  wide: "wide buffer",
};

const labelTone: Record<liquidation_buffer_label, string> = {
  no_positions: "border-stone-200 bg-stone-100 text-stone-700",
  unavailable: "border-stone-200 bg-stone-100 text-stone-700",
  at_or_through: "border-red-200 bg-red-100 text-red-950",
  thin: "border-red-200 bg-red-100 text-red-950",
  tight: "border-amber-200 bg-amber-100 text-amber-950",
  moderate: "border-yellow-200 bg-yellow-100 text-yellow-950",
  wide: "border-emerald-200 bg-emerald-100 text-emerald-950",
};

export function LiquidationBufferPanel({
  snapshot,
}: {
  snapshot: normalized_account_snapshot;
}) {
  const ladder = buildLiquidationBufferLadder(snapshot);

  return (
    <section className="rounded-lg border border-stone-300 bg-white">
      <div className="flex flex-col gap-3 border-b border-stone-200 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Liquidation buffer ladder</h2>
          <p className="mt-1 text-sm text-stone-600">{ladder.headline}</p>
        </div>
        <span
          className={`rounded-lg border px-3 py-2 text-sm font-semibold ${labelTone[ladder.label]}`}
        >
          {labelCopy[ladder.label]}
        </span>
      </div>

      <dl className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <BufferMetric
          label="Closest market"
          value={ladder.closest_position?.market ?? "n/a"}
        />
        <BufferMetric
          label="Listed buffer"
          value={formatPercentFromBps(
            ladder.closest_position?.liquidation_distance_bps ?? null,
          )}
        />
        <BufferMetric
          label="Adverse move"
          value={formatPercent(ladder.closest_position?.adverse_move_percent)}
        />
        <BufferMetric
          label="Missing liq. prices"
          value={String(ladder.unavailable_position_count)}
        />
      </dl>

      {ladder.positions.length === 0 ? (
        <p className="border-t border-stone-200 px-4 py-3 text-sm text-stone-600">
          No open positions to rank by listed liquidation buffer.
        </p>
      ) : (
        <div className="overflow-x-auto border-t border-stone-200">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-stone-100 text-xs uppercase text-stone-600">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Market</th>
                <th className="px-4 py-3">Side</th>
                <th className="px-4 py-3">Mark</th>
                <th className="px-4 py-3">Listed liq.</th>
                <th className="px-4 py-3">Buffer</th>
                <th className="px-4 py-3">Adverse move</th>
                <th className="px-4 py-3">Approx PnL to liq.</th>
                <th className="px-4 py-3">Read</th>
              </tr>
            </thead>
            <tbody>
              {ladder.positions.map((position, index) => (
                <tr className="border-t border-stone-200" key={position.market}>
                  <td className="px-4 py-3 font-mono">{index + 1}</td>
                  <td className="px-4 py-3 font-mono">{position.market}</td>
                  <td className="px-4 py-3 capitalize">{position.side}</td>
                  <td className="px-4 py-3">
                    {formatUsd(position.mark_price_usd)}
                  </td>
                  <td className="px-4 py-3">
                    {formatNullableUsd(position.liquidation_price_usd)}
                  </td>
                  <td className="px-4 py-3">
                    {formatPercentFromBps(position.liquidation_distance_bps)}
                  </td>
                  <td className="px-4 py-3">
                    {formatPercent(position.adverse_move_percent)}
                  </td>
                  <td className="px-4 py-3">
                    {formatNullableUsd(
                      position.approximate_pnl_to_liquidation_usd,
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-lg border px-2 py-1 text-xs font-semibold ${labelTone[position.label]}`}
                    >
                      {labelCopy[position.label]}
                    </span>
                    <p className="mt-2 max-w-72 text-xs leading-5 text-stone-600">
                      {position.summary}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="border-t border-stone-200 px-4 py-3 text-xs text-stone-500">
        This uses listed liquidation prices from the loaded snapshot. Cross
        margin, funding, and other open-position PnL can change actual
        liquidation behavior.
      </p>
    </section>
  );
}

function BufferMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
      <dt className="text-xs font-medium uppercase text-stone-500">{label}</dt>
      <dd className="mt-2 break-words font-mono text-sm font-semibold text-stone-950">
        {value}
      </dd>
    </div>
  );
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "n/a";
  }

  return `${value.toFixed(2)}%`;
}

function formatNullableUsd(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return formatUsd(value);
}
