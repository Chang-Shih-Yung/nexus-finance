import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase client — runAiQuery goes through invokeRpc → supabase.rpc
const mockRpc = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    rpc: mockRpc,
  }),
}))

const { runAiQuery } = await import('@/lib/ai-queries')

describe('runAiQuery (nf_ai_ask dispatcher)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('forwards the question to nf_ai_ask as p_question', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        answer: '最近 30 天總營收為 9,306 萬元。',
        rpc_called: 'nf_revenue_summary',
        params: {},
        data: [{ total_revenue: 93068203.43, interest_income: 70905863.88, fee_income: 22162339.55 }],
        chart: null,
        follow_ups: [
          { label: '看每日趨勢', question: '最近 30 天每日營收趨勢' },
          { label: '按產品拆解', question: '最近 30 天各產品線營收' },
        ],
      },
      error: null,
    })

    const result = await runAiQuery('最近 30 天的營收總覽')

    expect(mockRpc).toHaveBeenCalledWith('nf_ai_ask', { p_question: '最近 30 天的營收總覽' })
    expect(result.answer).toContain('9,306')
    expect(result.rpcCalled).toBe('nf_revenue_summary')
    expect(result.data).toHaveLength(1)
    expect(result.data?.[0]?.total_revenue).toBe(93068203.43)
    expect(result.chartConfig).toBeUndefined()
    expect(result.followUps).toHaveLength(2)
    expect(result.followUps?.[0]?.label).toBe('看每日趨勢')
    expect(result.followUps?.[0]?.question).toBe('最近 30 天每日營收趨勢')
  })

  it('builds a line chart from a trend response', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        answer: '營收整體呈上升趨勢。',
        rpc_called: 'nf_revenue_trend',
        params: { p_days: 7 },
        data: [
          { date: '2026-04-01', total_revenue: 100 },
          { date: '2026-04-02', total_revenue: 120 },
          { date: '2026-04-03', total_revenue: 115 },
        ],
        chart: { type: 'line', x_field: 'date', y_field: 'total_revenue' },
      },
      error: null,
    })

    const result = await runAiQuery('最近一週每日營收趨勢')

    expect(result.chartConfig?.type).toBe('line')
    expect(result.chartConfig?.data.labels).toEqual(['2026-04-01', '2026-04-02', '2026-04-03'])
    expect(result.chartConfig?.data.datasets[0]?.data).toEqual([100, 120, 115])
    expect(result.rpcCalled).toBe('nf_revenue_trend')
    expect(result.data).toHaveLength(3)
  })

  it('builds a bar chart from a distribution response', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        answer: '房貸佔比最高。',
        rpc_called: 'nf_loan_by_type',
        params: {},
        data: [
          { loan_type: '房貸', total_outstanding: 500000 },
          { loan_type: '信貸', total_outstanding: 200000 },
          { loan_type: '車貸', total_outstanding: 100000 },
        ],
        chart: { type: 'bar', x_field: 'loan_type', y_field: 'total_outstanding' },
      },
      error: null,
    })

    const result = await runAiQuery('各類別放款分佈')

    expect(result.chartConfig?.type).toBe('bar')
    expect(result.chartConfig?.data.labels).toEqual(['房貸', '信貸', '車貸'])
    expect(result.chartConfig?.data.datasets[0]?.data).toEqual([500000, 200000, 100000])
    expect(result.data).toHaveLength(3)
  })

  it('builds a pie chart from a breakdown response', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        answer: 'Web 通路佔比約 45%。',
        rpc_called: 'nf_channel_distribution',
        params: { p_days: 7 },
        data: [
          { channel: 'web', pct: 45 },
          { channel: 'mobile', pct: 40 },
          { channel: 'atm', pct: 15 },
        ],
        chart: { type: 'pie', x_field: 'channel', y_field: 'pct' },
      },
      error: null,
    })

    const result = await runAiQuery('通路分佈')

    expect(result.chartConfig?.type).toBe('pie')
    expect(result.chartConfig?.data.labels).toEqual(['web', 'mobile', 'atm'])
    expect(result.chartConfig?.data.datasets[0]?.data).toEqual([45, 40, 15])
  })

  it('skips chart when x_field is missing from rows but still returns data', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        answer: 'ok',
        rpc_called: 'nf_revenue_summary',
        params: {},
        data: [{ total_revenue: 100 }],
        chart: { type: 'line', x_field: 'missing', y_field: 'total_revenue' },
      },
      error: null,
    })

    const result = await runAiQuery('營收')
    expect(result.chartConfig).toBeUndefined()
    expect(result.data).toHaveLength(1)
  })

  it('returns raw single-row data for KPI rendering when chart hint is null', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        answer: '放款總額為 10 億。',
        rpc_called: 'nf_loan_portfolio',
        params: {},
        data: [{ total_outstanding: 1000000000, npl_ratio: 2.3 }],
        chart: null,
      },
      error: null,
    })

    const result = await runAiQuery('放款組合')
    expect(result.chartConfig).toBeUndefined()
    expect(result.rpcCalled).toBe('nf_loan_portfolio')
    expect(result.data?.[0]?.total_outstanding).toBe(1000000000)
    expect(result.data?.[0]?.npl_ratio).toBe(2.3)
  })

  it('returns friendly redirect with follow-ups when LLM rpc_called is null', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        answer: '這個問題我沒有資料可以回答。不過我可以幫你看今日營運快照、過去 7 天詐欺警報，或本季分行排名，要看哪個？',
        rpc_called: null,
        params: null,
        data: null,
        chart: null,
        follow_ups: [
          { label: '今日快照', question: '今天營運狀況' },
          { label: '詐欺警報', question: '過去 7 天詐欺警報統計' },
          { label: '分行排名', question: '本季分行營收排名' },
        ],
      },
      error: null,
    })

    const result = await runAiQuery('今天天氣如何？')
    expect(result.answer).toContain('沒有資料')
    expect(result.rpcCalled).toBeUndefined()
    expect(result.data).toBeUndefined()
    expect(result.chartConfig).toBeUndefined()
    expect(result.followUps).toHaveLength(3)
    expect(result.followUps?.[1]?.label).toBe('詐欺警報')
  })

  it('drops malformed follow_up entries and caps at 4', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        answer: 'ok',
        rpc_called: 'nf_today_snapshot',
        params: {},
        data: [{ snapshot_date: '2026-04-10', login_count: 1234 }],
        chart: null,
        follow_ups: [
          { label: 'valid', question: '有問題' },
          { label: '', question: '沒 label 要丟掉' },
          { label: '沒 question', question: '' },
          null,
          { label: 'v2', question: 'q2' },
          { label: 'v3', question: 'q3' },
          { label: 'v4', question: 'q4' },
          { label: 'over', question: '第五個要被砍' },
        ],
      },
      error: null,
    })

    const result = await runAiQuery('今天狀況')
    expect(result.followUps).toHaveLength(4)
    expect(result.followUps?.map(f => f.label)).toEqual(['valid', 'v2', 'v3', 'v4'])
  })

  it('surfaces error field from nf_ai_ask', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        error: 'groq_api_key not configured in vault.secrets',
      },
      error: null,
    })

    const result = await runAiQuery('隨便問')
    expect(result.answer).toContain('AI 查詢失敗')
    expect(result.answer).toContain('groq_api_key')
  })

  it('surfaces RPC whitelist rejection', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        error: 'RPC not in whitelist',
        attempted: 'nf_drop_everything',
      },
      error: null,
    })

    const result = await runAiQuery('幹壞事')
    expect(result.answer).toContain('RPC not in whitelist')
    expect(result.answer).toContain('nf_drop_everything')
  })

  it('surfaces Supabase client errors', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'permission denied' },
    })

    const result = await runAiQuery('任何問題')
    expect(result.answer).toContain('查詢失敗')
    expect(result.answer).toContain('permission denied')
  })

  it('rejects empty input without calling the RPC', async () => {
    const result = await runAiQuery('   ')
    expect(mockRpc).not.toHaveBeenCalled()
    expect(result.answer).toContain('請輸入')
  })
})
