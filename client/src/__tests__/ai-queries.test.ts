import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase client
const mockRpc = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    rpc: mockRpc,
  }),
}))

const { runAiTemplateQuery } = await import('@/lib/ai-queries')

describe('AI Query Template Matching', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('pattern matching', () => {
    it('matches VIP success rate this month', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ date: '2026-04-01', success_rate: 95, total: 10 }],
        error: null,
      })

      const result = await runAiTemplateQuery('這個月 VIP 客戶的轉帳成功率多少？')

      expect(mockRpc).toHaveBeenCalledWith('nf_ai_vip_success_rate', expect.any(Object))
      expect(result.answer).toContain('VIP')
      expect(result.answer).toContain('成功率')
      expect(result.chartConfig?.type).toBe('line')
    })

    it('matches VIP query with 本月 variant', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ date: '2026-04-01', success_rate: 90, total: 5 }],
        error: null,
      })

      const result = await runAiTemplateQuery('VIP 本月轉帳成功率如何')

      expect(mockRpc).toHaveBeenCalledWith('nf_ai_vip_success_rate', expect.any(Object))
      expect(result.answer).toContain('VIP')
    })

    it('matches yesterday failed transactions', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [
          { user_name: '王小明', error_code: 'E_TIMEOUT', amount: 50000 },
          { user_name: '李小美', error_code: 'E_BALANCE', amount: 10000 },
        ],
        error: null,
      })

      const result = await runAiTemplateQuery('昨天哪些客戶轉帳失敗了？')

      expect(mockRpc).toHaveBeenCalledWith('nf_stats_failed_transactions', expect.any(Object))
      expect(result.answer).toContain('2 筆失敗交易')
    })

    it('handles no yesterday failures', async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null })

      const result = await runAiTemplateQuery('昨天哪些客戶轉帳失敗了？')

      expect(result.answer).toBe('昨天沒有失敗交易。')
    })

    it('matches weekly logins', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [
          { date: '2026-03-28', count: 10 },
          { date: '2026-03-29', count: 25 },
        ],
        error: null,
      })

      const result = await runAiTemplateQuery('過去一週每天登入人數趨勢')

      expect(mockRpc).toHaveBeenCalledWith('nf_stats_daily_logins', expect.any(Object))
      expect(result.answer).toContain('25')
      expect(result.chartConfig?.type).toBe('bar')
    })

    it('matches last month top transfer users', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [
          { user_name: '張大華', total_amount: 500000 },
          { user_name: '王小明', total_amount: 300000 },
        ],
        error: null,
      })

      const result = await runAiTemplateQuery('上個月轉帳金額最高的前 10 位客戶')

      expect(mockRpc).toHaveBeenCalledWith('nf_ai_top_transfer_users', expect.any(Object))
      expect(result.answer).toContain('張大華')
      expect(result.chartConfig?.type).toBe('bar')
    })

    it('matches recent 30 day errors', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [
          { error_code: 'E_TIMEOUT', count: 42 },
          { error_code: 'E_BALANCE', count: 15 },
        ],
        error: null,
      })

      const result = await runAiTemplateQuery('最近 30 天哪個錯誤代碼最常出現？')

      expect(mockRpc).toHaveBeenCalledWith('nf_stats_error_breakdown', expect.any(Object))
      expect(result.answer).toContain('E_TIMEOUT')
      expect(result.answer).toContain('42')
      expect(result.chartConfig?.type).toBe('pie')
    })

    it('matches dormant users', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [
          { user_name: '黃志誠', inactive_days: 14 },
          { user_name: '李小美', inactive_days: 10 },
        ],
        error: null,
      })

      const result = await runAiTemplateQuery('哪些客戶超過 7 天沒有登入了？')

      expect(mockRpc).toHaveBeenCalledWith('nf_ai_dormant_users', expect.any(Object))
      expect(result.answer).toContain('2 位')
      expect(result.answer).toContain('14 天')
    })
  })

  describe('fallback', () => {
    it('returns fallback message for unrecognized queries', async () => {
      const result = await runAiTemplateQuery('今天天氣如何？')

      expect(mockRpc).not.toHaveBeenCalled()
      expect(result.answer).toContain('目前支援的自然語言查詢')
    })

    it('returns fallback for empty string', async () => {
      const result = await runAiTemplateQuery('')

      expect(mockRpc).not.toHaveBeenCalled()
      expect(result.answer).toContain('目前支援')
    })

    it('returns fallback for partial keyword match', async () => {
      // Has 'vip' but missing '成功率' and month keywords
      const result = await runAiTemplateQuery('VIP 客戶有幾個')

      expect(mockRpc).not.toHaveBeenCalled()
      expect(result.answer).toContain('目前支援')
    })
  })

  describe('response formatting', () => {
    it('VIP query calculates weighted success rate correctly', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [
          { date: '2026-04-01', success_rate: 100, total: 10 },
          { date: '2026-04-02', success_rate: 50, total: 10 },
        ],
        error: null,
      })

      const result = await runAiTemplateQuery('這個月 VIP 客戶的轉帳成功率多少？')

      // Weighted: (100*10 + 50*10) / 20 = 75
      expect(result.answer).toContain('75')
    })

    it('VIP query handles zero transactions', async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null })

      const result = await runAiTemplateQuery('這個月 VIP 客戶的轉帳成功率多少？')

      expect(result.answer).toContain('0%')
      expect(result.answer).toContain('0 筆')
    })

    it('handles no 30-day errors', async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null })

      const result = await runAiTemplateQuery('最近 30 天哪個錯誤代碼最常出現？')

      expect(result.answer).toBe('最近 30 天沒有失敗交易錯誤。')
    })

    it('handles no dormant users', async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null })

      const result = await runAiTemplateQuery('哪些客戶超過 7 天沒有登入了？')

      expect(result.answer).toBe('目前沒有超過 7 天未登入的客戶。')
    })

    it('handles no last month top transfers', async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null })

      const result = await runAiTemplateQuery('上個月轉帳金額最高的前 10 位客戶')

      expect(result.answer).toBe('上個月沒有符合條件的轉帳資料。')
    })
  })
})
