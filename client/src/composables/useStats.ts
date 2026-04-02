import { ref } from 'vue'
import { api } from './useAuth'

async function fetchOverview() {
    const { data } = await api.get('/stats-overview')
    return data
}

async function fetchTrend(days = 7) {
    const { data } = await api.get('/stats-trend', { params: { days } })
    return data
}

async function fetchDailyLogins(from?: string, to?: string) {
    const { data } = await api.get('/stats-daily-logins', { params: { from, to } })
    return data
}

async function fetchTransferSuccessRate(from?: string, to?: string) {
    const { data } = await api.get('/stats-transfer-success-rate', { params: { from, to } })
    return data
}

async function fetchFunnel(from?: string, to?: string) {
    const { data } = await api.get('/stats-funnel', { params: { from, to } })
    return data
}

async function fetchErrorBreakdown(from?: string, to?: string) {
    const { data } = await api.get('/stats-error-breakdown', { params: { from, to } })
    return data
}

async function fetchFailedTransactions(limit = 50) {
    const { data } = await api.get('/stats-failed-transactions', { params: { limit } })
    return data
}

async function fetchApiHealth(minutes = 60) {
    const { data } = await api.get('/stats-api-health', { params: { minutes } })
    return data
}

export function useStats() {
    const loading = ref(false)
    const error = ref<string | null>(null)

    async function fetchOverviewSafe() {
        loading.value = true
        error.value = null
        try {
            return await fetchOverview()
        } catch (e: any) {
            error.value = e.message
            return null
        } finally {
            loading.value = false
        }
    }

    return {
        loading, error,
        fetchOverview: fetchOverviewSafe,
        fetchTrend, fetchDailyLogins,
        fetchTransferSuccessRate, fetchFunnel,
        fetchErrorBreakdown, fetchFailedTransactions, fetchApiHealth,
    }
}
