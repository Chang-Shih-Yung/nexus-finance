'use client'

import { useState, useEffect, useRef } from 'react'
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
  const tabBarRef = useRef<HTMLElement>(null)

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
      <div className="min-h-screen bg-background flex">

        {/* ── Desktop sidebar (≥1024px) ────────────────────────── */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-sidebar-border sticky top-0 h-screen overflow-hidden bg-sidebar">
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

        {/* ── Main content ─────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col">

          {/* Header */}
          <header className="sticky top-0 z-20 backdrop-blur bg-background/80 border-b border-border px-4 md:px-8 py-3 flex items-center justify-between gap-4 shrink-0">
            <h2 className="text-base font-semibold text-foreground truncate">
              Nexus Finance
            </h2>
            <div className="hidden sm:block rounded-full bg-muted text-muted-foreground px-3 py-1 text-xs tracking-wide shrink-0">
              {today}
            </div>
          </header>

          {/* Tab nav */}
          <nav
            ref={tabBarRef}
            className="sticky top-[57px] z-10 bg-background/95 backdrop-blur border-b border-border shrink-0"
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

          {/* Page content — pb-24 on mobile to clear the bottom bar */}
          <main className="flex-1 overflow-auto">
            <div className="px-4 md:px-8 pb-24 lg:pb-8">
              {children}
            </div>
          </main>
        </div>

        {/* ── Mobile bottom bar (<1024px) ──────────────────────── */}
        <ThemeCustomizerBar />

      </div>
    </ThemeCustomizerProvider>
  )
}
