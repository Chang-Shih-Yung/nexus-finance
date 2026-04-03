'use client'

import { useState, useEffect, useRef } from 'react'
import { Paintbrush } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ThemeCustomizerContent from '@/components/ThemeCustomizerContent'
import ThemeCustomizer from '@/components/ThemeCustomizer'

const sections = [
  { id: 'overview', label: '即時總覽' },
  { id: 'funnel', label: '使用者漏斗' },
  { id: 'errors', label: '錯誤監控' },
  { id: 'monitor', label: 'API 監控' },
  { id: 'ai-query', label: 'AI 查詢' },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [activeSection, setActiveSection] = useState('overview')
  const [themeOpen, setThemeOpen] = useState(false)
  const today = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })
  const tabBarRef = useRef<HTMLElement>(null)

  // 監聽哪個 section 在視窗中
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
    <div className="min-h-screen bg-background flex">
      {/* ── 桌面版左側欄 (≥1024px) ─────────────────────────── */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-sidebar-border sticky top-0 h-screen overflow-hidden bg-sidebar">
        {/* 品牌標題 */}
        <div className="p-5 border-b border-sidebar-border shrink-0">
          <h1 className="text-lg font-semibold tracking-tight text-sidebar-foreground">
            <span className="text-sidebar-primary">Nexus</span> Finance
          </h1>
          <p className="text-xs text-sidebar-foreground/50 mt-0.5">RPC-first Banking Intelligence</p>
        </div>

        {/* ThemeCustomizer 內容 (可捲動) */}
        <div className="flex-1 overflow-y-auto">
          <ThemeCustomizerContent />
        </div>
      </aside>

      {/* 手機版 bottom sheet */}
      <ThemeCustomizer open={themeOpen} onOpenChange={setThemeOpen} />

      {/* ── 主內容區 ────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* 頂部 header */}
        <header className="sticky top-0 z-20 backdrop-blur bg-background/80 border-b border-border px-4 md:px-8 py-3 flex items-center justify-between gap-4 shrink-0">
          {/* 手機版畫筆按鈕 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setThemeOpen(true)}
            className="lg:hidden h-9 w-9 shrink-0"
            aria-label="開啟主題自訂"
          >
            <Paintbrush className="h-4 w-4" />
          </Button>

          <h2 className="text-base font-semibold text-foreground flex-1 truncate">
            Nexus Finance
          </h2>

          <div className="hidden sm:block rounded-full bg-muted text-muted-foreground px-3 py-1 text-xs tracking-wide shrink-0">
            {today}
          </div>
        </header>

        {/* Tab 導航列 */}
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

        {/* 頁面內容 */}
        <main className="flex-1 overflow-auto">
          <div className="px-4 md:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
