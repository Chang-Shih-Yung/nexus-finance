/** Shared RPC response types used across dashboard sections */

export interface TrendRow {
  date: string
  metric_value: number
}

export interface BreakdownRow {
  dimension_value: string
  metric_value: number
}

export interface TopNRow {
  dimension_value: string
  metric_value: number
}

export interface PeriodCompare {
  current_total: number
  previous_total: number
  change_pct: number
}

export interface AnomalyRow {
  metric_key: string
  dimension: string
  dimension_value: string
  today_value: number
  avg_7d: number
  stddev_7d: number
  z_score: number
}

export interface FunnelRow {
  step: string
  users: number
  conversion_rate: number
  drop_off_rate: number
}

export interface FailedTxRow {
  id: number
  created_at: string
  user_name: string
  tier: string
  amount: number
  channel: string
  error_code: string
  error_message: string
  reviewed_at?: string | null
  review_note?: string | null
}

export interface HealthRow {
  minute: string
  avg_latency: number
  error_count: number
  error_rate: number
  total_requests: number
}

export interface AckRow {
  metric_key: string
  dimension: string
  dim_value: string
}
