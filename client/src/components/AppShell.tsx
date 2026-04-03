'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  BarChart3,
  Bot,
  Gauge,
  LogOut,
  Menu,
  Moon,
  ShieldAlert,
  Sun,
  Waypoints,
  X,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: BarChart3, label: '即時總覽' },
  { href: '/dashboard/funnel', icon: Waypoints, label: '使用者漏斗' },
  { href: '/dashboard/errors', icon: ShieldAlert, label: '錯誤監控' },
  { href: '/dashboard/monitor', icon: Gauge, label: 'API 監控' },
  { href: '/ai-query', icon: Bot, label: 'AI 查詢' },
]

const titles: Record<string, string> = {
  '/dashboard': '即時總覽',
  '/dashboard/funnel': '使用者漏斗',
  '/dashboard/errors': '錯誤監控',
  '/dashboard/monitor': 'API 監控',
  '/ai-query': 'AI 查詢',
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-9 h-9" />
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label={theme === 'dark' ? '切換為淺色模式' : '切換為深色模式'}
      className="h-9 w-9"
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}

function SidebarNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const router = useRouter()

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-xl font-semibold tracking-tight">
          <span className="text-sidebar-primary">Nexus</span> Finance
        </h1>
        <p className="text-xs text-sidebar-foreground/50 mt-1">RPC-first Banking Intelligence</p>
      </div>
      <nav className="flex-1 p-4 space-y-1" aria-label="主要導航">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={pathname === item.href ? 'page' : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all min-h-11 ${
              pathname === item.href
                ? 'bg-sidebar-accent text-sidebar-accent-foreground ring-1 ring-sidebar-primary/40'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-border/30 hover:text-sidebar-foreground'
            }`}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <Button
          onClick={logout}
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-border/30 min-h-11"
        >
          <LogOut className="h-4 w-4" />
          登出
        </Button>
      </div>
    </div>
  )
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const today = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })

  // Close drawer on ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Close drawer on route change
  useEffect(() => setDrawerOpen(false), [pathname])

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar — visible ≥1024px */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-sidebar-border">
        <SidebarNav pathname={pathname} />
      </aside>

      {/* Mobile drawer backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 flex flex-col transition-transform duration-300 lg:hidden ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-modal={drawerOpen ? true : undefined}
        aria-label="主要導航"
      >
        <div className="flex items-center justify-end p-3 bg-sidebar border-b border-sidebar-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDrawerOpen(false)}
            aria-label="關閉選單"
            className="h-9 w-9 text-sidebar-foreground hover:bg-sidebar-border/30"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <SidebarNav pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto">
        <header className="sticky top-0 z-10 backdrop-blur bg-background/80 border-b border-border px-4 md:px-8 py-4 flex items-center justify-between gap-4">
          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden h-9 w-9 shrink-0"
            aria-label="開啟選單"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h2 className="text-base font-semibold text-foreground flex-1 truncate">
            {titles[pathname] ?? 'Nexus Finance'}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />
            <div className="hidden sm:block rounded-full bg-muted text-muted-foreground px-3 py-1 text-xs tracking-wide">
              {today}
            </div>
          </div>
        </header>
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  )
}
