import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchHyperliquidPortfolioHistory,
  fetchHyperliquidSnapshot,
  isHyperliquidAddress,
  mapHyperliquidPortfolioHistory,
  mapHyperliquidSnapshot,
  type hyperliquid_fetch,
  type hyperliquid_meta_and_asset_contexts,
  type hyperliquid_portfolio_response,
} from "./adapter.ts";

const exampleAddress = "0x0000000000000000000000000000000000000001";

const clearinghouseFixture = {
  assetPositions: [
    {
      type: "oneWay",
      position: {
        coin: "ETH",
        entryPx: "3000",
        liquidationPx: "2100",
        positionValue: "16000",
        szi: "5",
        unrealizedPnl: "1000",
      },
    },
    {
      type: "oneWay",
      position: {
        coin: "BTC",
        entryPx: "65000",
        liquidationPx: "72500",
        positionValue: "56000",
        szi: "-0.8",
        unrealizedPnl: "-4000",
      },
    },
  ],
  marginSummary: {
    accountValue: "75000",
    totalMarginUsed: "25000",
  },
  time: Date.parse("2026-06-24T12:00:00.000Z"),
  withdrawable: "50000",
};

const metaAndAssetContextsFixture: hyperliquid_meta_and_asset_contexts = [
  {
    universe: [
      { name: "ETH" },
      { name: "BTC" },
    ],
  },
  [
    {
      funding: "0.00025",
      markPx: "3200",
      openInterest: "100",
    },
    {
      funding: "0.00012",
      markPx: "70000",
      openInterest: "8",
    },
  ],
];

const portfolioFixture: hyperliquid_portfolio_response = [
  [
    "perpWeek",
    {
      accountValueHistory: [
        [Date.parse("2026-06-24T12:00:00.000Z"), "1000"],
        [Date.parse("2026-06-24T13:00:00.000Z"), "1200"],
        [Date.parse("2026-06-24T14:00:00.000Z"), "900"],
        [Date.parse("2026-06-24T15:00:00.000Z"), "1100"],
      ],
      pnlHistory: [
        [Date.parse("2026-06-24T12:00:00.000Z"), "0"],
        [Date.parse("2026-06-24T15:00:00.000Z"), "100"],
      ],
      vlm: "25000.5",
    },
  ],
];

test("validates Hyperliquid address shape", () => {
  assert.equal(isHyperliquidAddress(exampleAddress), true);
  assert.equal(isHyperliquidAddress("0x123"), false);
});

test("maps clearinghouse and asset context fixtures into normalized snapshot", () => {
  const snapshot = mapHyperliquidSnapshot({
    account: exampleAddress,
    clearinghouseState: clearinghouseFixture,
    metaAndAssetContexts: metaAndAssetContextsFixture,
    now: new Date("2026-06-24T12:02:00.000Z"),
  });

  assert.equal(snapshot.protocol, "hyperliquid");
  assert.equal(snapshot.source, "live");
  assert.equal(snapshot.freshness, "live");
  assert.equal(snapshot.account_value_usd, 75_000);
  assert.equal(snapshot.margin_used_usd, 25_000);
  assert.equal(snapshot.positions.length, 2);
  assert.equal(snapshot.positions[0].market, "ETH-PERP");
  assert.equal(snapshot.positions[0].side, "long");
  assert.equal(snapshot.positions[0].notional_usd, 16_000);
  assert.equal(snapshot.positions[0].funding_8h_bps_user_perspective, 2.5);
  assert.equal(snapshot.positions[1].side, "short");
  assert.equal(snapshot.positions[1].funding_8h_bps_user_perspective, -1.2);
  assert.equal(snapshot.aggregate.total_notional_usd, 72_000);
});

test("marks live responses stale when Hyperliquid timestamp is old", () => {
  const snapshot = mapHyperliquidSnapshot({
    account: exampleAddress,
    clearinghouseState: clearinghouseFixture,
    metaAndAssetContexts: metaAndAssetContextsFixture,
    now: new Date("2026-06-24T12:10:01.000Z"),
  });

  assert.equal(snapshot.freshness, "stale");
  assert.equal(
    snapshot.stale_reason,
    "Hyperliquid response timestamp is older than five minutes.",
  );
});

test("fetches only read-only Hyperliquid info endpoint bodies", async () => {
  const requests: unknown[] = [];
  const mockFetch: hyperliquid_fetch = async (_url, init) => {
    const body = JSON.parse(String(init.body));
    requests.push(body);

    if (body.type === "clearinghouseState") {
      return Response.json(clearinghouseFixture);
    }

    if (body.type === "metaAndAssetCtxs") {
      return Response.json(metaAndAssetContextsFixture);
    }

    return new Response("unexpected request", { status: 500 });
  };

  const snapshot = await fetchHyperliquidSnapshot({
    address: exampleAddress,
    fetchImpl: mockFetch,
    now: new Date("2026-06-24T12:02:00.000Z"),
  });

  assert.deepEqual(requests, [
    { type: "clearinghouseState", user: exampleAddress },
    { type: "metaAndAssetCtxs" },
  ]);
  assert.equal(snapshot.account, exampleAddress);
});

test("maps portfolio response into account value timeline", () => {
  const timelines = mapHyperliquidPortfolioHistory(portfolioFixture);
  const timeline = timelines[0];

  assert.equal(timeline.window_id, "perpWeek");
  assert.equal(timeline.point_count, 4);
  assert.equal(timeline.label, "drawdown_watch");
  assert.equal(timeline.peak_account_value_usd, 1_200);
  assert.equal(timeline.max_drawdown_percent, 25);
  assert.equal(timeline.current_drawdown_percent, 8.33);
  assert.equal(timeline.account_value_change_usd, 100);
  assert.equal(timeline.account_value_change_percent, 10);
  assert.equal(timeline.volume_usd, 25_000.5);
  assert.equal(timeline.points.at(-1)?.pnl_usd, 100);
});

test("fetches Hyperliquid portfolio with only the read-only info endpoint", async () => {
  const requests: unknown[] = [];
  const mockFetch: hyperliquid_fetch = async (_url, init) => {
    const body = JSON.parse(String(init.body));
    requests.push(body);

    if (body.type === "portfolio") {
      return Response.json(portfolioFixture);
    }

    return new Response("unexpected request", { status: 500 });
  };

  const timelines = await fetchHyperliquidPortfolioHistory({
    address: exampleAddress,
    fetchImpl: mockFetch,
  });

  assert.deepEqual(requests, [{ type: "portfolio", user: exampleAddress }]);
  assert.equal(timelines[0].window_id, "perpWeek");
});
