import assert from "node:assert/strict";
import test from "node:test";

import {
  defaultRedactedReviewThresholds,
  getRedactedReviewThresholdProfile,
  redactedReviewThresholdProfiles,
  resolveRedactedReviewThresholds,
} from "./redacted-review-thresholds.ts";

test("resolves default redacted review thresholds", () => {
  assert.deepEqual(
    resolveRedactedReviewThresholds(undefined),
    defaultRedactedReviewThresholds,
  );
});

test("sanitizes redacted review thresholds while preserving ordering", () => {
  const thresholds = resolveRedactedReviewThresholds({
    high_age_minutes: 30,
    high_funding_move_bps: 0.25,
    high_range_percent: -10,
    material_adverse_move_percent: -1,
    material_funding_move_bps: 2,
    range_to_buffer_high_ratio: 0.25,
    range_to_buffer_watch_ratio: 0.75,
    thin_liquidation_distance_bps: 900,
    tight_liquidation_distance_bps: 300,
    watch_age_minutes: 60,
  });

  assert.equal(thresholds.watch_age_minutes, 60);
  assert.equal(thresholds.high_age_minutes, 60);
  assert.equal(thresholds.material_funding_move_bps, 2);
  assert.equal(thresholds.high_funding_move_bps, 2);
  assert.equal(thresholds.range_to_buffer_watch_ratio, 0.75);
  assert.equal(thresholds.range_to_buffer_high_ratio, 0.75);
  assert.equal(thresholds.thin_liquidation_distance_bps, 900);
  assert.equal(thresholds.tight_liquidation_distance_bps, 900);
  assert.equal(thresholds.high_range_percent, 0);
  assert.equal(thresholds.material_adverse_move_percent, 0);
});

test("exposes strict standard and relaxed redacted review profiles", () => {
  assert.deepEqual(
    redactedReviewThresholdProfiles.map((profile) => profile.id),
    ["strict", "standard", "relaxed"],
  );
  assert.equal(getRedactedReviewThresholdProfile("standard").label, "Standard");
});
