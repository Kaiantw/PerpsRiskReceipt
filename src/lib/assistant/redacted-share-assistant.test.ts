import assert from "node:assert/strict";
import test from "node:test";

import type { redacted_market_context } from "../market/redacted-market-context.ts";
import type { redacted_market_trend } from "../market/redacted-market-trend.ts";
import { buildRedactedFreshnessVerdict } from "../market/redacted-freshness-verdict.ts";
import { buildRedactedMarketWatchlist } from "../market/redacted-market-watchlist.ts";
import type { redacted_receipt_bundle } from "../receipts/portable-receipt-bundle.ts";
import {
  answerRedactedShareQuestion,
  getRedactedShareAssistantSuggestions,
  type redacted_share_assistant_context,
} from "./redacted-share-assistant.ts";

const redactedBundle: redacted_receipt_bundle = {
  kind: "perps-risk-receipt.redacted.v1",
  version: 1,
  privacy_level: "redacted_summary",
  exported_at_iso: "2026-06-26T12:00:00.000Z",
  receipt_id: "rr_redacted_assistant",
  snapshot_hash:
    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  created_at_iso: "2026-06-26T11:59:00.000Z",
  data_time_iso: "2026-06-26T11:55:00.000Z",
  protocol: "hyperliquid",
  source: "live",
  freshness: "live",
  aggregate: {
    risk_score: 72,
    risk_label: "high",
    margin_usage_bps: 4_800,
    min_liquidation_distance_bps: 800,
    account_value_bucket_usd: "$50k-$100k",
    total_notional_bucket_usd: "$100k-$250k",
    daily_funding_bucket_usd: "cost $0-$1k",
    thirty_day_funding_bucket_usd: "cost $10k-$50k",
    position_count: 2,
  },
  markets: [
    {
      market: "ETH-PERP",
      side: "long",
      notional_bucket_usd: "$10k-$50k",
      liquidation_distance_bps: 800,
      funding_8h_bps_user_perspective: 1.2,
      open_interest_bucket_usd: "$250k-$1m",
    },
    {
      market: "BTC-PERP",
      side: "short",
      notional_bucket_usd: "$50k-$100k",
      liquidation_distance_bps: 1_500,
      funding_8h_bps_user_perspective: -0.5,
    },
  ],
  redacted_fields: [
    "account",
    "position sizes",
    "entry prices",
    "mark prices",
    "liquidation prices",
    "unrealized pnl",
  ],
  verification_scope:
    "snapshot_hash_reference_only_full_snapshot_required_to_recompute",
};

const marketContext: redacted_market_context = {
  label: "funding_more_expensive",
  headline: "Current funding is more expensive for at least one disclosed side.",
  summary: "Public current context only.",
  fetched_at_iso: "2026-06-26T12:01:00.000Z",
  matched_market_count: 2,
  rows: [
    {
      market: "ETH-PERP",
      side: "long",
      notional_bucket_usd: "$10k-$50k",
      receipt_liquidation_distance_bps: 800,
      receipt_funding_8h_bps_user_perspective: 1.2,
      current_mark_price_usd: 2_900,
      current_oracle_price_usd: 2_895,
      current_funding_8h_bps_user_perspective: 2.7,
      funding_delta_bps_user_perspective: 1.5,
      current_open_interest_usd: 360_000,
      current_day_notional_volume_usd: 36_000_000,
      found_current_market: true,
      summary: "Current funding is more expensive for the disclosed side.",
    },
    {
      market: "BTC-PERP",
      side: "short",
      notional_bucket_usd: "$50k-$100k",
      receipt_liquidation_distance_bps: 1_500,
      receipt_funding_8h_bps_user_perspective: -0.5,
      current_mark_price_usd: 70_000,
      current_oracle_price_usd: 69_980,
      current_funding_8h_bps_user_perspective: -0.4,
      funding_delta_bps_user_perspective: 0.1,
      current_open_interest_usd: 700_000,
      current_day_notional_volume_usd: 35_000_000,
      found_current_market: true,
      summary: "Current funding is close to the redacted receipt.",
    },
  ],
};

