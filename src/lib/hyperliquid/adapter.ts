import { normalizeAccountSnapshot } from "../risk/risk-engine.ts";
import type {
  account_snapshot_input,
  normalized_account_snapshot,
} from "../perps/types.ts";

export const HYPERLIQUID_INFO_ENDPOINT = "https://api.hyperliquid.xyz/info";
const STALE_AFTER_MS = 5 * 60 * 1000;

type hyperliquid_asset_context = {
  funding?: string | null;
  markPx?: string | null;
  openInterest?: string | null;
};

type hyperliquid_meta = {
  universe?: Array<{
    name?: string;
  }>;
};

export type hyperliquid_meta_and_asset_contexts = [
  hyperliquid_meta,
  hyperliquid_asset_context[],
];

export type hyperliquid_position = {
  type?: string;
  position?: {
    coin?: string;
    entryPx?: string | null;
    liquidationPx?: string | null;
    positionValue?: string | null;
    szi?: string | null;
    unrealizedPnl?: string | null;
  };
};

export type hyperliquid_clearinghouse_state = {
  assetPositions?: hyperliquid_position[];
  marginSummary?: {
    accountValue?: string;
    totalMarginUsed?: string;
  };
  time?: number;
  withdrawable?: string;
};

export type hyperliquid_fetch = (
  url: string,
  init: RequestInit,
) => Promise<Response>;

export class HyperliquidAdapterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HyperliquidAdapterError";
  }
}

export function isHyperliquidAddress(address: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function parseNumber(value: string | null | undefined) {
  if (value === null || value === undefined || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function getAssetContextsByCoin(
  metaAndAssetContexts: hyperliquid_meta_and_asset_contexts,
) {
  const [meta, assetContexts] = metaAndAssetContexts;
  const contextsByCoin = new Map<string, hyperliquid_asset_context>();

  meta.universe?.forEach((asset, index) => {
    if (asset.name && assetContexts[index]) {
      contextsByCoin.set(asset.name, assetContexts[index]);
    }
  });

  return contextsByCoin;
}

function getPositionMarkPrice(
  position: NonNullable<hyperliquid_position["position"]>,
  assetContext: hyperliquid_asset_context | undefined,
) {
  const contextMarkPrice = parseNumber(assetContext?.markPx);
  const size = parseNumber(position.szi);
  const positionValue = parseNumber(position.positionValue);

  if (contextMarkPrice !== null) {
    return contextMarkPrice;
  }

  if (positionValue !== null && size !== null && size !== 0) {
    return Math.abs(positionValue / size);
  }

  return 0;
}

function getFundingBpsUserPerspective(
  side: "long" | "short",
  assetContext: hyperliquid_asset_context | undefined,
) {
  const fundingRate = parseNumber(assetContext?.funding) ?? 0;
  const fundingBps = fundingRate * 10_000;

  return side === "long" ? fundingBps : -fundingBps;
}

function getOpenInterestUsd(
  assetContext: hyperliquid_asset_context | undefined,
  markPriceUsd: number,
) {
  const openInterestBase = parseNumber(assetContext?.openInterest);

  if (openInterestBase === null) {
    return undefined;
  }

  return Math.round(openInterestBase * markPriceUsd * 100) / 100;
}

function getFreshness(dataTimeMs: number, nowMs: number) {
  if (nowMs - dataTimeMs > STALE_AFTER_MS) {
    return {
      freshness: "stale" as const,
      stale_reason: "Hyperliquid response timestamp is older than five minutes.",
    };
  }

  return {
    freshness: "live" as const,
  };
}

export function mapHyperliquidSnapshot(input: {
  account: string;
  clearinghouseState: hyperliquid_clearinghouse_state;
  metaAndAssetContexts: hyperliquid_meta_and_asset_contexts;
  now: Date;
}): normalized_account_snapshot {
  const dataTimeMs = input.clearinghouseState.time ?? input.now.getTime();
  const contextsByCoin = getAssetContextsByCoin(input.metaAndAssetContexts);
  const positions = (input.clearinghouseState.assetPositions ?? [])
    .map((assetPosition) => assetPosition.position)
    .filter((position): position is NonNullable<typeof position> => {
      const size = parseNumber(position?.szi);

      return Boolean(position?.coin && size !== null && size !== 0);
    })
    .map((position) => {
      const size = parseNumber(position.szi) ?? 0;
      const side: "long" | "short" = size >= 0 ? "long" : "short";
      const assetContext = position.coin
        ? contextsByCoin.get(position.coin)
        : undefined;
      const markPriceUsd = getPositionMarkPrice(position, assetContext);

      return {
        market: `${position.coin}-PERP`,
        side,
        size: Math.abs(size),
        entry_price_usd: parseNumber(position.entryPx) ?? markPriceUsd,
        mark_price_usd: markPriceUsd,
        liquidation_price_usd: parseNumber(position.liquidationPx),
        funding_8h_bps_user_perspective: getFundingBpsUserPerspective(
          side,
          assetContext,
        ),
        open_interest_usd: getOpenInterestUsd(assetContext, markPriceUsd),
      };
    });
  const freshness = getFreshness(dataTimeMs, input.now.getTime());
  const snapshotInput: account_snapshot_input = {
    account: input.account,
    protocol: "hyperliquid",
    source: "live",
    created_at_iso: input.now.toISOString(),
    data_time_iso: new Date(dataTimeMs).toISOString(),
    ...freshness,
    account_value_usd: parseNumber(
      input.clearinghouseState.marginSummary?.accountValue,
    ) ?? 0,
    margin_used_usd: parseNumber(
      input.clearinghouseState.marginSummary?.totalMarginUsed,
    ) ?? 0,
    withdrawable_usd:
      parseNumber(input.clearinghouseState.withdrawable) ?? undefined,
    positions,
  };

  return normalizeAccountSnapshot(snapshotInput);
}

async function postHyperliquidInfo<T>(
  body: Record<string, unknown>,
  fetchImpl: hyperliquid_fetch,
): Promise<T> {
  const response = await fetchImpl(HYPERLIQUID_INFO_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new HyperliquidAdapterError(
      `Hyperliquid info endpoint returned ${response.status}.`,
    );
  }

  return response.json() as Promise<T>;
}

export async function fetchHyperliquidSnapshot(input: {
  address: string;
  fetchImpl?: hyperliquid_fetch;
  now?: Date;
}) {
  if (!isHyperliquidAddress(input.address)) {
    throw new HyperliquidAdapterError("Invalid Hyperliquid address format.");
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const [clearinghouseState, metaAndAssetContexts] = await Promise.all([
    postHyperliquidInfo<hyperliquid_clearinghouse_state>(
      { type: "clearinghouseState", user: input.address },
      fetchImpl,
    ),
    postHyperliquidInfo<hyperliquid_meta_and_asset_contexts>(
      { type: "metaAndAssetCtxs" },
      fetchImpl,
    ),
  ]);

  return mapHyperliquidSnapshot({
    account: input.address,
    clearinghouseState,
    metaAndAssetContexts,
    now: input.now ?? new Date(),
  });
}
