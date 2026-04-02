'use client'

import { createClient } from '@/lib/supabase/client'

async function invokeEdgeFunction<T>(name: string, options?: { body?: Record<string, unknown>; query?: Record<string, string> }): Promise<T> {
    const supabase = createClient()
    let path = name
    if (options?.query) {
        const params = new URLSearchParams(options.query).toString()
        path = `${name}?${params}`
    }
    const { data, error } = await supabase.functions.invoke<T>(path, {
        method: options?.body ? 'POST' : 'GET',
        body: options?.body,
    })
    if (error) throw new Error(error.message)
    return data as T
}

export const api = {
    getOverview: () => invokeEdgeFunction('stats-overview'),
    getTrend: (days = 7) => invokeEdgeFunction('stats-trend', { query: { days: String(days) } }),
    getDailyLogins: (from?: string, to?: string) =>
        invokeEdgeFunction('stats-daily-logins', { query: { ...(from ? { from } : {}), ...(to ? { to } : {}) } }),
    getTransferSuccessRate: (from?: string, to?: string) =>
        invokeEdgeFunction('stats-transfer-success-rate', { query: { ...(from ? { from } : {}), ...(to ? { to } : {}) } }),
    getFunnel: (from?: string, to?: string) =>
        invokeEdgeFunction('stats-funnel', { query: { ...(from ? { from } : {}), ...(to ? { to } : {}) } }),
    getErrorBreakdown: (from?: string, to?: string) =>
        invokeEdgeFunction('stats-error-breakdown', { query: { ...(from ? { from } : {}), ...(to ? { to } : {}) } }),
    getFailedTransactions: (limit = 50) =>
        invokeEdgeFunction('stats-failed-transactions', { query: { limit: String(limit) } }),
    getApiHealth: (minutes = 60) =>
        invokeEdgeFunction('stats-api-health', { query: { minutes: String(minutes) } }),
    aiQuery: (query: string) => invokeEdgeFunction('ai-query', { body: { query } as Record<string, unknown> }),
}
