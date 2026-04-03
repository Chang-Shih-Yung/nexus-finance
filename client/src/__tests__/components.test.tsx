import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
  }),
}))

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  }),
}))

describe('StatCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders number format correctly', async () => {
    const { default: StatCard } = await import('@/components/StatCard')
    render(<StatCard title="今日登入人數" value={42} format="number" />)
    expect(screen.getByText('今日登入人數')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('renders percent format with % sign', async () => {
    const { default: StatCard } = await import('@/components/StatCard')
    render(<StatCard title="成功率" value={95.5} format="percent" />)
    expect(screen.getByText('成功率')).toBeInTheDocument()
    expect(screen.getByText(/95\.5/)).toBeInTheDocument()
  })

  it('shows warning badge when warn is true', async () => {
    const { default: StatCard } = await import('@/components/StatCard')
    render(<StatCard title="成功率" value={50} format="percent" warn />)
    const warnEl = screen.getByText('需關注')
    expect(warnEl).toBeInTheDocument()
  })
})

describe('AppShell', () => {
  it('renders all nav items', async () => {
    const { default: AppShell } = await import('@/components/AppShell')
    render(<AppShell><div>content</div></AppShell>)

    expect(screen.getAllByText('即時總覽').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('使用者漏斗').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('錯誤監控').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('API 監控').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('AI 查詢').length).toBeGreaterThanOrEqual(1)
  })

  it('renders children', async () => {
    const { default: AppShell } = await import('@/components/AppShell')
    render(<AppShell><div data-testid="child">hello</div></AppShell>)

    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('renders logout button', async () => {
    const { default: AppShell } = await import('@/components/AppShell')
    render(<AppShell><div>content</div></AppShell>)

    expect(screen.getAllByText('登出').length).toBeGreaterThanOrEqual(1)
  })

  it('has mobile hamburger button', async () => {
    const { default: AppShell } = await import('@/components/AppShell')
    render(<AppShell><div>content</div></AppShell>)

    const hamburger = screen.getByLabelText('開啟選單')
    expect(hamburger).toBeInTheDocument()
  })

  it('opens mobile drawer on hamburger click', async () => {
    const user = userEvent.setup()
    const { default: AppShell } = await import('@/components/AppShell')
    render(<AppShell><div>content</div></AppShell>)

    const hamburger = screen.getByLabelText('開啟選單')
    await user.click(hamburger)

    const closeButton = screen.getByLabelText('關閉選單')
    expect(closeButton).toBeInTheDocument()
  })
})

describe('ChartCard', () => {
  it('renders title and children', async () => {
    const { default: ChartCard } = await import('@/components/ChartCard')
    render(
      <ChartCard title="Test Chart" height={200}>
        <div data-testid="chart-content">chart here</div>
      </ChartCard>
    )

    expect(screen.getByText('Test Chart')).toBeInTheDocument()
    expect(screen.getByTestId('chart-content')).toBeInTheDocument()
  })
})
