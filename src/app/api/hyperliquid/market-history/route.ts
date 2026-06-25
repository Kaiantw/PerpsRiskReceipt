import { NextResponse } from "next/server";

import {
  fetchHyperliquidMarketHistory,
  HyperliquidAdapterError,
} from "@/lib/hyperliquid/adapter.ts";

export const dynamic = "force-dynamic";

const HISTORY_WINDOW_HOURS = 24;
const HISTORY_INTERVAL = "1h";
const MAX_HISTORY_MARKET_COUNT = 5;
const MARKET_NAME_PATTERN = /^[A-Za-z0-9:]+-PERP$/;

function parseRequestedMarkets(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawMarkets = searchParams.get("markets") ?? "";

  return rawMarkets
    .split(",")
    .map((market) => market.trim())
    .filter(Boolean);
}

export async function GET(request: Request) {
  const markets = parseRequestedMarkets(request);

  if (markets.length === 0) {
    return NextResponse.json(
      { error: "At least one market is required." },
      { status: 400 },
    );
  }

  if (markets.length > MAX_HISTORY_MARKET_COUNT) {
    return NextResponse.json(
      {
        error: `Market history lookup is limited to ${MAX_HISTORY_MARKET_COUNT} markets.`,
      },
      { status: 400 },
    );
  }

  if (!markets.every((market) => MARKET_NAME_PATTERN.test(market))) {
    return NextResponse.json(
      { error: "Markets must use the Hyperliquid PERP market format." },
      { status: 400 },
    );
  }

  const endTimeMs = Date.now();
  const startTimeMs = endTimeMs - HISTORY_WINDOW_HOURS * 60 * 60 * 1000;

  try {
    const histories = await fetchHyperliquidMarketHistory({
      markets,
      startTimeMs,
      endTimeMs,
      interval: HISTORY_INTERVAL,
    });

    return NextResponse.json({
      fetched_at_iso: new Date().toISOString(),
      interval: HISTORY_INTERVAL,
      window_hours: HISTORY_WINDOW_HOURS,
      histories,
    });
  } catch (error) {
    const message =
      error instanceof HyperliquidAdapterError
        ? error.message
        : "Hyperliquid market history lookup failed.";

    return NextResponse.json(
      {
        error: message,
        fallback:
          "Use current market context while 24h market history is unavailable.",
      },
      { status: 502 },
    );
  }
}
