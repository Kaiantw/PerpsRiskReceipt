import { NextResponse } from "next/server";

import {
  fetchHyperliquidMarketContexts,
  HyperliquidAdapterError,
} from "@/lib/hyperliquid/adapter.ts";

export const dynamic = "force-dynamic";

const MAX_MARKET_COUNT = 20;
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

  if (markets.length > MAX_MARKET_COUNT) {
    return NextResponse.json(
      { error: `Market lookup is limited to ${MAX_MARKET_COUNT} markets.` },
      { status: 400 },
    );
  }

  if (!markets.every((market) => MARKET_NAME_PATTERN.test(market))) {
    return NextResponse.json(
      { error: "Markets must use the Hyperliquid PERP market format." },
      { status: 400 },
    );
  }

  try {
    const contexts = await fetchHyperliquidMarketContexts({ markets });

    return NextResponse.json({
      fetched_at_iso: new Date().toISOString(),
      markets: contexts,
    });
  } catch (error) {
    const message =
      error instanceof HyperliquidAdapterError
        ? error.message
        : "Hyperliquid market context lookup failed.";

    return NextResponse.json(
      {
        error: message,
        fallback:
          "Use the redacted receipt summary while live market context is unavailable.",
      },
      { status: 502 },
    );
  }
}
