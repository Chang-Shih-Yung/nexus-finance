'use client'

import { createClient } from '@/lib/supabase/client'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
// Gateway requires JWT-format anon key (eyJh...), not publishable key (sb_publishable_...)
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function getAuthHeaders(): Promise<Record<string, string>> {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return {
        'Content-Type': 'application/json',
        apikey: ANON_KEY,
        ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
    }
}

async function edgeFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${SUPABASE_URL}/functions/v1/${path}`)
    if (params) {
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
    }
    const res = await fetch(url.toString(), { headers: await getAuthHeaders() })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
    }
    return res.json()
}

async function edgePost<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${path}`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(body),
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
    }
    return res.json()
}

export const api = {
    getOverview: () => edgeFetch('stats-overview'),
    getTrend: (days = 7) => edgeFetch('stats-trend', { days: String(days) }),
    getDailyLogins: (from?: string, to?: string) =>
        edgeFetch('stats-daily-logins', { ...(from ? { from } : {}), ...(to ? { to } : {}) }),
    getTransferSuccessRate: (from?: string, to?: string) =>
        edgeFetch('stats-transfer-success-rate', { ...(from ? { from } : {}), ...(to ? { to } : {}) }),
    getFunnel: (from?: string, to?: string) =>
        edgeFetch('stats-funnel', { ...(from ? { from } : {}), ...(to ? { to } : {}) }),
    getErrorBreakdown: (from?: string, to?: string) =>
        edgeFetch('stats-error-breakdown', { ...(from ? { from } : {}), ...(to ? { to } : {}) }),
    getFailedTransactions: (limit = 50) =>
        edgeFetch('stats-failed-transactions', { limit: String(limit) }),
    getApiHealth: (minutes = 60) =>
        edgeFetch('stats-api-health', { minutes: String(minutes) }),
    aiQuery: (query: string) => edgePost('ai-query', { query }),
}
