export const METRIC_KEYS = {
  TXN_COUNT: 'txn_count',
  TXN_AMOUNT: 'txn_amount',
  SUCCESS_RATE: 'success_rate',
  ERROR_COUNT: 'error_count',
  ERROR_RATE: 'error_rate',
  LOGIN_COUNT: 'login_count',
  ACTIVE_USERS: 'active_users',
  AVG_BALANCE: 'avg_balance',
} as const

export type MetricKey = (typeof METRIC_KEYS)[keyof typeof METRIC_KEYS]
