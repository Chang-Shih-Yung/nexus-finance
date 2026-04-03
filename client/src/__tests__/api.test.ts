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
})
