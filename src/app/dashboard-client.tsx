"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  formatIsoDate,
  formatPercentFromBps,
  formatSignedBps,
  formatSignedUsd,
  formatUsd,
} from "@/lib/formatters.ts";
import type { normalized_account_snapshot } from "@/lib/perps/types.ts";
import {
  calculateDailyFundingUsd,
  calculateLiquidationDistanceBps,
  runPriceScenario,
} from "@/lib/risk/risk-engine.ts";
import { getLocalReceiptStorageKey } from "@/lib/receipts/local-receipts.ts";
import { createRiskReceipt } from "@/lib/receipts/receipt.ts";
import { RiskAssistantPanel } from "./risk-assistant-panel.tsx";

const scenarioMoves = [-10, -5, -2, 2, 5, 10];

type live_lookup_state =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; message: string }
  | { status: "error"; message: string };

type receipt_creation_state =
  | { status: "idle" }
  | { status: "creating" }
  | { status: "error"; message: string };

type DashboardClientProps = {
  snapshots: normalized_account_snapshot[];
  receiptPathsByAccount: Record<string, string>;
};

function getRiskTone(label: normalized_account_snapshot["aggregate"]["risk_label"]) {
  if (label === "critical") {
    return "bg-red-100 text-red-900 border-red-200";
  }

  if (label === "high") {
    return "bg-amber-100 text-amber-950 border-amber-200";
  }

  if (label === "medium") {
    return "bg-yellow-100 text-yellow-950 border-yellow-200";
  }

  return "bg-emerald-100 text-emerald-950 border-emerald-200";
}

function getRiskNote(position: normalized_account_snapshot["positions"][number]) {
  const liquidationDistance = calculateLiquidationDistanceBps(position);
  const fundingUsd = calculateDailyFundingUsd(position);
  const sideCopy = position.side === "long" ? "below" : "above";
  const fundingCopy =
    fundingUsd > 0
      ? `${formatUsd(fundingUsd)} estimated daily funding cost.`
      : `${formatUsd(Math.abs(fundingUsd))} estimated daily funding earned.`;

  if (liquidationDistance === null) {
    return `No listed liquidation price. ${fundingCopy}`;
  }

  if (liquidationDistance <= 500) {
    return `Listed liquidation is within ${formatPercentFromBps(liquidationDistance)} ${sideCopy} mark. ${fundingCopy}`;
  }

  return `Listed liquidation is ${formatPercentFromBps(liquidationDistance)} ${sideCopy} mark. ${fundingCopy}`;
}

