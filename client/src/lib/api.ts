'use client'

import { createClient } from '@/lib/supabase/client'

type RpcParams = Record<string, unknown>

interface AiQueryResponse {
    answer: string
    sql?: string
    chartConfig?: {
        type: 'line' | 'bar' | 'pie' | 'doughnut'
        data: {
            labels: string[]
            datasets: Array<{
                label: string
                data: number[]
                borderColor?: string
                backgroundColor?: string
                borderWidth?: number
                fill?: boolean
                tension?: number
            }>
        }
        options?: Record<string, unknown>
    }
}

async function getAuthenticatedClient() {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
        throw new Error('尚未登入或登入已過期，請重新登入後再試')
    }
    return supabase
}

async function invokeRpc<T>(name: string, params?: RpcParams): Promise<T> {
    const supabase = await getAuthenticatedClient()
    const { data, error } = await supabase.rpc(name, params ?? {})
    if (error) throw new Error(error.message)
    return data as T
}

function startOfMonthIso(now = new Date()) {
    const d = new Date(now.getFullYear(), now.getMonth(), 1)
    return d.toISOString()
}

function startOfNextMonthIso(now = new Date()) {
    const d = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return d.toISOString()
}

function startOfYesterdayIso(now = new Date()) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    return d.toISOString()
}

function startOfTodayIso(now = new Date()) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return d.toISOString()
}

function startOfLastMonthIso(now = new Date()) {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return d.toISOString()
}

function startOfCurrentMonthIso(now = new Date()) {
    const d = new Date(now.getFullYear(), now.getMonth(), 1)
    return d.toISOString()
}

const DAY_MS = 86_400_000

function isVipSuccessRateThisMonth(query: string) {
    return query.includes('vip') && query.includes('成功率') && (query.includes('這個月') || query.includes('本月'))
}

function isYesterdayFailedTx(query: string) {
    return query.includes('昨天') && query.includes('失敗')
}

function isWeeklyLogins(query: string) {
    return (query.includes('過去一週') || query.includes('最近7天')) && query.includes('登入')
}

function isLastMonthTopTransfer(query: string) {
    return (query.includes('上個月') || query.includes('上月')) && query.includes('前 10') && query.includes('轉帳金額')
}

function isRecent30DayErrors(query: string) {
    return query.includes('最近 30 天') && query.includes('錯誤代碼')
}

function isDormantUsers(query: string) {
    return query.includes('超過 7 天') && query.includes('沒有登入')
}

async function queryVipSuccessRateThisMonth(): Promise<AiQueryResponse> {
    const rows = await invokeRpc<Array<{ date: string; success_rate: number; total: number }>>('nf_stats_transfer_success_rate', {
        p_from: startOfMonthIso(),
        p_to: startOfNextMonthIso(),
    })
    const totalTx = rows.reduce((acc, row) => acc + Number(row.total ?? 0), 0)
    const weighted = rows.reduce((acc, row) => acc + (Number(row.success_rate ?? 0) * Number(row.total ?? 0)), 0)
    const successRate = totalTx ? +(weighted / totalTx).toFixed(1) : 0

    return {
        answer: `本月 VIP 客戶轉帳成功率約為 ${successRate}%，共統計 ${totalTx.toLocaleString()} 筆交易。`,
        sql: "SELECT DATE(created_at), COUNT(*) FILTER (WHERE status='success') / COUNT(*) FROM transactions ...",
        chartConfig: {
            type: 'line',
            data: {
                labels: rows.map((r) => r.date),
                datasets: [{
                    label: '每日成功率 %',
                    data: rows.map((r) => Number(r.success_rate ?? 0)),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16,185,129,0.12)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                }],
            },
            options: { responsive: true, maintainAspectRatio: false },
        },
    }
}

async function queryYesterdayFailedTransactions(): Promise<AiQueryResponse> {
    const rows = await invokeRpc<Array<{ user_name: string; error_code: string; amount: number }>>('nf_stats_failed_transactions', {
        p_limit: 20,
        p_from: startOfYesterdayIso(),
        p_to: startOfTodayIso(),
    })
    const preview = rows
        .slice(0, 5)
        .map((r) => `${r.user_name} (${r.error_code}, ${Number(r.amount).toLocaleString()} 元)`)
        .join('、')

    return {
        answer: rows.length
            ? `昨天共有 ${rows.length} 筆失敗交易。前 5 筆為：${preview}`
            : '昨天沒有失敗交易。',
        sql: "SELECT ... FROM transactions WHERE status='failed' AND created_at BETWEEN yesterday AND today",
    }
}