const marketTrend: redacted_market_trend = {
  label: "adverse_price_trend",
  headline: "At least one disclosed side has an adverse 24h price trend.",
  summary: "Public trend context only.",
  fetched_at_iso: "2026-06-26T12:02:00.000Z",
  window_hours: 24,
  interval: "1h",
  matched_market_count: 2,
  rows: [
    {
      market: "ETH-PERP",
      side: "long",
      receipt_liquidation_distance_bps: 800,
      receipt_funding_8h_bps_user_perspective: 1.2,
      candle_count: 2,
      funding_point_count: 2,
      first_close_price_usd: 3_000,
      latest_close_price_usd: 2_900,
      high_price_usd: 3_040,
      low_price_usd: 2_880,
      price_change_percent: -3.33,
      high_low_range_percent: 5.52,
      latest_funding_8h_bps_user_perspective: 2.2,
      average_funding_8h_bps_user_perspective: 2,
      average_funding_delta_from_receipt_bps: 0.8,
      close_prices_usd: [3_000, 2_900],
      has_history: true,
      summary: "The move is adverse for the disclosed long side.",
    },
    {
      market: "BTC-PERP",
      side: "short",
      receipt_liquidation_distance_bps: 1_500,
      receipt_funding_8h_bps_user_perspective: -0.5,
      candle_count: 2,
      funding_point_count: 1,
      first_close_price_usd: 70_000,
      latest_close_price_usd: 70_500,
      high_price_usd: 71_000,
      low_price_usd: 69_500,
      price_change_percent: 0.71,
      high_low_range_percent: 2.13,
      latest_funding_8h_bps_user_perspective: -0.4,
      average_funding_8h_bps_user_perspective: -0.4,
      average_funding_delta_from_receipt_bps: 0.1,
      close_prices_usd: [70_000, 70_500],
      has_history: true,
      summary: "Public 24h history is loaded.",
    },
  ],
};

function buildAssistantContext(input?: {
  includeMarketContext?: boolean;
  includeMarketTrend?: boolean;
}): redacted_share_assistant_context {
  const includedMarketContext =
    input?.includeMarketContext === false ? undefined : marketContext;
  const includedMarketTrend =
    input?.includeMarketTrend === false ? undefined : marketTrend;
  const watchlist = buildRedactedMarketWatchlist({
    bundle: redactedBundle,
    marketContext: includedMarketContext,
    marketTrend: includedMarketTrend,
  });

  return {
    bundle: redactedBundle,
    marketContext: includedMarketContext,
    marketTrend: includedMarketTrend,
    watchlist,
    freshnessVerdict: buildRedactedFreshnessVerdict({
      bundle: redactedBundle,
      marketContext: includedMarketContext,
      marketTrend: includedMarketTrend,
      watchlist,
      nowIso: "2026-06-26T12:10:00.000Z",
    }),
  };
}

test("summarizes a redacted share from disclosed fields with citations", () => {
  const response = answerRedactedShareQuestion({
    context: buildAssistantContext(),
    question: "Summarize this redacted share.",
  });

  assert.match(response.answer, /high risk with score 72/i);
  assert.match(response.answer, /account value bucket \$50k-\$100k/i);
  assert.match(response.answer, /cannot recompute hidden snapshot hashes/i);
  assert.match(response.answer, /Freshness verdict:/);
  assert.ok(
    response.citations.includes("redacted_receipt.aggregate.risk_score"),
  );
  assert.ok(response.citations.includes("redacted_market_watchlist.headline"));
  assert.ok(response.citations.includes("redacted_freshness_verdict.label"));
  assert.doesNotMatch(response.answer, /account_value_usd/);
  assert.doesNotMatch(response.answer, /mark_price_usd/);
  assert.doesNotMatch(response.answer, /liquidation_price_usd/);
});

test("answers watchlist questions with ranked public review cues", () => {
  const response = answerRedactedShareQuestion({
    context: buildAssistantContext(),
    question: "What should I inspect first in the redacted watchlist?",
  });

  assert.match(response.answer, /Counts: \d+ high/i);
  assert.match(response.answer, /ETH-PERP/);
  assert.match(response.answer, /not a trading recommendation/i);
  assert.ok(
    response.citations.some((citation) =>
      citation.startsWith("redacted_market_watchlist.items."),
    ),
  );
});

