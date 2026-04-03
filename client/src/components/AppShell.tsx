'use client'

import { useState, useEffect } from 'react'
import { Menu } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from '@/components/ui/popover'
import { ThemeCustomizerProvider } from '@/components/ThemeCustomizerProvider'
import ThemeCustomizerContent from '@/components/ThemeCustomizerContent'
import ThemeCustomizerBar from '@/components/ThemeCustomizerBar'

const sections = [
  { id: 'overview', label: '即時總覽' },
  { id: 'funnel', label: '使用者漏斗' },
  { id: 'errors', label: '錯誤監控' },
  { id: 'monitor', label: 'API 監控' },
  { id: 'ai-query', label: 'AI 查詢' },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [activeSection, setActiveSection] = useState('overview')
  const today = new Date().toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.find(e => e.isIntersecting)
        if (visible) setActiveSection(visible.target.id)
      },
      { rootMargin: '-20% 0px -60% 0px' }
    )
    sections.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  function scrollToSection(id: string) {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
      setActiveSection(id)
    }
  }

  return (
    <ThemeCustomizerProvider>
      {/* Outer page — muted bg on mobile to show card, plain bg on desktop */}
      <div className="h-dvh bg-muted/60 lg:bg-background flex overflow-hidden p-3 lg:p-0">

        {/* ── Desktop sidebar (≥1024px) ────────────────────────── */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-sidebar-border h-full overflow-hidden bg-sidebar">
          <div className="p-5 border-b border-sidebar-border shrink-0">
            <h1 className="text-lg font-semibold tracking-tight text-sidebar-foreground">
              <span className="text-sidebar-primary">Nexus</span> Finance
            </h1>
            <p className="text-xs text-sidebar-foreground/50 mt-0.5">RPC-first Banking Intelligence</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ThemeCustomizerContent />
          </div>
        </aside>

        {/* ── Main column ──────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden gap-3 lg:gap-0">

          {/* Header — outside cards on mobile, inside column on desktop */}
          <header className="shrink-0 lg:hidden px-1 flex items-center justify-between gap-4">
            {/* Mobile: hamburger nav */}
            <div className="flex items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="lg:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label="導航選單"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  align="start"
                  sideOffset={8}
                  className="p-1 w-44"
                >
                  {sections.map(({ id, label }) => (
                    <PopoverClose key={id} asChild>
                      <button
                        type="button"
                        onClick={() => scrollToSection(id)}
                        className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors ${
                          activeSection === id
                            ? 'bg-accent text-accent-foreground font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                        }`}
                      >
                        {label}
                      </button>
                    </PopoverClose>
                  ))}
                </PopoverContent>
              </Popover>

              <h2 className="text-base font-semibold text-foreground truncate">
                Nexus Finance
              </h2>
            </div>

            <div className="rounded-full bg-muted text-muted-foreground px-3 py-1 text-xs tracking-wide shrink-0">
              {today}
            </div>
          </header>

          {/* Content card — white rounded card on mobile, full-width on desktop */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-background
                          rounded-2xl border border-border shadow-sm
                          lg:rounded-none lg:border-0 lg:shadow-none">

          {/* Desktop header — inside card on desktop */}
          <header className="hidden lg:flex z-20 bg-background border-b border-border px-4 md:px-8 py-3 items-center justify-between gap-4 shrink-0">
            <h2 className="text-base font-semibold text-foreground truncate">Nexus Finance</h2>
            <div className="rounded-full bg-muted text-muted-foreground px-3 py-1 text-xs tracking-wide shrink-0">{today}</div>
          </header>

          {/* Tab nav — desktop only */}
          <nav
            className="hidden lg:block bg-background/95 border-b border-border shrink-0"
            aria-label="頁面區塊導航"
          >
            <div className="flex overflow-x-auto scrollbar-none px-4 md:px-8">
              {sections.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => scrollToSection(id)}
                  aria-current={activeSection === id ? 'true' : undefined}
                  className={`shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeSection === id
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </nav>

          {/* Page content */}
          <main className="flex-1 overflow-auto">
            <div className="px-4 md:px-8 py-6">
              {children}
            </div>
          </main>

          </div>{/* end content card */}

          {/* ── Customizer bar — separate card on mobile */}
          <ThemeCustomizerBar />

        </div>{/* end main column */}

      </div>
    </ThemeCustomizerProvider>
  )
}