async function queryWeeklyLogins(): Promise<AiQueryResponse> {
    const rows = await invokeRpc<Array<{ date: string; count: number }>>('nf_stats_daily_logins', {
        p_from: new Date(Date.now() - 7 * DAY_MS).toISOString(),
        p_to: new Date().toISOString(),
    })

    return {
        answer: `過去一週登入人數最高為 ${Math.max(...rows.map((r) => Number(r.count ?? 0)), 0).toLocaleString()} 人。`,
        sql: "SELECT DATE(created_at), COUNT(DISTINCT user_id) FROM events WHERE event_type='login' ...",
        chartConfig: {
            type: 'bar',
            data: {
                labels: rows.map((r) => r.date),
                datasets: [{
                    label: '每日登入人數',
                    data: rows.map((r) => Number(r.count ?? 0)),
                    backgroundColor: '#3b82f6',
                }],
            },
            options: { responsive: true, maintainAspectRatio: false },
        },
    }
}

async function queryLastMonthTopTransferUsers(): Promise<AiQueryResponse> {
    const rows = await invokeRpc<Array<{ user_name: string; total_amount: number }>>('nf_ai_top_transfer_users', {
        p_from: startOfLastMonthIso(),
        p_to: startOfCurrentMonthIso(),
        p_limit: 10,
    })
    const topThree = rows
        .slice(0, 3)
        .map((r) => `${r.user_name}（${Number(r.total_amount).toLocaleString()} 元）`)
        .join('、')

    return {
        answer: rows.length
            ? `上個月轉帳金額最高前三名是：${topThree}`
            : '上個月沒有符合條件的轉帳資料。',
        sql: "SELECT user_name, SUM(amount) FROM transactions ... GROUP BY user_name ORDER BY SUM(amount) DESC LIMIT 10",
        chartConfig: {
            type: 'bar',
            data: {
                labels: rows.map((r) => r.user_name),
                datasets: [{
                    label: '總轉帳金額',
                    data: rows.map((r) => Number(r.total_amount ?? 0)),
                    backgroundColor: '#f59e0b',
                }],
            },
            options: { responsive: true, maintainAspectRatio: false },
        },
    }
}

async function queryRecent30DayErrors(): Promise<AiQueryResponse> {
    const rows = await invokeRpc<Array<{ error_code: string; count: number }>>('nf_stats_error_breakdown', {
        p_from: new Date(Date.now() - 30 * DAY_MS).toISOString(),
        p_to: new Date().toISOString(),
    })
    const top = rows[0]
    return {
        answer: top
            ? `最近 30 天最常見的錯誤代碼是 ${top.error_code}，共 ${Number(top.count).toLocaleString()} 次。`
            : '最近 30 天沒有失敗交易錯誤。',
        sql: "SELECT error_code, COUNT(*) FROM transactions WHERE status='failed' ... GROUP BY error_code",
        chartConfig: {
            type: 'pie',
            data: {
                labels: rows.map((r) => r.error_code),
                datasets: [{
                    label: '錯誤次數',
                    data: rows.map((r) => Number(r.count ?? 0)),
                }],
            },
            options: { responsive: true, maintainAspectRatio: false },
        },
    }
}

async function queryDormantUsers(): Promise<AiQueryResponse> {
    const rows = await invokeRpc<Array<{ user_name: string; inactive_days: number }>>('nf_ai_dormant_users', {
        p_days: 7,
        p_limit: 20,
    })
    return {
        answer: rows.length
            ? `目前有 ${rows.length} 位客戶超過 7 天未登入，最久為 ${rows[0].inactive_days} 天（${rows[0].user_name}）。`
            : '目前沒有超過 7 天未登入的客戶。',
        sql: "SELECT user_name, last_login_at FROM users/events WHERE last_login_at < NOW() - interval '7 days'",
    }
}

async function runAiTemplateQuery(query: string): Promise<AiQueryResponse> {
    const normalized = query.trim().toLowerCase()

    if (isVipSuccessRateThisMonth(normalized)) return queryVipSuccessRateThisMonth()
    if (isYesterdayFailedTx(normalized)) return queryYesterdayFailedTransactions()
    if (isWeeklyLogins(normalized)) return queryWeeklyLogins()
    if (isLastMonthTopTransfer(normalized)) return queryLastMonthTopTransferUsers()
    if (isRecent30DayErrors(normalized)) return queryRecent30DayErrors()
    if (isDormantUsers(normalized)) return queryDormantUsers()

    return {
        answer: '目前支援的自然語言查詢包含：本月成功率、昨天失敗交易、過去一週登入趨勢、上月前 10 轉帳金額、30 天錯誤代碼分佈、7 天未登入客戶。請改用其中一種問法。',
    }
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
