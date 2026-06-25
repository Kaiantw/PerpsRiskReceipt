import assert from "node:assert/strict";
import test from "node:test";

import { buildAccountValueTimeline } from "./account-value-timeline.ts";
import { buildReceiptAccountValueContext } from "./receipt-account-value-context.ts";

function buildTimeline(input: {
  window_id: string;
  values: Array<[string, number]>;
}) {
  return buildAccountValueTimeline({
    window_id: input.window_id,
    points: input.values.map(([iso, accountValueUsd]) => ({
      time_ms: Date.parse(iso),
      account_value_usd: accountValueUsd,
    })),
  });
}

test("reports no history when no usable timeline points exist", () => {
  const context = buildReceiptAccountValueContext({
    receipt_data_time_iso: "2026-06-24T12:00:00.000Z",
    receipt_account_value_usd: 1_000,
    timelines: [
      buildAccountValueTimeline({
        window_id: "perpWeek",
        points: [],
      }),
    ],
  });

  assert.equal(context.label, "no_history");
  assert.equal(context.selected_timeline, null);
  assert.equal(context.nearest_point, null);
});

test("prefers perp history windows and finds the nearest receipt sample", () => {
  const context = buildReceiptAccountValueContext({
    receipt_data_time_iso: "2026-06-24T12:15:00.000Z",
    receipt_account_value_usd: 1_205,
    timelines: [
      buildTimeline({
        window_id: "allTime",
        values: [["2026-06-24T12:00:00.000Z", 900]],
      }),
      buildTimeline({
        window_id: "perpWeek",
        values: [
          ["2026-06-24T12:00:00.000Z", 1_000],
          ["2026-06-24T12:15:00.000Z", 1_200],
          ["2026-06-24T12:30:00.000Z", 1_190],
        ],
      }),
    ],
  });

  assert.equal(context.selected_timeline?.window_id, "perpWeek");
  assert.equal(context.nearest_point?.account_value_usd, 1_200);
  assert.equal(context.nearest_sample_gap_minutes, 0);
  assert.equal(context.receipt_vs_nearest_sample_usd, 5);
  assert.equal(context.receipt_vs_nearest_sample_percent, 0.42);
});

test("labels a receipt near the sampled high-water mark", () => {
  const context = buildReceiptAccountValueContext({
    receipt_data_time_iso: "2026-06-24T12:15:00.000Z",
    receipt_account_value_usd: 1_198,
    timelines: [
      buildTimeline({
        window_id: "perpWeek",
        values: [
          ["2026-06-24T12:00:00.000Z", 1_000],
          ["2026-06-24T12:15:00.000Z", 1_200],
          ["2026-06-24T12:30:00.000Z", 1_190],
        ],
      }),
    ],
  });

  assert.equal(context.label, "near_peak");
  assert.equal(context.receipt_drawdown_percent, 0);
});

test("labels a receipt captured during sampled drawdown", () => {
  const context = buildReceiptAccountValueContext({
    receipt_data_time_iso: "2026-06-24T12:30:00.000Z",
    receipt_account_value_usd: 1_200,
    timelines: [
      buildTimeline({
        window_id: "perpWeek",
        values: [
          ["2026-06-24T12:00:00.000Z", 1_000],
          ["2026-06-24T12:15:00.000Z", 1_500],
          ["2026-06-24T12:30:00.000Z", 1_200],
        ],
      }),
    ],
  });

  assert.equal(context.label, "in_drawdown");
  assert.equal(context.receipt_drawdown_percent, 20);
  assert.equal(context.max_drawdown_percent, 20);
});

test("labels material latest sampled account value changes since receipt", () => {
  const context = buildReceiptAccountValueContext({
    receipt_data_time_iso: "2026-06-24T12:15:00.000Z",
    receipt_account_value_usd: 1_000,
    timelines: [
      buildTimeline({
        window_id: "perpWeek",
        values: [
          ["2026-06-24T12:00:00.000Z", 1_000],
          ["2026-06-24T12:15:00.000Z", 1_000],
          ["2026-06-24T12:30:00.000Z", 950],
        ],
      }),
    ],
  });

  assert.equal(context.label, "latest_lower");
  assert.equal(context.latest_vs_receipt_usd, -50);
  assert.equal(context.latest_vs_receipt_percent, -5);
});

test("warns when the nearest sample is far from the receipt timestamp", () => {
  const context = buildReceiptAccountValueContext({
    receipt_data_time_iso: "2026-06-24T13:30:00.000Z",
    receipt_account_value_usd: 1_050,
    timelines: [
      buildTimeline({
        window_id: "perpWeek",
        values: [
          ["2026-06-24T12:00:00.000Z", 1_000],
          ["2026-06-24T15:00:00.000Z", 1_100],
        ],
      }),
    ],
  });

  assert.equal(context.label, "sample_gap_watch");
  assert.equal(context.nearest_sample_gap_minutes, 90);
});

test("avoids infinite percentages when receipt account value is zero", () => {
  const context = buildReceiptAccountValueContext({
    receipt_data_time_iso: "2026-06-24T12:00:00.000Z",
    receipt_account_value_usd: 0,
    timelines: [
      buildTimeline({
        window_id: "perpWeek",
        values: [
          ["2026-06-24T12:00:00.000Z", 0],
          ["2026-06-24T12:15:00.000Z", 100],
        ],
      }),
    ],
  });

  assert.equal(context.latest_vs_receipt_usd, 100);
  assert.equal(context.latest_vs_receipt_percent, null);
  assert.equal(context.receipt_vs_nearest_sample_percent, null);
});
