export type perp_protocol = "hyperliquid" | "fixture";

export type position_side = "long" | "short";

export type data_freshness = "live" | "stale" | "fixture" | "error";

export type risk_label = "low" | "medium" | "high" | "critical";

export type normalized_position = {
  market: string;
  side: position_side;
  size: number;
  entry_price_usd: number;
  mark_price_usd: number;
  liquidation_price_usd: number | null;
  notional_usd: number;
  unrealized_pnl_usd: number;
  funding_8h_bps_user_perspective: number;
  open_interest_usd?: number;
};

export type normalized_account_snapshot = {
  account: string;
  protocol: perp_protocol;
  source: "live" | "fixture";
  created_at_iso: string;
  data_time_iso: string;
  freshness: data_freshness;
  stale_reason?: string;
  account_value_usd: number;
  margin_used_usd: number;
  withdrawable_usd?: number;
  positions: normalized_position[];
  aggregate: {
    total_notional_usd: number;
    margin_usage_bps: number;
    min_liquidation_distance_bps: number | null;
    daily_funding_usd: number;
    thirty_day_funding_usd: number;
    risk_score: number;
    risk_label: risk_label;
  };
};

export type risk_receipt = {
  id: string;
  snapshot_hash: string;
  snapshot: normalized_account_snapshot;
  created_at_iso: string;
  eas_schema_uid?: string;
  eas_attestation_uid?: string;
  tx_hash?: string;
  chain_id?: number;
};

export type receipt_verification = {
  expected_hash: string;
  recomputed_hash: string;
  matches: boolean;
};

export type position_input = Omit<
  normalized_position,
  "notional_usd" | "unrealized_pnl_usd"
>;

export type account_snapshot_input = Omit<
  normalized_account_snapshot,
  "aggregate" | "positions"
> & {
  positions: position_input[];
};

export type scenario_result = {
  move_bps: number;
  move_percent: number;
  estimated_account_value_usd: number;
  estimated_pnl_change_usd: number;
  positions_at_or_through_liquidation: string[];
  risk_score_after_move: number;
  risk_label_after_move: risk_label;
  summary: string;
};
