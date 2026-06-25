import {
  formatPercentFromBps,
  formatSignedUsd,
  formatUsd,
} from "@/lib/formatters.ts";
import type { normalized_account_snapshot, risk_label } from "@/lib/perps/types.ts";
import {
  buildPositionRiskDrivers,
  type directional_bias,
  type position_risk_driver,
  type position_risk_driver_category,
  type position_risk_drivers,
} from "@/lib/risk/position-risk-drivers.ts";

const labelCopy: Record<position_risk_drivers["label"], string> = {
  no_positions: "no positions",
  low: "low",
  medium: "medium",
  high: "high",
  critical: "critical",
};

const labelTone: Record<position_risk_drivers["label"], string> = {
  no_positions: "border-stone-200 bg-stone-100 text-stone-700",
  low: "border-emerald-200 bg-emerald-100 text-emerald-950",
  medium: "border-yellow-200 bg-yellow-100 text-yellow-950",
  high: "border-amber-200 bg-amber-100 text-amber-950",
  critical: "border-red-200 bg-red-100 text-red-950",
};

const riskLabelTone: Record<risk_label, string> = {
  low: "border-emerald-200 bg-emerald-100 text-emerald-950",
  medium: "border-yellow-200 bg-yellow-100 text-yellow-950",
  high: "border-amber-200 bg-amber-100 text-amber-950",
  critical: "border-red-200 bg-red-100 text-red-950",
};

const primaryDriverCopy: Record<position_risk_driver_category, string> = {
  liquidation_buffer: "listed buffer",
  missing_liquidation: "missing liq.",
  notional_concentration: "notional",
  funding_cost: "funding cost",
  unrealized_loss: "unrealized loss",
};

const directionalBiasCopy: Record<directional_bias, string> = {
  no_positions: "no positions",
  balanced: "balanced",
  net_long: "net long",
  net_short: "net short",
};

export function PositionRiskDriversPanel({
  snapshot,
}: {
  snapshot: normalized_account_snapshot;
}) {
  const drivers = buildPositionRiskDrivers(snapshot);

  return (
    <section className="rounded-lg border border-stone-300 bg-white">
      <div className="flex flex-col gap-3 border-b border-stone-200 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Position risk drivers</h2>
          <p className="mt-1 text-sm text-stone-600">{drivers.headline}</p>
        </div>
        <span
          className={`rounded-lg border px-3 py-2 text-sm font-semibold ${labelTone[drivers.label]}`}
        >
          {labelCopy[drivers.label]}
        </span>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
        <DriverMetric
          label="Top driver"
          value={
            drivers.top_driver_position
              ? `${drivers.top_driver_position.market} · ${drivers.top_driver_position.driver_score}`
              : "n/a"
          }
        />
        <DriverMetric
          label="Gross exposure"
          value={formatBpsAsMultiple(
            drivers.gross_notional_to_account_value_bps,
          )}
        />
        <DriverMetric
          label="Largest share"
          value={formatPercentFromBps(drivers.largest_notional_share_bps)}
        />
        <DriverMetric
          label="Directional bias"
          value={directionalBiasCopy[drivers.directional_bias]}
        />
        <DriverMetric
          label="Net directional"
          value={formatSignedUsd(drivers.net_directional_notional_usd)}
        />
      </div>

      {drivers.positions.length === 0 ? (
        <p className="border-t border-stone-200 px-4 py-3 text-sm text-stone-600">
          No open positions to rank by risk contribution.
        </p>
      ) : (
        <div className="border-t border-stone-200 p-4">
          <div className="grid gap-3 lg:grid-cols-3">
            {drivers.positions.slice(0, 3).map((position) => (
              <DriverCard key={position.market} position={position} />
            ))}
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-stone-100 text-xs uppercase text-stone-600">
                <tr>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Market</th>
                  <th className="px-4 py-3">Side</th>
                  <th className="px-4 py-3">Driver</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Notional share</th>
                  <th className="px-4 py-3">Liq. distance</th>
                  <th className="px-4 py-3">Daily funding</th>
                  <th className="px-4 py-3">Unrealized PnL</th>
                  <th className="px-4 py-3">Score components</th>
                </tr>
              </thead>
              <tbody>
                {drivers.positions.map((position, index) => (
                  <tr className="border-t border-stone-200" key={position.market}>
                    <td className="px-4 py-3 font-mono">{index + 1}</td>
                    <td className="px-4 py-3 font-mono">{position.market}</td>
                    <td className="px-4 py-3 capitalize">{position.side}</td>
                    <td className="px-4 py-3">
                      {primaryDriverCopy[position.primary_driver]}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-lg border px-2 py-1 text-xs font-semibold ${riskLabelTone[position.driver_label]}`}
                      >
                        {position.driver_score}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {formatPercentFromBps(position.notional_share_bps)}
                    </td>
                    <td className="px-4 py-3">
                      {formatPercentFromBps(position.liquidation_distance_bps)}
                    </td>
                    <td className="px-4 py-3">
                      {formatSignedUsd(position.daily_funding_usd)}
                    </td>
                    <td className="px-4 py-3">
                      {formatSignedUsd(position.unrealized_pnl_usd)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      L {position.liquidation_score} · N{" "}
                      {position.notional_score} · F {position.funding_score} ·
                      PnL {position.unrealized_loss_score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="border-t border-stone-200 px-4 py-3 text-xs text-stone-500">
        Driver scores are heuristic. They combine listed liquidation buffer,
        notional exposure, positive funding burden, and unrealized loss. They do
        not model exact Hyperliquid liquidation behavior or suggest trades.
      </p>
    </section>
  );
}

function DriverCard({ position }: { position: position_risk_driver }) {
  return (
    <article className="rounded-lg border border-stone-200 bg-stone-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm font-semibold text-stone-950">
            {position.market}
          </p>
          <p className="mt-1 text-xs capitalize text-stone-600">
            {position.side} · {primaryDriverCopy[position.primary_driver]}
          </p>
        </div>
        <span
          className={`rounded-lg border px-2 py-1 text-xs font-semibold ${riskLabelTone[position.driver_label]}`}
        >
          {position.driver_score}
        </span>
      </div>

      <p className="mt-3 text-sm text-stone-700">{position.summary}</p>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <DriverMiniMetric
          label="Notional"
          value={formatUsd(position.notional_usd)}
        />
        <DriverMiniMetric
          label="Share"
          value={formatPercentFromBps(position.notional_share_bps)}
        />
        <DriverMiniMetric
          label="Liq. buffer"
          value={formatPercentFromBps(position.liquidation_distance_bps)}
        />
        <DriverMiniMetric
          label="Funding/day"
          value={formatSignedUsd(position.daily_funding_usd)}
        />
      </dl>
    </article>
  );
}

function DriverMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
      <dt className="text-xs font-medium uppercase text-stone-500">{label}</dt>
      <dd className="mt-2 break-words font-mono text-sm font-semibold text-stone-950">
        {value}
      </dd>
    </div>
  );
}

function DriverMiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-stone-200 bg-white p-2">
      <dt className="font-medium uppercase text-stone-500">{label}</dt>
      <dd className="mt-1 break-words font-mono font-semibold text-stone-950">
        {value}
      </dd>
    </div>
  );
}

function formatBpsAsMultiple(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return `${(value / 10_000).toFixed(2)}x`;
}