export function DashboardClient({
  snapshots,
  receiptPathsByAccount,
}: DashboardClientProps) {
  const [selectedAccount, setSelectedAccount] = useState(
    snapshots[0]?.account ?? "",
  );
  const [addressInput, setAddressInput] = useState("");
  const [liveSnapshot, setLiveSnapshot] =
    useState<normalized_account_snapshot | null>(null);
  const [liveLookupState, setLiveLookupState] = useState<live_lookup_state>({
    status: "idle",
  });
  const [receiptCreationState, setReceiptCreationState] =
    useState<receipt_creation_state>({ status: "idle" });
  const [loadingAccount, setLoadingAccount] = useState(false);
  const selectedSnapshot = useMemo(
    () => {
      if (liveSnapshot?.account === selectedAccount) {
        return liveSnapshot;
      }

      return (
        snapshots.find((snapshot) => snapshot.account === selectedAccount) ??
        snapshots[0]
      );
    },
    [liveSnapshot, selectedAccount, snapshots],
  );
  const scenarios = useMemo(
    () =>
      selectedSnapshot
        ? scenarioMoves.map((move) => runPriceScenario(selectedSnapshot, move))
        : [],
    [selectedSnapshot],
  );
  const trimmedAddress = addressInput.trim();
  const hasAddressInput = trimmedAddress.length > 0;
  const hasInvalidAddress =
    hasAddressInput && !/^0x[a-fA-F0-9]{40}$/.test(trimmedAddress);
  const isLiveSnapshotSelected = selectedSnapshot?.source === "live";
  const demoAccountValue =
    selectedSnapshot && selectedSnapshot.source === "fixture"
      ? selectedSnapshot.account
      : "";

  function selectAccount(account: string) {
    setLoadingAccount(true);
    setLiveSnapshot(null);
    setLiveLookupState({ status: "idle" });
    setReceiptCreationState({ status: "idle" });
    setSelectedAccount(account);
    window.setTimeout(() => setLoadingAccount(false), 200);
  }

  async function lookupHyperliquidAddress() {
    if (!hasAddressInput || hasInvalidAddress) {
      setLiveLookupState({ status: "idle" });
      return;
    }

    setLiveLookupState({ status: "loading" });

    try {
      const response = await fetch(
        `/api/hyperliquid/snapshot?address=${encodeURIComponent(trimmedAddress)}`,
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Hyperliquid lookup failed.");
      }

      setLiveSnapshot(payload.snapshot);
      setSelectedAccount(payload.snapshot.account);
      setReceiptCreationState({ status: "idle" });
      setLiveLookupState({
        status: "loaded",
        message: "Live Hyperliquid snapshot loaded.",
      });
    } catch (error) {
      setLiveLookupState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Hyperliquid lookup failed. Fixture accounts are still available.",
      });
    }
  }

  async function createLocalReceipt() {
    if (!selectedSnapshot) {
      return;
    }

    setReceiptCreationState({ status: "creating" });

    try {
      const receipt = await createRiskReceipt(selectedSnapshot);
      window.localStorage.setItem(
        getLocalReceiptStorageKey(receipt.id),
        JSON.stringify(receipt),
      );
      window.location.href = `/receipt/local/${receipt.id}`;
    } catch (error) {
      setReceiptCreationState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not create a local receipt.",
      });
    }
  }

  if (!selectedSnapshot) {
    return (
      <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-6xl rounded-lg border border-stone-300 bg-white p-6">
          <h1 className="text-2xl font-semibold">No fixture accounts</h1>
          <p className="mt-2 text-sm text-stone-600">
            No demo account snapshots are available in the fixture loader.
          </p>
        </section>
      </main>
    );
  }

  const aggregate = selectedSnapshot.aggregate;
  const receiptPath = receiptPathsByAccount[selectedSnapshot.account] ?? null;

  return (
    <main className="min-h-screen px-4 py-6 text-stone-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-stone-300 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-800">
              Perp Risk Receipt
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">
              Risk dashboard
            </h1>
          </div>
          {receiptPath ? (
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-stone-950 px-4 text-sm font-semibold text-white transition hover:bg-stone-800"
              href={receiptPath}
            >
              Create receipt
            </Link>
          ) : isLiveSnapshotSelected ? (
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-stone-950 px-4 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
              disabled={receiptCreationState.status === "creating"}
              onClick={() => {
                void createLocalReceipt();
              }}
              type="button"
            >
              {receiptCreationState.status === "creating"
                ? "Creating receipt"
                : "Create local receipt"}
            </button>
          ) : (
            <span className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-600">
              Fixture receipts only
            </span>
          )}
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(260px,320px)_1fr]">
          <div className="rounded-lg border border-stone-300 bg-white p-4">
            <label
              className="text-sm font-semibold text-stone-700"
              htmlFor="demo-account"
            >
              Demo account
            </label>
            <select
              className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm"
              id="demo-account"
              onChange={(event) => selectAccount(event.target.value)}
              value={demoAccountValue}
            >
              {isLiveSnapshotSelected ? (
                <option value="">Live lookup loaded</option>
              ) : null}
              {snapshots.map((snapshot) => (
                <option key={snapshot.account} value={snapshot.account}>
                  {snapshot.account}
                </option>
              ))}
            </select>

            <form
              className="mt-5"
              onSubmit={(event) => {
                event.preventDefault();
                void lookupHyperliquidAddress();
              }}
            >
              <label
                className="block text-sm font-semibold text-stone-700"
                htmlFor="hyperliquid-address"
              >
                Hyperliquid address
              </label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  className="h-11 min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 font-mono text-sm"
                  id="hyperliquid-address"
                  onChange={(event) => {
                    setAddressInput(event.target.value);
                    setLiveLookupState({ status: "idle" });
                  }}
                  placeholder="0x..."
                  value={addressInput}
                />
                <button
                  className="h-11 rounded-lg bg-stone-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-stone-400"
                  disabled={
                    !hasAddressInput ||
                    hasInvalidAddress ||
                    liveLookupState.status === "loading"
                  }
                  type="submit"
                >
                  {liveLookupState.status === "loading" ? "Loading" : "Lookup"}
                </button>
              </div>
            </form>
            {hasInvalidAddress ? (
              <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                Invalid address format.
              </p>
            ) : null}
            {liveLookupState.status === "loaded" ? (
              <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
                {liveLookupState.message}
              </p>
            ) : null}
            {liveLookupState.status === "error" ? (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                {liveLookupState.message}
              </p>
            ) : null}
            {receiptCreationState.status === "error" ? (
              <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                {receiptCreationState.message}
              </p>
            ) : null}
          </div>

          <div className="rounded-lg border border-stone-300 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-sm text-stone-500">
                  {selectedSnapshot.account}
                </p>
                <h2 className="text-2xl font-semibold">Account risk loaded</h2>
              </div>
              <span
                className={`rounded-lg border px-3 py-2 text-sm font-semibold ${getRiskTone(aggregate.risk_label)}`}
              >
                {aggregate.risk_label} · {aggregate.risk_score}
              </span>
            </div>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Account value" value={formatUsd(selectedSnapshot.account_value_usd)} />
              <Metric label="Margin used" value={formatUsd(selectedSnapshot.margin_used_usd)} />
              <Metric label="Margin usage" value={formatPercentFromBps(aggregate.margin_usage_bps)} />
              <Metric label="Total notional" value={formatUsd(aggregate.total_notional_usd)} />
              <Metric label="Min liq. distance" value={formatPercentFromBps(aggregate.min_liquidation_distance_bps)} />
              <Metric label="Daily funding" value={formatSignedUsd(aggregate.daily_funding_usd)} />
              <Metric label="30-day funding" value={formatSignedUsd(aggregate.thirty_day_funding_usd)} />
              <Metric label="Data timestamp" value={formatIsoDate(selectedSnapshot.data_time_iso)} />
            </dl>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-stone-600">
              <span className="rounded-lg bg-stone-100 px-2.5 py-1">
                Source: {selectedSnapshot.source}
              </span>
              <span className="rounded-lg bg-stone-100 px-2.5 py-1">
                Freshness: {selectedSnapshot.freshness}
              </span>
              {loadingAccount ? (
                <span className="rounded-lg bg-blue-100 px-2.5 py-1 text-blue-900">
                  Loading account...
                </span>
              ) : null}
              {!receiptPath ? (
                <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-amber-950">
                  Receipt stored in this browser
                </span>
              ) : null}
            </div>
          </div>
        </section>

        <RiskAssistantPanel
          key={`${selectedSnapshot.account}-${selectedSnapshot.data_time_iso}`}
          snapshot={selectedSnapshot}
        />

        <section className="rounded-lg border border-stone-300 bg-white">
          <div className="border-b border-stone-200 px-4 py-3">
            <h2 className="text-lg font-semibold">Positions</h2>
          </div>
          {selectedSnapshot.positions.length === 0 ? (
            <p className="p-4 text-sm text-stone-600">No open positions.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1000px] w-full text-left text-sm">
                <thead className="bg-stone-100 text-xs uppercase text-stone-600">
                  <tr>
                    <TableHead>Market</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Entry</TableHead>
                    <TableHead>Mark</TableHead>
                    <TableHead>Liquidation</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Notional</TableHead>
                    <TableHead>Unrealized PnL</TableHead>
                    <TableHead>Funding 8h</TableHead>
                    <TableHead>Daily funding</TableHead>
                    <TableHead>30d funding</TableHead>
                    <TableHead>Risk note</TableHead>
                  </tr>
                </thead>
                <tbody>
                  {selectedSnapshot.positions.map((position) => {
                    const dailyFunding = calculateDailyFundingUsd(position);

                    return (
                      <tr
                        className="border-t border-stone-200 align-top"
                        key={position.market}
                      >
                        <TableCell mono>{position.market}</TableCell>
                        <TableCell>
                          <span className="capitalize">{position.side}</span>
                        </TableCell>
                        <TableCell mono>{position.size}</TableCell>
                        <TableCell>{formatUsd(position.entry_price_usd)}</TableCell>
                        <TableCell>{formatUsd(position.mark_price_usd)}</TableCell>
                        <TableCell>
                          {position.liquidation_price_usd === null
                            ? "n/a"
                            : formatUsd(position.liquidation_price_usd)}
                        </TableCell>
                        <TableCell>
                          {formatPercentFromBps(
                            calculateLiquidationDistanceBps(position),
                          )}
                        </TableCell>
                        <TableCell>{formatUsd(position.notional_usd)}</TableCell>
                        <TableCell>{formatSignedUsd(position.unrealized_pnl_usd)}</TableCell>
                        <TableCell>{formatSignedBps(position.funding_8h_bps_user_perspective)}</TableCell>
                        <TableCell>{formatSignedUsd(dailyFunding)}</TableCell>
                        <TableCell>{formatSignedUsd(dailyFunding * 30)}</TableCell>
                        <TableCell>{getRiskNote(position)}</TableCell>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-stone-300 bg-white">
          <div className="border-b border-stone-200 px-4 py-3">
            <h2 className="text-lg font-semibold">Scenario simulator</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[780px] w-full text-left text-sm">
              <thead className="bg-stone-100 text-xs uppercase text-stone-600">
                <tr>
                  <TableHead>Move</TableHead>
                  <TableHead>Estimated account value</TableHead>
                  <TableHead>PnL change</TableHead>
                  <TableHead>Liquidation flags</TableHead>
                  <TableHead>Risk after move</TableHead>
                  <TableHead>Summary</TableHead>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((scenario) => (
                  <tr
                    className="border-t border-stone-200 align-top"
                    key={scenario.move_bps}
                  >
                    <TableCell>{scenario.move_percent}%</TableCell>
                    <TableCell>{formatUsd(scenario.estimated_account_value_usd)}</TableCell>
                    <TableCell>{formatSignedUsd(scenario.estimated_pnl_change_usd)}</TableCell>
                    <TableCell>
                      {scenario.positions_at_or_through_liquidation.length > 0
                        ? scenario.positions_at_or_through_liquidation.join(", ")
                        : "None"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded-lg border px-2 py-1 text-xs font-semibold ${getRiskTone(scenario.risk_label_after_move)}`}
                      >
                        {scenario.risk_label_after_move} ·{" "}
                        {scenario.risk_score_after_move}
                      </span>
                    </TableCell>
                    <TableCell>{scenario.summary}</TableCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
      <dt className="text-xs font-medium uppercase text-stone-500">{label}</dt>
      <dd className="mt-2 break-words font-mono text-lg font-semibold text-stone-950">
        {value}
      </dd>
    </div>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-semibold">{children}</th>;
}

function TableCell({
  children,
  mono = false,
}: {
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <td className={`px-4 py-3 ${mono ? "font-mono" : ""}`}>{children}</td>
  );
}
