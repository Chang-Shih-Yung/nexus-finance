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

function NexusLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect width="28" height="28" rx="7" fill="currentColor" className="text-primary" />
      <path
        d="M8 20V8h2.4l5.6 8V8H18v12h-2.4L10 12v8H8Z"
        fill="white"
      />
    </svg>
  )
}

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
      {/* Outer page — muted bg + padding on all sizes */}
      <div className="h-dvh bg-muted/60 flex flex-col overflow-hidden p-3 gap-3">

        {/* ── Layer 1: Header — outside cards ───────────────────── */}
        <header className="shrink-0 flex items-center gap-3">

          {/* Mobile: hamburger nav */}
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

          {/* Logo only */}
          <NexusLogo />

          {/* Desktop: inline tab nav */}
          <nav className="hidden lg:flex items-center gap-1 ml-4" aria-label="頁面區塊導航">
            {sections.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => scrollToSection(id)}
                aria-current={activeSection === id ? 'true' : undefined}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  activeSection === id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          {/* Date — push to right */}
          <div className="ml-auto rounded-full bg-muted text-muted-foreground px-3 py-1 text-xs tracking-wide shrink-0">
            {today}
          </div>
        </header>

        {/* ── Layer 2: Middle — sidebar + content card ───────────── */}
        <div className="flex-1 min-h-0 flex gap-3 overflow-hidden">

          {/* Desktop sidebar — dark card with customizer options */}
          <aside className="hidden lg:flex w-56 shrink-0 flex-col overflow-hidden bg-[oklch(0.18_0_0)] rounded-2xl border border-white/10 shadow-xl">
            <div className="flex-1 overflow-y-auto">
              <ThemeCustomizerContent />
            </div>
          </aside>

          {/* Content card — white */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-background rounded-2xl border border-border shadow-sm">
            <main className="flex-1 overflow-auto scrollbar-none">
              <div className="px-4 md:px-8 py-6">
                {children}
              </div>
            </main>
          </div>
        </div>

        {/* ── Layer 3: Customizer bar card ─────────────────────── */}
        <ThemeCustomizerBar />

      </div>
    </ThemeCustomizerProvider>
  )
}
