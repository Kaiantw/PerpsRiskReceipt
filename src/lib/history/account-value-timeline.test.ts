import assert from "node:assert/strict";
import test from "node:test";

import { buildAccountValueTimeline } from "./account-value-timeline.ts";

test("single point history reports limited context", () => {
  const timeline = buildAccountValueTimeline({
    window_id: "perpDay",
    points: [{ time_ms: 1, account_value_usd: 1_000, pnl_usd: 0 }],
  });

  assert.equal(timeline.label, "single_point");
  assert.equal(timeline.point_count, 1);
  assert.equal(timeline.account_value_change_usd, 0);
  assert.equal(timeline.account_value_change_percent, 0);
  assert.equal(timeline.current_drawdown_percent, 0);
  assert.equal(timeline.max_drawdown_percent, 0);
});

test("higher account value labels the window as higher", () => {
  const timeline = buildAccountValueTimeline({
    window_id: "perpWeek",
    points: [
      { time_ms: 2, account_value_usd: 1_050 },
      { time_ms: 1, account_value_usd: 1_000 },
    ],
  });

  assert.equal(timeline.label, "higher");
  assert.equal(timeline.first_point?.account_value_usd, 1_000);
  assert.equal(timeline.latest_point?.account_value_usd, 1_050);
  assert.equal(timeline.account_value_change_usd, 50);
  assert.equal(timeline.account_value_change_percent, 5);
});

test("lower account value labels the window as lower", () => {
  const timeline = buildAccountValueTimeline({
    window_id: "perpWeek",
    points: [
      { time_ms: 1, account_value_usd: 1_000 },
      { time_ms: 2, account_value_usd: 960 },
    ],
  });

  assert.equal(timeline.label, "lower");
  assert.equal(timeline.account_value_change_usd, -40);
  assert.equal(timeline.account_value_change_percent, -4);
});

test("peak-to-trough drawdown is measured across the full window", () => {
  const timeline = buildAccountValueTimeline({
    window_id: "perpMonth",
    points: [
      { time_ms: 1, account_value_usd: 100 },
      { time_ms: 2, account_value_usd: 120 },
      { time_ms: 3, account_value_usd: 90 },
      { time_ms: 4, account_value_usd: 110 },
    ],
  });

  assert.equal(timeline.label, "drawdown_watch");
  assert.equal(timeline.peak_account_value_usd, 120);
  assert.equal(timeline.max_drawdown_percent, 25);
  assert.equal(timeline.current_drawdown_percent, 8.33);
});

test("zero starting account value avoids infinite percentage changes", () => {
  const timeline = buildAccountValueTimeline({
    window_id: "perpAllTime",
    points: [
      { time_ms: 1, account_value_usd: 0 },
      { time_ms: 2, account_value_usd: 10 },
    ],
  });

  assert.equal(timeline.account_value_change_usd, 10);
  assert.equal(timeline.account_value_change_percent, null);
});
