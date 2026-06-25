import {
  formatPercentFromBps,
  formatSignedBps,
  formatSignedUsd,
  formatUsd,
} from "@/lib/formatters.ts";
import { calculateFundingCarryWatch } from "@/lib/funding/funding-watch.ts";
import type { normalized_account_snapshot } from "@/lib/perps/types.ts";

const labelCopy = {
  no_positions: "no carry exposure",
  earning: "net earning",
  neutral: "near flat",
  low_cost: "low cost",
  elevated_cost: "elevated cost",
  heavy_cost: "heavy cost",
};

const labelTone = {
  no_positions: "border-stone-200 bg-stone-100 text-stone-700",
  earning: "border-emerald-200 bg-emerald-100 text-emerald-950",
  neutral: "border-stone-200 bg-stone-100 text-stone-700",
  low_cost: "border-yellow-200 bg-yellow-100 text-yellow-950",
  elevated_cost: "border-amber-200 bg-amber-100 text-amber-950",
  heavy_cost: "border-red-200 bg-red-100 text-red-950",
};

export function FundingCarryWatchPanel({
  snapshot,
}: {
  snapshot: normalized_account_snapshot;
}) {
  const watch = calculateFundingCarryWatch(snapshot);

  return (
    <section className="rounded-lg border border-stone-300 bg-white">
      <div className="flex flex-col gap-3 border-b border-stone-200 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Funding carry watch</h2>
          <p className="mt-1 text-sm text-stone-600">{watch.summary}</p>
        </div>
        <span
          className={`rounded-lg border px-3 py-2 text-sm font-semibold ${labelTone[watch.label]}`}
        >
          {labelCopy[watch.label]}
        </span>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
        <FundingMetric
          label="Net daily funding"
          value={formatSignedUsd(watch.daily_net_funding_usd)}
        />
        <FundingMetric
          label="30-day estimate"
          value={formatSignedUsd(watch.thirty_day_net_funding_usd)}
        />
        <FundingMetric
          label="Daily burden"
          value={formatPercentFromBps(
            watch.daily_funding_bps_of_account_value,
          )}
        />
        <FundingMetric
          label="Largest cost"
          value={
            watch.top_cost_position
              ? `${watch.top_cost_position.market} ${formatSignedUsd(
                  watch.top_cost_position.daily_funding_usd,
                )}`
              : "n/a"
          }
        />
        <FundingMetric
          label="Largest earn"
          value={
            watch.top_earning_position
              ? `${watch.top_earning_position.market} ${formatSignedUsd(
                  watch.top_earning_position.daily_funding_usd,
                )}`
              : "n/a"
          }
        />
      </div>

      {watch.positions.length === 0 ? (
        <p className="border-t border-stone-200 px-4 py-3 text-sm text-stone-600">
          No open positions to estimate funding carry.
        </p>
      ) : (
        <div className="overflow-x-auto border-t border-stone-200">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-stone-100 text-xs uppercase text-stone-600">
              <tr>
                <th className="px-4 py-3">Market</th>
                <th className="px-4 py-3">Side</th>
                <th className="px-4 py-3">Notional</th>
                <th className="px-4 py-3">Funding 8h</th>
                <th className="px-4 py-3">Daily</th>
                <th className="px-4 py-3">30d</th>
              </tr>
            </thead>
            <tbody>
              {watch.positions.map((position) => (
                <tr className="border-t border-stone-200" key={position.market}>
                  <td className="px-4 py-3 font-mono">{position.market}</td>
                  <td className="px-4 py-3 capitalize">{position.side}</td>
                  <td className="px-4 py-3">{formatUsd(position.notional_usd)}</td>
                  <td className="px-4 py-3">
                    {formatSignedBps(
                      position.funding_8h_bps_user_perspective,
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {formatSignedUsd(position.daily_funding_usd)}
                  </td>
                  <td className="px-4 py-3">
                    {formatSignedUsd(position.thirty_day_funding_usd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="border-t border-stone-200 px-4 py-3 text-xs text-stone-500">
        Estimate assumes current funding and notional stay unchanged. Hyperliquid
        funding settles hourly; this app displays the normalized 8-hour user
        perspective as a holding-cost estimate.
      </p>
    </section>
  );
}

function FundingMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
      <dt className="text-xs font-medium uppercase text-stone-500">{label}</dt>
      <dd className="mt-2 break-words font-mono text-sm font-semibold text-stone-950">
        {value}
      </dd>
    </div>
  );
}
