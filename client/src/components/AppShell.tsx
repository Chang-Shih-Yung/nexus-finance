'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { BarChart3, Bot, Gauge, LogOut, ShieldAlert, Waypoints } from 'lucide-react'

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

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const today = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#f5fff8_0%,_#f7f9ff_45%,_#ffffff_100%)] flex">
      <aside className="w-72 bg-slate-950 text-slate-100 flex flex-col shrink-0 border-r border-slate-800/70">
        <div className="p-6 border-b border-slate-800/70">
          <h1 className="text-xl font-semibold tracking-tight">
            <span className="text-emerald-400">Nexus</span> Finance
          </h1>
          <p className="text-xs text-slate-400 mt-1">RPC-first Banking Intelligence</p>
        </div>
        <nav className="flex-1 p-4 space-y-1.5">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                pathname === item.href
                  ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800/70">
          <Button
            onClick={logout}
            variant="ghost"
            className="w-full justify-start text-slate-300 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            登出
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 backdrop-blur bg-white/80 border-b border-slate-200 px-8 py-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {titles[pathname] ?? 'Nexus Finance'}
          </h2>
          <div className="rounded-full bg-slate-900 text-slate-100 px-3 py-1 text-xs tracking-wide">
            {today}
          </div>
        </header>
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
