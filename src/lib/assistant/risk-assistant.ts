import {
  formatIsoDate,
  formatPercentFromBps,
  formatSignedUsd,
  formatUsd,
} from "../formatters.ts";
import type { normalized_account_snapshot } from "../perps/types.ts";
import {
  calculateDailyFundingUsd,
  calculateLiquidationDistanceBps,
} from "../risk/risk-engine.ts";

export type risk_assistant_response = {
  answer: string;
  citations: string[];
};

export type risk_assistant_suggestion = {
  id: string;
  label: string;
  question: string;
};

const advicePatterns = [
  /\bshould i\b/,
  /\bwhat should\b/,
  /\b(buy|sell|open|close|increase|reduce|leverage|ape)\b/,
  /\bgo long\b/,
  /\bgo short\b/,
];

function includesAny(value: string, patterns: string[]) {
  return patterns.some((pattern) => value.includes(pattern));
}

function includesAdviceIntent(value: string) {
  return advicePatterns.some((pattern) => pattern.test(value));
}

function getClosestLiquidationPosition(snapshot: normalized_account_snapshot) {
  return snapshot.positions
    .map((position) => ({
      position,
      distance_bps: calculateLiquidationDistanceBps(position),
    }))
    .filter(
      (entry): entry is {
        position: normalized_account_snapshot["positions"][number];
        distance_bps: number;
      } => entry.distance_bps !== null,
    )
    .sort(
      (leftEntry, rightEntry) =>
        leftEntry.distance_bps - rightEntry.distance_bps,
    )[0] ?? null;
}

function getFundingDirection(snapshot: normalized_account_snapshot) {
  const dailyFundingUsd = snapshot.aggregate.daily_funding_usd;

  if (dailyFundingUsd > 0) {
    return `${formatSignedUsd(dailyFundingUsd)} estimated daily funding cost`;
  }

  if (dailyFundingUsd < 0) {
    return `${formatSignedUsd(dailyFundingUsd)} estimated daily funding earned`;
  }

  return "no estimated daily funding cost or earnings";
}

function buildSummaryAnswer(
  snapshot: normalized_account_snapshot,
): risk_assistant_response {
  const closestPosition = getClosestLiquidationPosition(snapshot);
  const liquidationCopy = closestPosition
    ? `${closestPosition.position.market} is the closest listed liquidation distance at ${formatPercentFromBps(closestPosition.distance_bps)}.`
    : "There is no listed liquidation distance on the current open positions.";

  return {
    answer: [
      `This ${snapshot.source} snapshot is ${snapshot.aggregate.risk_label} risk with score ${snapshot.aggregate.risk_score}.`,
      `Account value is ${formatUsd(snapshot.account_value_usd)}, margin usage is ${formatPercentFromBps(snapshot.aggregate.margin_usage_bps)}, and total notional is ${formatUsd(snapshot.aggregate.total_notional_usd)}.`,
      `${liquidationCopy} Funding shows ${getFundingDirection(snapshot)}.`,
      "I can explain the risk signals, but I cannot recommend trades or position changes.",
    ].join(" "),
    citations: [
      "snapshot.aggregate.risk_score",
      "snapshot.aggregate.margin_usage_bps",
      "snapshot.aggregate.total_notional_usd",
      "snapshot.aggregate.min_liquidation_distance_bps",
      "snapshot.aggregate.daily_funding_usd",
    ],
  };
}

function buildLiquidationAnswer(
  snapshot: normalized_account_snapshot,
): risk_assistant_response {
  const closestPosition = getClosestLiquidationPosition(snapshot);

  if (!closestPosition) {
    return {
      answer:
        "There are no open positions with a listed liquidation price in this snapshot. That means this app cannot compute a nearest listed liquidation distance for the current account state.",
      citations: ["snapshot.positions", "snapshot.aggregate.min_liquidation_distance_bps"],
    };
  }

  const sideCopy =
    closestPosition.position.side === "long" ? "below mark" : "above mark";

  return {
    answer: `${closestPosition.position.market} is closest to its listed liquidation price: ${formatPercentFromBps(closestPosition.distance_bps)} ${sideCopy}. This is a listed-distance check, not Hyperliquid's exact liquidation engine.`,
    citations: [
      "snapshot.positions[].liquidation_price_usd",
      "snapshot.positions[].mark_price_usd",
      "snapshot.aggregate.min_liquidation_distance_bps",
    ],
  };
}

