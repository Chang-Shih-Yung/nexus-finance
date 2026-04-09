import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase client
const mockRpc = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    rpc: mockRpc,
  }),
}))

// Import after mocking
const { api } = await import('@/lib/api')

describe('api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getOverview', () => {
    it('returns overview data from RPC', async () => {
      const mockData = [{
        today_logins: 42,
        today_transactions: 100,
        today_success_rate: 95.5,
        today_active_users: 38,
      }]
      mockRpc.mockResolvedValueOnce({ data: mockData, error: null })

      const result = await api.getOverview()

      expect(mockRpc).toHaveBeenCalledWith('nf_stats_overview', {})
      expect(result).toEqual(mockData[0])
    })

    it('returns zero defaults when RPC returns empty array', async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null })

      const result = await api.getOverview()

      expect(result).toEqual({
        today_logins: 0,
        today_transactions: 0,
        today_success_rate: 0,
        today_active_users: 0,
      })
    })

    it('throws on RPC error', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'unauthorized' } })

      await expect(api.getOverview()).rejects.toThrow('unauthorized')
    })
  })

  describe('getTrend', () => {
    it('calls nf_stats_trend with default 7 days', async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null })

      await api.getTrend()

      expect(mockRpc).toHaveBeenCalledWith('nf_stats_trend', { p_days: 7 })
    })

    it('passes custom days parameter', async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null })

      await api.getTrend(30)

      expect(mockRpc).toHaveBeenCalledWith('nf_stats_trend', { p_days: 30 })
    })
  })

  describe('getFunnel', () => {
    it('passes null when no date params given', async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null })

      await api.getFunnel()

      expect(mockRpc).toHaveBeenCalledWith('nf_stats_funnel', { p_from: null, p_to: null })
    })

    it('passes date params when given', async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null })

      await api.getFunnel('2026-01-01', '2026-01-31')

      expect(mockRpc).toHaveBeenCalledWith('nf_stats_funnel', { p_from: '2026-01-01', p_to: '2026-01-31' })
    })
  })

  describe('getErrorBreakdown', () => {
    it('calls RPC with null defaults', async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null })

      await api.getErrorBreakdown()

      expect(mockRpc).toHaveBeenCalledWith('nf_stats_error_breakdown', { p_from: null, p_to: null })
    })
  })

  describe('getFailedTransactions', () => {
    it('passes limit and date params', async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null })

      await api.getFailedTransactions(20, '2026-01-01', '2026-01-31')

      expect(mockRpc).toHaveBeenCalledWith('nf_stats_failed_transactions', {
        p_limit: 20,
        p_from: '2026-01-01',
        p_to: '2026-01-31',
      })
    })

    it('uses default limit of 50', async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null })

      await api.getFailedTransactions()

      expect(mockRpc).toHaveBeenCalledWith('nf_stats_failed_transactions', {
        p_limit: 50,
        p_from: null,
        p_to: null,
      })
    })
  })

  describe('getApiHealth', () => {
    it('passes minutes parameter', async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null })

      await api.getApiHealth(120)

      expect(mockRpc).toHaveBeenCalledWith('nf_stats_api_health', { p_minutes: 120 })
    })

    it('uses default 60 minutes', async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null })

      await api.getApiHealth()

      expect(mockRpc).toHaveBeenCalledWith('nf_stats_api_health', { p_minutes: 60 })
    })
  })

  // ── New generic RPC wrappers ──

  describe('dailyTrend', () => {
    it('calls nf_daily_trend with metric key and days', async () => {
      mockRpc.mockResolvedValueOnce({ data: [{ date: '2026-04-01', metric_value: 100 }], error: null })

      const result = await api.dailyTrend('txn_count', 30)

      expect(mockRpc).toHaveBeenCalledWith('nf_daily_trend', {
        p_metric_key: 'txn_count',
        p_days: 30,
      })
      expect(result).toEqual([{ date: '2026-04-01', metric_value: 100 }])
    })

    it('passes optional dimension params', async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null })

      await api.dailyTrend('txn_count', 7, 'category', 'transfer')

      expect(mockRpc).toHaveBeenCalledWith('nf_daily_trend', {
        p_metric_key: 'txn_count',
        p_days: 7,
        p_dimension: 'category',
        p_dimension_value: 'transfer',
      })
    })
  })

  describe('currentBreakdown', () => {
    it('calls nf_current_breakdown with metric and dimension', async () => {
      mockRpc.mockResolvedValueOnce({ data: [{ dimension_value: 'web', metric_value: 50 }], error: null })

      const result = await api.currentBreakdown('txn_count', 'channel')

      expect(mockRpc).toHaveBeenCalledWith('nf_current_breakdown', {
        p_metric_key: 'txn_count',
        p_dimension: 'channel',
      })
      expect(result).toEqual([{ dimension_value: 'web', metric_value: 50 }])
    })
  })

  describe('topN', () => {
    it('calls nf_top_n with defaults', async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null })

      await api.topN('txn_amount', 'user')

      expect(mockRpc).toHaveBeenCalledWith('nf_top_n', {
        p_metric_key: 'txn_amount',
        p_dimension: 'user',
        p_n: 10,
      })
    })
  })

  describe('periodCompare', () => {
    it('calls nf_period_compare and returns first row', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ current_total: 1000, previous_total: 800, change_pct: 25 }],
        error: null,
      })

      const result = await api.periodCompare('txn_amount', '2026-04-01', '2026-04-08', '2026-03-01', '2026-03-08')

      expect(mockRpc).toHaveBeenCalledWith('nf_period_compare', {
        p_metric_key: 'txn_amount',
        p_current_start: '2026-04-01',
        p_current_end: '2026-04-08',
        p_previous_start: '2026-03-01',
        p_previous_end: '2026-03-08',
      })
      expect(result).toEqual({ current_total: 1000, previous_total: 800, change_pct: 25 })
    })

    it('returns zero defaults when empty', async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null })

      const result = await api.periodCompare('txn_amount', '2026-04-01', '2026-04-08', '2026-03-01', '2026-03-08')

      expect(result).toEqual({ current_total: 0, previous_total: 0, change_pct: 0 })
    })
  })

  describe('anomalyCheck', () => {
    it('calls nf_anomaly_check without date', async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null })

      await api.anomalyCheck()

      expect(mockRpc).toHaveBeenCalledWith('nf_anomaly_check', {})
    })

    it('passes date when provided', async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null })

      await api.anomalyCheck('2026-04-01')

      expect(mockRpc).toHaveBeenCalledWith('nf_anomaly_check', { p_date: '2026-04-01' })
    })
  })
})
