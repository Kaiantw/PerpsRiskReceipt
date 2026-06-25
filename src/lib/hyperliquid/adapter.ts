import { normalizeAccountSnapshot } from "../risk/risk-engine.ts";
import { buildAccountValueTimeline } from "../history/account-value-timeline.ts";
import type {
  account_value_history_point,
  account_value_timeline,
} from "../history/account-value-timeline.ts";
import type {
  account_snapshot_input,
  normalized_account_snapshot,
} from "../perps/types.ts";

export const HYPERLIQUID_INFO_ENDPOINT = "https://api.hyperliquid.xyz/info";
const STALE_AFTER_MS = 5 * 60 * 1000;

type hyperliquid_asset_context = {
  dayBaseVlm?: string | null;
  dayNtlVlm?: string | null;
  funding?: string | null;
  markPx?: string | null;
  midPx?: string | null;
  openInterest?: string | null;
  oraclePx?: string | null;
  premium?: string | null;
  prevDayPx?: string | null;
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

export type hyperliquid_market_context = {
  market: string;
  coin: string;
  found: boolean;
  mark_price_usd: number | null;
  mid_price_usd: number | null;
  oracle_price_usd: number | null;
  previous_day_price_usd: number | null;
  funding_8h_bps: number | null;
  premium_bps: number | null;
  open_interest_base: number | null;
  open_interest_usd: number | null;
  day_base_volume: number | null;
  day_notional_volume_usd: number | null;
};

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

type hyperliquid_portfolio_history_point = [number, string];

type hyperliquid_portfolio_window = [
  string,
  {
    accountValueHistory?: hyperliquid_portfolio_history_point[];
    pnlHistory?: hyperliquid_portfolio_history_point[];
    vlm?: string | null;
  },
];

export type hyperliquid_portfolio_response = hyperliquid_portfolio_window[];

type hyperliquid_candle_snapshot = {
  T?: number;
  c?: string | null;
  h?: string | null;
  i?: string | null;
  l?: string | null;
  n?: number | null;
  o?: string | null;
  s?: string | null;
  t?: number;
  v?: string | null;
};

type hyperliquid_funding_history_item = {
  coin?: string;
  fundingRate?: string | null;
  premium?: string | null;
  time?: number;
};

export type hyperliquid_market_candle = {
  open_time_ms: number;
  close_time_ms: number;
  market: string;
  interval: string;
  open_price_usd: number;
  high_price_usd: number;
  low_price_usd: number;
  close_price_usd: number;
  volume_base: number;
  trade_count: number | null;
};

export type hyperliquid_market_funding_point = {
  time_ms: number;
  market: string;
  funding_8h_bps: number;
  premium_bps: number | null;
};

export type hyperliquid_market_history = {
  market: string;
  coin: string;
  interval: string;
  start_time_ms: number;
  end_time_ms: number;
  candles: hyperliquid_market_candle[];
  funding: hyperliquid_market_funding_point[];
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

function parseHistoryPoint(
  point: hyperliquid_portfolio_history_point,
): { time_ms: number; value: number } | null {
  const [timeMs, value] = point;
  const parsedValue = parseNumber(value);

  if (!Number.isFinite(timeMs) || parsedValue === null) {
    return null;
  }

  return {
    time_ms: timeMs,
    value: parsedValue,
  };
}

function mapPortfolioPoints(
  accountValueHistory: hyperliquid_portfolio_history_point[] | undefined,
  pnlHistory: hyperliquid_portfolio_history_point[] | undefined,
): account_value_history_point[] {
  const pnlByTime = new Map<number, number>();

  pnlHistory?.forEach((point) => {
    const parsedPoint = parseHistoryPoint(point);

    if (parsedPoint) {
      pnlByTime.set(parsedPoint.time_ms, parsedPoint.value);
    }
  });

  const mappedPoints: Array<account_value_history_point | null> = (
    accountValueHistory ?? []
  ).map((point) => {
    const parsedPoint = parseHistoryPoint(point);

    if (!parsedPoint) {
      return null;
    }

    return {
      time_ms: parsedPoint.time_ms,
      account_value_usd: parsedPoint.value,
      pnl_usd: pnlByTime.get(parsedPoint.time_ms) ?? null,
    };
  });

  return mappedPoints.filter(
    (point): point is account_value_history_point => point !== null,
  );
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

function getMarketCoin(market: string) {
  return market.endsWith("-PERP") ? market.slice(0, -"-PERP".length) : market;
}

function roundNullable(value: number | null, decimals = 2) {
  if (value === null) {
    return null;
  }

  const multiplier = 10 ** decimals;

  return Math.round(value * multiplier) / multiplier;
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

export function mapHyperliquidPortfolioHistory(
  response: hyperliquid_portfolio_response,
): account_value_timeline[] {
  return response.map(([windowId, payload]) =>
    buildAccountValueTimeline({
      window_id: windowId,
      points: mapPortfolioPoints(
        payload.accountValueHistory,
        payload.pnlHistory,
      ),
      volume_usd: parseNumber(payload.vlm),
    }),
  );
}

export function mapHyperliquidMarketContexts(input: {
  markets: string[];
  metaAndAssetContexts: hyperliquid_meta_and_asset_contexts;
}): hyperliquid_market_context[] {
  const contextsByCoin = getAssetContextsByCoin(input.metaAndAssetContexts);

  return input.markets.map((market) => {
    const coin = getMarketCoin(market);
    const assetContext = contextsByCoin.get(coin);
    const markPriceUsd = parseNumber(assetContext?.markPx);
    const openInterestBase = parseNumber(assetContext?.openInterest);
    const openInterestUsd =
      openInterestBase === null || markPriceUsd === null
        ? null
        : roundNullable(openInterestBase * markPriceUsd);
    const fundingRate = parseNumber(assetContext?.funding);
    const premium = parseNumber(assetContext?.premium);

    return {
      market,
      coin,
      found: assetContext !== undefined,
      mark_price_usd: markPriceUsd,
      mid_price_usd: parseNumber(assetContext?.midPx),
      oracle_price_usd: parseNumber(assetContext?.oraclePx),
      previous_day_price_usd: parseNumber(assetContext?.prevDayPx),
      funding_8h_bps:
        fundingRate === null ? null : roundNullable(fundingRate * 10_000, 4),
      premium_bps:
        premium === null ? null : roundNullable(premium * 10_000, 4),
      open_interest_base: openInterestBase,
      open_interest_usd: openInterestUsd,
      day_base_volume: parseNumber(assetContext?.dayBaseVlm),
      day_notional_volume_usd: parseNumber(assetContext?.dayNtlVlm),
    };
  });
}

function mapCandleSnapshot(input: {
  market: string;
  candles: hyperliquid_candle_snapshot[];
}): hyperliquid_market_candle[] {
  const mappedCandles = input.candles.map((candle) => {
    const openPriceUsd = parseNumber(candle.o);
    const highPriceUsd = parseNumber(candle.h);
    const lowPriceUsd = parseNumber(candle.l);
    const closePriceUsd = parseNumber(candle.c);
    const volumeBase = parseNumber(candle.v);

    if (
      candle.t === undefined ||
      candle.T === undefined ||
      !Number.isFinite(candle.t) ||
      !Number.isFinite(candle.T) ||
      openPriceUsd === null ||
      highPriceUsd === null ||
      lowPriceUsd === null ||
      closePriceUsd === null ||
      volumeBase === null
    ) {
      return null;
    }

    return {
      open_time_ms: candle.t,
      close_time_ms: candle.T,
      market: input.market,
      interval: candle.i ?? "unknown",
      open_price_usd: openPriceUsd,
      high_price_usd: highPriceUsd,
      low_price_usd: lowPriceUsd,
      close_price_usd: closePriceUsd,
      volume_base: volumeBase,
      trade_count:
        candle.n === null || candle.n === undefined || !Number.isFinite(candle.n)
          ? null
          : candle.n,
    };
  });

  return mappedCandles
    .filter((candle): candle is hyperliquid_market_candle => candle !== null)
    .sort((left, right) => left.open_time_ms - right.open_time_ms);
}

function mapFundingHistory(input: {
  market: string;
  fundingHistory: hyperliquid_funding_history_item[];
}): hyperliquid_market_funding_point[] {
  const mappedFunding = input.fundingHistory.map((fundingPoint) => {
    const fundingRate = parseNumber(fundingPoint.fundingRate);
    const premium = parseNumber(fundingPoint.premium);

    if (
      fundingPoint.time === undefined ||
      !Number.isFinite(fundingPoint.time) ||
      fundingRate === null
    ) {
      return null;
    }

    return {
      time_ms: fundingPoint.time,
      market: input.market,
      funding_8h_bps: roundNullable(fundingRate * 10_000, 4) ?? 0,
      premium_bps: premium === null ? null : roundNullable(premium * 10_000, 4),
    };
  });

  return mappedFunding
    .filter(
      (fundingPoint): fundingPoint is hyperliquid_market_funding_point =>
        fundingPoint !== null,
    )
    .sort((left, right) => left.time_ms - right.time_ms);
}

export function mapHyperliquidMarketHistory(input: {
  market: string;
  candles: hyperliquid_candle_snapshot[];
  fundingHistory: hyperliquid_funding_history_item[];
  startTimeMs: number;
  endTimeMs: number;
  interval: string;
}): hyperliquid_market_history {
  const coin = getMarketCoin(input.market);

  return {
    market: input.market,
    coin,
    interval: input.interval,
    start_time_ms: input.startTimeMs,
    end_time_ms: input.endTimeMs,
    candles: mapCandleSnapshot({
      market: input.market,
      candles: input.candles,
    }),
    funding: mapFundingHistory({
      market: input.market,
      fundingHistory: input.fundingHistory,
    }),
  };
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

export async function fetchHyperliquidPortfolioHistory(input: {
  address: string;
  fetchImpl?: hyperliquid_fetch;
}) {
  if (!isHyperliquidAddress(input.address)) {
    throw new HyperliquidAdapterError("Invalid Hyperliquid address format.");
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const portfolioResponse =
    await postHyperliquidInfo<hyperliquid_portfolio_response>(
      { type: "portfolio", user: input.address },
      fetchImpl,
    );

  return mapHyperliquidPortfolioHistory(portfolioResponse);
}

export async function fetchHyperliquidMarketContexts(input: {
  markets: string[];
  fetchImpl?: hyperliquid_fetch;
}) {
  const fetchImpl = input.fetchImpl ?? fetch;
  const metaAndAssetContexts =
    await postHyperliquidInfo<hyperliquid_meta_and_asset_contexts>(
      { type: "metaAndAssetCtxs" },
      fetchImpl,
    );

  return mapHyperliquidMarketContexts({
    markets: input.markets,
    metaAndAssetContexts,
  });
}

export async function fetchHyperliquidMarketHistory(input: {
  markets: string[];
  startTimeMs: number;
  endTimeMs: number;
  interval?: string;
  fetchImpl?: hyperliquid_fetch;
}) {
  const fetchImpl = input.fetchImpl ?? fetch;
  const interval = input.interval ?? "1h";

  return Promise.all(
    input.markets.map(async (market) => {
      const coin = getMarketCoin(market);
      const [candles, fundingHistory] = await Promise.all([
        postHyperliquidInfo<hyperliquid_candle_snapshot[]>(
          {
            type: "candleSnapshot",
            req: {
              coin,
              interval,
              startTime: input.startTimeMs,
              endTime: input.endTimeMs,
            },
          },
          fetchImpl,
        ),
        postHyperliquidInfo<hyperliquid_funding_history_item[]>(
          {
            type: "fundingHistory",
            coin,
            startTime: input.startTimeMs,
            endTime: input.endTimeMs,
          },
          fetchImpl,
        ),
      ]);

      return mapHyperliquidMarketHistory({
        market,
        candles,
        fundingHistory,
        startTimeMs: input.startTimeMs,
        endTimeMs: input.endTimeMs,
        interval,
      });
    }),
  );
}
