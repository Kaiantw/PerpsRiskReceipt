import { NextResponse } from "next/server";

import {
  fetchHyperliquidSnapshot,
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
    const snapshot = await fetchHyperliquidSnapshot({ address });

    return NextResponse.json({ snapshot });
  } catch (error) {
    const message =
      error instanceof HyperliquidAdapterError
        ? error.message
        : "Hyperliquid lookup failed.";

    return NextResponse.json(
      {
        error: message,
        fallback: "Use a fixture account while live Hyperliquid data is unavailable.",
      },
      { status: 502 },
    );
  }
}