test("explains when public market context is not loaded", () => {
  const response = answerRedactedShareQuestion({
    context: buildAssistantContext({ includeMarketContext: false }),
    question: "What does current public market context say?",
  });

  assert.match(response.answer, /not loaded/i);
  assert.match(response.answer, /without sending a raw account address/i);
  assert.deepEqual(response.citations, ["redacted_market_context"]);
});

test("answers current market questions with mark, funding, and open-interest citations", () => {
  const response = answerRedactedShareQuestion({
    context: buildAssistantContext(),
    question: "What does current public market context say?",
  });

  assert.match(response.answer, /Matched 2\/2 disclosed markets/);
  assert.match(response.answer, /Current public mark is \$2,900.00/);
  assert.ok(
    response.citations.includes(
      "redacted_market_context.rows.ETH-PERP.current_mark_price_usd",
    ),
  );
  assert.ok(
    response.citations.includes(
      "redacted_market_context.rows.ETH-PERP.funding_delta_bps_user_perspective",
    ),
  );
  assert.ok(
    response.citations.includes(
      "redacted_market_context.rows.ETH-PERP.current_open_interest_usd",
    ),
  );
});

test("answers public 24h trend questions from loaded trend context", () => {
  const response = answerRedactedShareQuestion({
    context: buildAssistantContext(),
    question: "What does the public 24h trend say?",
  });

  assert.match(response.answer, /adverse 24h price trend/i);
  assert.match(response.answer, /-3.33%/);
  assert.match(response.answer, /cannot prove hidden account state/i);
  assert.ok(
    response.citations.includes(
      "redacted_market_trend.rows.ETH-PERP.price_change_percent",
    ),
  );
});

test("answers market-specific questions from disclosed and public rows", () => {
  const response = answerRedactedShareQuestion({
    context: buildAssistantContext(),
    question: "Why is ETH on the redacted watchlist?",
  });

  assert.match(response.answer, /ETH-PERP is disclosed as a long/i);
  assert.match(response.answer, /Current public mark is \$2,900.00/i);
  assert.match(response.answer, /public 24h close-to-close move is -3.33%/i);
  assert.match(response.answer, /cannot reveal exact position size/i);
  assert.ok(
    response.citations.includes(
      "redacted_market_context.rows.ETH-PERP.current_mark_price_usd",
    ),
  );
});

test("answers freshness verdict questions with cited recheck context", () => {
  const response = answerRedactedShareQuestion({
    context: buildAssistantContext(),
    question: "Is this redacted receipt still reviewable?",
  });

  assert.match(response.answer, /Verdict:/);
  assert.match(response.answer, /signal score/i);
  assert.match(response.answer, /receipt age 15m/i);
  assert.match(response.answer, /not a live account monitor/i);
  assert.ok(response.citations.includes("redacted_freshness_verdict.label"));
  assert.ok(
    response.citations.includes("redacted_market_watchlist.high_count"),
  );
});

test("refuses trade recommendations while explaining visible cues", () => {
  const response = answerRedactedShareQuestion({
    context: buildAssistantContext(),
    question: "Should I increase leverage on this?",
  });

  assert.equal(response.refused, true);
  assert.match(response.answer, /cannot recommend trades/i);
  assert.match(response.answer, /redacted risk score 72/i);
  assert.ok(
    response.citations.includes(
      "redacted_receipt.aggregate.min_liquidation_distance_bps",
    ),
  );
});

test("explains hash and privacy scope for redacted shares", () => {
  const response = answerRedactedShareQuestion({
    context: buildAssistantContext(),
    question: "What does the redacted share hide and verify?",
  });

  assert.match(response.answer, /snapshot hash reference/i);
  assert.match(response.answer, /cannot recompute the original hash/i);
  assert.match(response.answer, /full portable receipt bundle/i);
  assert.ok(response.citations.includes("redacted_receipt.verification_scope"));
});

test("suggestions include context-dependent review prompts", () => {
  const suggestions = getRedactedShareAssistantSuggestions(
    buildAssistantContext(),
  );
  const suggestionIds = suggestions.map((suggestion) => suggestion.id);

  assert.ok(suggestionIds.includes("watchlist"));
  assert.ok(suggestionIds.includes("freshness"));
  assert.ok(suggestionIds.includes("current-market"));
  assert.ok(suggestionIds.includes("trend"));
  assert.ok(suggestionIds.includes("liquidation"));
  assert.ok(suggestionIds.includes("top-watch"));
});