function buildFundingAnswer(
  snapshot: normalized_account_snapshot,
): risk_assistant_response {
  if (snapshot.positions.length === 0) {
    return {
      answer:
        "This snapshot has no open positions, so there is no estimated funding cost or earned funding to summarize.",
      citations: ["snapshot.positions", "snapshot.aggregate.daily_funding_usd"],
    };
  }

  const positionFunding = snapshot.positions
    .map((position) => {
      const dailyFundingUsd = calculateDailyFundingUsd(position);
      const direction = dailyFundingUsd >= 0 ? "cost" : "earned";

      return `${position.market}: ${formatSignedUsd(dailyFundingUsd)} daily ${direction}`;
    })
    .join("; ");

  return {
    answer: `Funding shows ${getFundingDirection(snapshot)} and ${formatSignedUsd(snapshot.aggregate.thirty_day_funding_usd)} over 30 days if rates and notional stay unchanged. By position: ${positionFunding}.`,
    citations: [
      "snapshot.positions[].funding_8h_bps_user_perspective",
      "snapshot.positions[].notional_usd",
      "snapshot.aggregate.daily_funding_usd",
      "snapshot.aggregate.thirty_day_funding_usd",
    ],
  };
}

function buildFreshnessAnswer(
  snapshot: normalized_account_snapshot,
): risk_assistant_response {
  const staleCopy = snapshot.stale_reason
    ? ` Stale reason: ${snapshot.stale_reason}`
    : "";

  return {
    answer: `The data source is ${snapshot.source}, freshness is ${snapshot.freshness}, and the data timestamp is ${formatIsoDate(snapshot.data_time_iso)}.${staleCopy}`,
    citations: [
      "snapshot.source",
      "snapshot.freshness",
      "snapshot.data_time_iso",
      "snapshot.stale_reason",
    ],
  };
}

function buildScenarioAnswer(
  snapshot: normalized_account_snapshot,
): risk_assistant_response {
  return {
    answer: `The scenario table applies fixed moves to the current positions and estimates account value, PnL change, liquidation flags, and risk score after each move. It is a simple stress check, not a forecast. Current risk score starts at ${snapshot.aggregate.risk_score}.`,
    citations: [
      "scenario_result.estimated_account_value_usd",
      "scenario_result.estimated_pnl_change_usd",
      "scenario_result.positions_at_or_through_liquidation",
      "snapshot.aggregate.risk_score",
    ],
  };
}

function buildAdviceRefusal(
  snapshot: normalized_account_snapshot,
): risk_assistant_response {
  return {
    answer: `I cannot recommend trades, leverage, or position changes. I can explain the current signals: risk score ${snapshot.aggregate.risk_score} (${snapshot.aggregate.risk_label}), margin usage ${formatPercentFromBps(snapshot.aggregate.margin_usage_bps)}, minimum listed liquidation distance ${formatPercentFromBps(snapshot.aggregate.min_liquidation_distance_bps)}, and ${getFundingDirection(snapshot)}.`,
    citations: [
      "snapshot.aggregate.risk_score",
      "snapshot.aggregate.margin_usage_bps",
      "snapshot.aggregate.min_liquidation_distance_bps",
      "snapshot.aggregate.daily_funding_usd",
    ],
  };
}

export function answerRiskQuestion(input: {
  snapshot: normalized_account_snapshot;
  question: string;
}): risk_assistant_response {
  const normalizedQuestion = input.question.trim().toLowerCase();

  if (normalizedQuestion.length === 0) {
    return buildSummaryAnswer(input.snapshot);
  }

  if (includesAdviceIntent(normalizedQuestion)) {
    return buildAdviceRefusal(input.snapshot);
  }

  if (
    includesAny(normalizedQuestion, [
      "liquidation",
      "liq",
      "distance",
      "close to",
    ])
  ) {
    return buildLiquidationAnswer(input.snapshot);
  }

  if (includesAny(normalizedQuestion, ["funding", "carry", "cost", "earn"])) {
    return buildFundingAnswer(input.snapshot);
  }

  if (includesAny(normalizedQuestion, ["fresh", "stale", "source", "time"])) {
    return buildFreshnessAnswer(input.snapshot);
  }

  if (includesAny(normalizedQuestion, ["scenario", "move", "stress", "price"])) {
    return buildScenarioAnswer(input.snapshot);
  }

  return buildSummaryAnswer(input.snapshot);
}

export function getRiskAssistantSuggestions(
  snapshot: normalized_account_snapshot,
): risk_assistant_suggestion[] {
  const suggestions = [
    {
      id: "summary",
      label: "Summarize",
      question: "Summarize this risk snapshot.",
    },
    {
      id: "liquidation",
      label: "Liquidation",
      question: "What is closest to liquidation?",
    },
    {
      id: "funding",
      label: "Funding",
      question: "What does funding cost or earn?",
    },
    {
      id: "freshness",
      label: "Freshness",
      question: "How fresh is this data?",
    },
  ];

  if (snapshot.positions.length > 0) {
    return suggestions;
  }

  return suggestions.filter((suggestion) => suggestion.id !== "liquidation");
}
