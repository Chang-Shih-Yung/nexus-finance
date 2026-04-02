'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/dashboard', icon: '📊', label: '即時總覽' },
  { href: '/dashboard/funnel', icon: '🔻', label: '使用者漏斗' },
  { href: '/dashboard/errors', icon: '⚠️', label: '錯誤監控' },
  { href: '/dashboard/monitor', icon: '🖥️', label: 'API 監控' },
  { href: '/ai-query', icon: '🤖', label: 'AI 查詢' },
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-700">
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-emerald-400">Nexus</span> Finance
          </h1>
          <p className="text-xs text-slate-400 mt-1">數據監控 + AI 查詢平台</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                pathname === item.href
                  ? 'bg-emerald-600/20 text-emerald-400'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={logout}
            className="w-full text-xs text-slate-400 hover:text-white transition text-left px-2 py-1 rounded hover:bg-slate-800"
          >
            登出
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            {titles[pathname] ?? 'Nexus Finance'}
          </h2>
          <div className="text-sm text-gray-500">{today}</div>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
