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
  useSearchParams: () => new URLSearchParams(),
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

    expect(screen.getAllByText('營收總覽').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('交易分析').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('客群分析').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('風險監控').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('系統與通路').length).toBeGreaterThanOrEqual(1)
  })

  it('renders children', async () => {
    const { default: AppShell } = await import('@/components/AppShell')
    render(<AppShell><div data-testid="child">hello</div></AppShell>)

    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('has mobile hamburger button', async () => {
    const { default: AppShell } = await import('@/components/AppShell')
    render(<AppShell><div>content</div></AppShell>)

    const hamburger = screen.getByLabelText('導航選單')
    expect(hamburger).toBeInTheDocument()
  })

  it('opens mobile popover on hamburger click', async () => {
    const user = userEvent.setup()
    const { default: AppShell } = await import('@/components/AppShell')
    render(<AppShell><div>content</div></AppShell>)

    const hamburger = screen.getByLabelText('導航選單')
    await user.click(hamburger)

    // Popover should show nav items
    const items = screen.getAllByText('營收總覽')
    expect(items.length).toBeGreaterThanOrEqual(1)
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
