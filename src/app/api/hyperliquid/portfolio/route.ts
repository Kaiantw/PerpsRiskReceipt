import { NextResponse } from "next/server";

import {
  fetchHyperliquidPortfolioHistory,
  HyperliquidAdapterError,
  isHyperliquidAddress,
} from "@/lib/hyperliquid/adapter.ts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.trim() ?? "";

  if (!isHyperliquidAddress(address)) {
    return NextResponse.json(
      { error: "Invalid Hyperliquid address format." },
      { status: 400 },
    );
  }

  try {
    const timelines = await fetchHyperliquidPortfolioHistory({ address });

    return NextResponse.json({ timelines });
  } catch (error) {
    const message =
      error instanceof HyperliquidAdapterError
        ? error.message
        : "Hyperliquid portfolio history lookup failed.";

    return NextResponse.json(
      {
        error: message,
        fallback: "Use current snapshot risk while portfolio history is unavailable.",
      },
      { status: 502 },
    );
  }
}
