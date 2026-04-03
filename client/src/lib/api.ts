'use client'

import { createClient } from '@/lib/supabase/client'
import { runAiTemplateQuery } from '@/lib/ai-queries'

type RpcParams = Record<string, unknown>

async function invokeRpc<T>(name: string, params?: RpcParams): Promise<T> {
    const supabase = createClient()
    const { data, error } = await supabase.rpc(name, params ?? {})
    if (error) throw new Error(error.message)
    return data as T
}

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
    aiQuery: (query: string) => runAiTemplateQuery(query),
}
