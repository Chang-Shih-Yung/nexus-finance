'use client'

import { runAiQuery } from '@/lib/ai-queries'
import { invokeRpc } from '@/lib/rpc'

export const api = {
    getOverview: async () => {
        const rows = await invokeRpc<Array<{
            today_logins: number
            today_transactions: number
            today_success_rate: number
            today_active_users: number
        }>>('nf_stats_overview')
        return rows[0] ?? { today_logins: 0, today_transactions: 0, today_success_rate: 0, today_active_users: 0 }
    },
    getTrend: (days = 7) => invokeRpc('nf_stats_trend', { p_days: days }),
    getDailyLogins: (from?: string, to?: string) =>
        invokeRpc('nf_stats_daily_logins', { p_from: from ?? null, p_to: to ?? null }),
    getTransferSuccessRate: (from?: string, to?: string) =>
        invokeRpc('nf_stats_transfer_success_rate', { p_from: from ?? null, p_to: to ?? null }),
    getFunnel: (from?: string, to?: string) =>
        invokeRpc('nf_stats_funnel', { p_from: from ?? null, p_to: to ?? null }),
    getErrorBreakdown: (from?: string, to?: string) =>
        invokeRpc('nf_stats_error_breakdown', { p_from: from ?? null, p_to: to ?? null }),
    getFailedTransactions: (limit = 50, from?: string, to?: string) =>
        invokeRpc('nf_stats_failed_transactions', { p_limit: limit, p_from: from ?? null, p_to: to ?? null }),
    getApiHealth: (minutes = 60) =>
        invokeRpc('nf_stats_api_health', { p_minutes: minutes }),
    aiQuery: (query: string) => runAiQuery(query),

    // ── Generic dashboard RPCs ──────────────────────────────
    dailyTrend: (metricKey: string, days = 30, dimension?: string, dimensionValue?: string) =>
        invokeRpc<Array<{ date: string; metric_value: number }>>('nf_daily_trend', {
            p_metric_key: metricKey,
            p_days: days,
            ...(dimension && { p_dimension: dimension }),
            ...(dimensionValue && { p_dimension_value: dimensionValue }),
        }),

    currentBreakdown: (metricKey: string, dimension: string, date?: string) =>
        invokeRpc<Array<{ dimension_value: string; metric_value: number }>>('nf_current_breakdown', {
            p_metric_key: metricKey,
            p_dimension: dimension,
            ...(date && { p_date: date }),
        }),

    topN: (metricKey: string, dimension: string, n = 10, date?: string) =>
        invokeRpc<Array<{ dimension_value: string; metric_value: number }>>('nf_top_n', {
            p_metric_key: metricKey,
            p_dimension: dimension,
            p_n: n,
            ...(date && { p_date: date }),
        }),

    periodCompare: (metricKey: string, currentStart: string, currentEnd: string, prevStart: string, prevEnd: string) =>
        invokeRpc<Array<{ current_total: number; previous_total: number; change_pct: number }>>('nf_period_compare', {
            p_metric_key: metricKey,
            p_current_start: currentStart,
            p_current_end: currentEnd,
            p_previous_start: prevStart,
            p_previous_end: prevEnd,
        }).then(rows => rows[0] ?? { current_total: 0, previous_total: 0, change_pct: 0 }),

    anomalyCheck: (date?: string) =>
        invokeRpc<Array<{
            metric_key: string; dimension: string; dimension_value: string
            today_value: number; avg_7d: number; stddev_7d: number; z_score: number
        }>>('nf_anomaly_check', date ? { p_date: date } : {}),

    recentTransactions: (limit = 10) =>
        invokeRpc<Array<{
            id: number; user_name: string; amount: number; currency: string
            from_account: string; to_account: string; status: string
            category: string; channel: string; created_at: string
        }>>('nf_recent_transactions', { p_limit: limit }),

    accountSummary: () =>
        invokeRpc<Array<{
            total_balance: number; account_count: number
            primary_currency: string; avg_balance: number
        }>>('nf_account_summary').then(rows => rows[0] ?? {
            total_balance: 0, account_count: 0, primary_currency: 'TWD', avg_balance: 0,
        }),

    monthlyActivity: (months = 12) =>
        invokeRpc<Array<{
            month: string; txn_count: number; txn_amount: number
        }>>('nf_monthly_activity', { p_months: months }),

    pendingTransactions: (limit = 10) =>
        invokeRpc<Array<{
            id: number; user_name: string; amount: number
            currency: string; category: string; created_at: string
        }>>('nf_pending_transactions', { p_limit: limit }),
}
