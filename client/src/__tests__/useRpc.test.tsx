import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// Mock Supabase client
const mockRpc = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    rpc: mockRpc,
  }),
}))

const { useRpc } = await import('@/hooks/useRpc')

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

describe('useRpc', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches data from RPC and returns it', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ date: '2026-04-01', metric_value: 42 }],
      error: null,
    })

    const { result } = renderHook(
      () => useRpc<Array<{ date: string; metric_value: number }>>(
        ['test-key'],
        'nf_daily_trend',
        { p_metric_key: 'txn_count', p_days: 7 }
      ),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([{ date: '2026-04-01', metric_value: 42 }])
    expect(mockRpc).toHaveBeenCalledWith('nf_daily_trend', { p_metric_key: 'txn_count', p_days: 7 })
  })

  it('returns error state on RPC failure', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'unauthorized' },
    })

    const { result } = renderHook(
      () => useRpc(['fail-key'], 'nf_daily_trend', { p_metric_key: 'bad' }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error?.message).toBe('unauthorized')
  })

  it('starts in loading state', () => {
    mockRpc.mockReturnValue(new Promise(() => {})) // never resolves

    const { result } = renderHook(
      () => useRpc(['loading-key'], 'nf_daily_trend'),
      { wrapper: createWrapper() }
    )

    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()
  })

  it('calls RPC without params when none provided', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null })

    const { result } = renderHook(
      () => useRpc(['no-params'], 'nf_anomaly_check'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockRpc).toHaveBeenCalledWith('nf_anomaly_check', {})
  })
})
