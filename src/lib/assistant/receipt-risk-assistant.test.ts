import assert from "node:assert/strict";
import test from "node:test";

import { buildAccountValueTimeline } from "../history/account-value-timeline.ts";
import { buildReceiptAccountValueContext } from "../history/receipt-account-value-context.ts";
import { buildMarketContext } from "../market/market-context.ts";
import { loadFixtureAccount } from "../perps/fixtures.ts";
import type { normalized_account_snapshot } from "../perps/types.ts";
import { createRiskReceipt } from "../receipts/receipt.ts";
import { buildReceiptChangeSummary } from "../receipts/receipt-change-summary.ts";
import { compareReceiptRiskDrivers } from "../receipts/receipt-risk-driver-comparison.ts";
import { compareSnapshots } from "../receipts/snapshot-comparison.ts";
import {
  answerReceiptRiskQuestion,
  getReceiptRiskAssistantSuggestions,
  type receipt_risk_assistant_context,
} from "./receipt-risk-assistant.ts";

async function buildAssistantContext(input?: {
  receiptSnapshot?: normalized_account_snapshot;
  currentSnapshot?: normalized_account_snapshot;
  includeAccountHistory?: boolean;
  hashVerified?: boolean;
}): Promise<receipt_risk_assistant_context> {
  const receiptSnapshot =
    input?.receiptSnapshot ?? loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = input?.currentSnapshot ?? receiptSnapshot;
  const comparison = compareSnapshots({ receiptSnapshot, currentSnapshot });
  const marketContext = buildMarketContext(comparison);
  const accountValueContext = input?.includeAccountHistory
    ? buildReceiptAccountValueContext({
        receipt_data_time_iso: receiptSnapshot.data_time_iso,
        receipt_account_value_usd: receiptSnapshot.account_value_usd,
        timelines: [
          buildAccountValueTimeline({
            window_id: "perpWeek",
            points: [
              {
                time_ms: Date.parse(receiptSnapshot.data_time_iso),
                account_value_usd: receiptSnapshot.account_value_usd,
              },
              {
                time_ms: Date.parse(receiptSnapshot.data_time_iso) + 60_000,
                account_value_usd: receiptSnapshot.account_value_usd * 1.03,
              },
            ],
          }),
        ],
      })
    : null;

  return {
    receipt: await createRiskReceipt(receiptSnapshot),
    comparison,
    marketContext,
    accountValueContext,
    hashVerified: input?.hashVerified ?? true,
    riskDriverComparison: compareReceiptRiskDrivers({
      savedSnapshot: receiptSnapshot,
      currentSnapshot,
    }),
    changeSummary: buildReceiptChangeSummary({
      comparison,
      marketContext,
      accountValueContext,
    }),
  };
}

test("summarizes receipt recheck with receipt-specific citations", async () => {
  const context = await buildAssistantContext();
  const response = answerReceiptRiskQuestion({
    context,
    question: "summarize this receipt",
  });

  assert.match(response.answer, /receipt/i);
  assert.match(response.answer, /live recheck/i);
  assert.ok(response.citations.includes("receipt_change_summary.headline"));
  assert.ok(response.citations.includes("receipt.snapshot_hash"));
});

test("refuses trade recommendations while explaining receipt signals", async () => {
  const context = await buildAssistantContext();
  const response = answerReceiptRiskQuestion({
    context,
    question: "Should I increase leverage?",
  });

  assert.match(response.answer, /cannot recommend trades/i);
  assert.match(response.answer, /Saved risk score/i);
  assert.ok(response.citations.includes("market_context.headline"));
});

test("answers review questions without treating them as trade advice", async () => {
  const context = await buildAssistantContext();
  const response = answerReceiptRiskQuestion({
    context,
    question: "What should I review in this receipt?",
  });

  assert.match(response.answer, /Review this receipt as/);
  assert.match(response.answer, /Risk-driver read:/);
  assert.doesNotMatch(response.answer, /cannot recommend trades/i);
  assert.ok(response.citations.includes("receipt_change_summary.review_points"));
  assert.ok(
    response.citations.includes("receipt_risk_driver_comparison.headline"),
  );
});

