import {
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

      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-6">
        <FundingMetric
          label="Next hourly est."
          value={formatSignedUsd(watch.next_hour_net_funding_usd)}
        />
        <FundingMetric
          label="8h rate basis"
          value={formatSignedUsd(watch.eight_hour_rate_net_funding_usd)}
        />
        <FundingMetric
          label="Net daily funding"
          value={formatSignedUsd(watch.daily_net_funding_usd)}
        />
        <FundingMetric
          label="30-day estimate"
          value={formatSignedUsd(watch.thirty_day_net_funding_usd)}
        />
        <FundingMetric
          label="Hourly burden"
          value={formatNullableBps(watch.next_hour_funding_bps_of_account_value)}
        />
        <FundingMetric
          label="Largest cost"
          value={
            watch.top_cost_position
              ? `${watch.top_cost_position.market} ${formatSignedUsd(
                  watch.top_cost_position.next_hour_funding_usd,
                )}`
              : "n/a"
          }
        />
        <FundingMetric
          label="Largest earn"
          value={
            watch.top_earning_position
              ? `${watch.top_earning_position.market} ${formatSignedUsd(
                  watch.top_earning_position.next_hour_funding_usd,
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
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-stone-100 text-xs uppercase text-stone-600">
              <tr>
                <th className="px-4 py-3">Market</th>
                <th className="px-4 py-3">Side</th>
                <th className="px-4 py-3">Notional</th>
                <th className="px-4 py-3">Funding 8h</th>
                <th className="px-4 py-3">Next hour</th>
                <th className="px-4 py-3">8h basis</th>
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
                    {formatSignedUsd(position.next_hour_funding_usd)}
                  </td>
                  <td className="px-4 py-3">
                    {formatSignedUsd(position.eight_hour_rate_funding_usd)}
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

      <ul className="space-y-2 border-t border-stone-200 px-4 py-3 text-xs leading-5 text-stone-600">
        {watch.review_points.map((point) => (
          <li className="flex gap-2" key={point}>
            <span
              aria-hidden="true"
              className="mt-2 h-1.5 w-1.5 rounded-full bg-stone-400"
            />
            <span>{point}</span>
          </li>
        ))}
      </ul>

      <p className="border-t border-stone-200 px-4 py-3 text-xs text-stone-500">
        Estimate assumes current funding and notional stay unchanged. Hyperliquid
        funding uses an 8-hour formula and settles hourly; this app displays a
        normalized user-perspective holding-cost estimate.
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

function formatNullableBps(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return `${value.toFixed(2)} bps`;
}
