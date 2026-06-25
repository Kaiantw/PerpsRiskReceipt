import assert from "node:assert/strict";
import test from "node:test";

import { loadFixtureAccount } from "../perps/fixtures.ts";
import {
  answerRiskQuestion,
  getRiskAssistantSuggestions,
} from "./risk-assistant.ts";

test("summarizes the loaded snapshot with cited fields", () => {
  const snapshot = loadFixtureAccount("demo-safe-eth-long");
  const response = answerRiskQuestion({
    snapshot,
    question: "summarize this account",
  });

  assert.match(response.answer, /low risk with score 20/);
  assert.match(response.answer, /Account value is \$50,000\.00/);
  assert.ok(response.citations.includes("snapshot.aggregate.risk_score"));
});

test("answers liquidation questions without treating closest as close-trade advice", () => {
  const snapshot = loadFixtureAccount("demo-near-liquidation-btc-short");
  const response = answerRiskQuestion({
    snapshot,
    question: "What is closest to liquidation?",
  });

  assert.match(response.answer, /BTC-PERP is closest/);
  assert.match(response.answer, /above mark/);
  assert.ok(
    response.citations.includes("snapshot.positions[].liquidation_price_usd"),
  );
});

test("explains funding direction and 30-day estimate", () => {
  const snapshot = loadFixtureAccount("demo-mixed-book");
  const response = answerRiskQuestion({
    snapshot,
    question: "What does funding cost or earn?",
  });

  assert.match(response.answer, /estimated daily funding earned/);
  assert.match(response.answer, /over 30 days/);
  assert.match(response.answer, /BTC-PERP/);
  assert.match(response.answer, /SOL-PERP/);
});

test("refuses trade recommendations while still explaining current signals", () => {
  const snapshot = loadFixtureAccount("demo-near-liquidation-btc-short");
  const response = answerRiskQuestion({
    snapshot,
    question: "Should I close this short?",
  });

  assert.match(response.answer, /cannot recommend trades/);
  assert.match(response.answer, /risk score/);
  assert.doesNotMatch(response.answer.toLowerCase(), /you should/);
});

test("removes liquidation suggestion when no open positions exist", () => {
  const snapshot = {
    ...loadFixtureAccount("demo-safe-eth-long"),
    positions: [],
  };
  const suggestions = getRiskAssistantSuggestions(snapshot);

  assert.equal(
    suggestions.some((suggestion) => suggestion.id === "liquidation"),
    false,
  );
});