test("does not confuse market review words with trade intent", async () => {
  const context = await buildAssistantContext();
  const openInterestResponse = answerReceiptRiskQuestion({
    context,
    question: "What changed in open interest?",
  });
  const liquidationResponse = answerReceiptRiskQuestion({
    context,
    question: "Is anything close to liquidation?",
  });

  assert.match(openInterestResponse.answer, /descriptive market context/i);
  assert.match(liquidationResponse.answer, /liquidation/i);
  assert.doesNotMatch(openInterestResponse.answer, /cannot recommend trades/i);
  assert.doesNotMatch(liquidationResponse.answer, /cannot recommend trades/i);
});

test("explains hash verification scope", async () => {
  const context = await buildAssistantContext({ hashVerified: true });
  const response = answerReceiptRiskQuestion({
    context,
    question: "What does the snapshot hash prove?",
  });

  assert.match(response.answer, /Hash verification is passing/);
  assert.match(response.answer, /does not prove Hyperliquid's external data/);
  assert.ok(response.citations.includes("receipt_verification.matches"));
});

test("answers account history questions only from loaded context", async () => {
  const context = await buildAssistantContext({ includeAccountHistory: true });
  const response = answerReceiptRiskQuestion({
    context,
    question: "How does account value history change this?",
  });

  assert.match(response.answer, /Latest sampled account value/);
  assert.match(response.answer, /sampled context/);
  assert.ok(
    response.citations.includes(
      "receipt_account_value_context.latest_vs_receipt_percent",
    ),
  );
});

test("explains when account history is not loaded", async () => {
  const context = await buildAssistantContext();
  const response = answerReceiptRiskQuestion({
    context,
    question: "What does the portfolio sample say?",
  });

  assert.match(response.answer, /has not loaded/);
  assert.deepEqual(response.citations, ["receipt_account_value_context"]);
});

test("surfaces funding deltas from receipt and live recheck", async () => {
  const receiptSnapshot = loadFixtureAccount("demo-safe-eth-long");
  const currentSnapshot = {
    ...receiptSnapshot,
    positions: receiptSnapshot.positions.map((position) => ({
      ...position,
      funding_8h_bps_user_perspective:
        position.funding_8h_bps_user_perspective + 3,
    })),
  } satisfies normalized_account_snapshot;
  const context = await buildAssistantContext({ receiptSnapshot, currentSnapshot });
  const response = answerReceiptRiskQuestion({
    context,
    question: "What changed around funding carry?",
  });

  assert.match(response.answer, /Receipt daily funding/);
  assert.match(response.answer, /Market-context total daily funding delta/);
  assert.ok(
    response.citations.includes(
      "market_context.total_daily_funding_delta_usd",
    ),
  );
});

test("answers risk-driver questions from the receipt driver comparison", async () => {
  const context = await buildAssistantContext();
  const response = answerReceiptRiskQuestion({
    context,
    question: "Which risk drivers changed since the receipt?",
  });

  assert.match(response.answer, /Saved top driver/);
  assert.match(response.answer, /Current top driver/);
  assert.match(response.answer, /Top score delta/);
  assert.match(response.answer, /heuristic driver attribution/i);
  assert.ok(
    response.citations.includes(
      "receipt_risk_driver_comparison.top_driver_score_delta",
    ),
  );
  assert.ok(
    response.citations.includes("receipt_risk_driver_comparison.review_points"),
  );
});

test("suggestions include account history only when context exists", async () => {
  const withoutHistory = getReceiptRiskAssistantSuggestions(
    await buildAssistantContext(),
  );
  const withHistory = getReceiptRiskAssistantSuggestions(
    await buildAssistantContext({ includeAccountHistory: true }),
  );

  assert.equal(
    withoutHistory.some((suggestion) => suggestion.id === "drivers"),
    true,
  );
  assert.equal(
    withoutHistory.some((suggestion) => suggestion.id === "history"),
    false,
  );
  assert.equal(
    withHistory.some((suggestion) => suggestion.id === "history"),
    true,
  );
});
