export type redacted_review_thresholds = {
  high_age_minutes: number;
  high_funding_move_bps: number;
  high_range_percent: number;
  material_adverse_move_percent: number;
  material_funding_move_bps: number;
  range_to_buffer_high_ratio: number;
  range_to_buffer_watch_ratio: number;
  thin_liquidation_distance_bps: number;
  tight_liquidation_distance_bps: number;
  watch_age_minutes: number;
};

export type redacted_review_threshold_profile_id =
  | "strict"
  | "standard"
  | "relaxed";

export type redacted_review_threshold_profile = {
  id: redacted_review_threshold_profile_id;
  label: string;
  description: string;
  thresholds: redacted_review_thresholds;
};

export const defaultRedactedReviewThresholds: redacted_review_thresholds = {
  high_age_minutes: 24 * 60,
  high_funding_move_bps: 3,
  high_range_percent: 8,
  material_adverse_move_percent: 2,
  material_funding_move_bps: 1,
  range_to_buffer_high_ratio: 1,
  range_to_buffer_watch_ratio: 0.5,
  thin_liquidation_distance_bps: 500,
  tight_liquidation_distance_bps: 1_000,
  watch_age_minutes: 4 * 60,
};

export const redactedReviewThresholdProfiles: redacted_review_threshold_profile[] =
  [
    {
      id: "strict",
      label: "Strict",
      description:
        "Flags stale timestamps, thinner buffers, smaller adverse moves, and smaller funding shifts sooner.",
      thresholds: {
        high_age_minutes: 12 * 60,
        high_funding_move_bps: 2,
        high_range_percent: 5,
        material_adverse_move_percent: 1,
        material_funding_move_bps: 0.5,
        range_to_buffer_high_ratio: 0.75,
        range_to_buffer_watch_ratio: 0.35,
        thin_liquidation_distance_bps: 750,
        tight_liquidation_distance_bps: 1_500,
        watch_age_minutes: 2 * 60,
      },
    },
    {
      id: "standard",
      label: "Standard",
      description:
        "Uses the app's balanced public-review thresholds for receipt age, buffers, adverse moves, range, and funding.",
      thresholds: defaultRedactedReviewThresholds,
    },
    {
      id: "relaxed",
      label: "Relaxed",
      description:
        "Requires older timestamps, thinner buffers, larger adverse moves, and larger funding shifts before escalating.",
      thresholds: {
        high_age_minutes: 48 * 60,
        high_funding_move_bps: 5,
        high_range_percent: 12,
        material_adverse_move_percent: 4,
        material_funding_move_bps: 2,
        range_to_buffer_high_ratio: 1.25,
        range_to_buffer_watch_ratio: 0.75,
        thin_liquidation_distance_bps: 300,
        tight_liquidation_distance_bps: 700,
        watch_age_minutes: 8 * 60,
      },
    },
  ];

export function resolveRedactedReviewThresholds(
  thresholds: Partial<redacted_review_thresholds> | undefined,
): redacted_review_thresholds {
  const merged = {
    ...defaultRedactedReviewThresholds,
    ...thresholds,
  };
  const watchAgeMinutes = Math.max(0, merged.watch_age_minutes);
  const highAgeMinutes = Math.max(watchAgeMinutes, merged.high_age_minutes);
  const materialFundingMoveBps = Math.max(
    0,
    merged.material_funding_move_bps,
  );
  const highFundingMoveBps = Math.max(
    materialFundingMoveBps,
    merged.high_funding_move_bps,
  );
  const rangeToBufferWatchRatio = Math.max(
    0,
    merged.range_to_buffer_watch_ratio,
  );
  const rangeToBufferHighRatio = Math.max(
    rangeToBufferWatchRatio,
    merged.range_to_buffer_high_ratio,
  );
  const thinLiquidationDistanceBps = Math.max(
    0,
    merged.thin_liquidation_distance_bps,
  );
  const tightLiquidationDistanceBps = Math.max(
    thinLiquidationDistanceBps,
    merged.tight_liquidation_distance_bps,
  );

  return {
    high_age_minutes: highAgeMinutes,
    high_funding_move_bps: highFundingMoveBps,
    high_range_percent: Math.max(0, merged.high_range_percent),
    material_adverse_move_percent: Math.max(
      0,
      merged.material_adverse_move_percent,
    ),
    material_funding_move_bps: materialFundingMoveBps,
    range_to_buffer_high_ratio: rangeToBufferHighRatio,
    range_to_buffer_watch_ratio: rangeToBufferWatchRatio,
    thin_liquidation_distance_bps: thinLiquidationDistanceBps,
    tight_liquidation_distance_bps: tightLiquidationDistanceBps,
    watch_age_minutes: watchAgeMinutes,
  };
}

export function getRedactedReviewThresholdProfile(
  id: redacted_review_threshold_profile_id,
) {
  return (
    redactedReviewThresholdProfiles.find((profile) => profile.id === id) ??
    redactedReviewThresholdProfiles[1]
  );
}
