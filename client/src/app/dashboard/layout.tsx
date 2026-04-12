'use client'

import { Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ThemeCustomizerProvider, useThemeCustomizer } from '@/components/ThemeCustomizerProvider'
import ThemeCustomizerContent, { ThemeCustomizerFooter } from '@/components/ThemeCustomizerContent'
import ThemeCustomizerBar from '@/components/ThemeCustomizerBar'
import AiAssistantButton from '@/components/AiAssistantButton'
import AiSettingsPanel from '@/components/ai-settings/AiSettingsPanel'
import DateRangePicker from '@/components/DateRangePicker'
import { DateRangeProvider } from '@/hooks/useDateRange'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useI18n } from '@/lib/i18n/context'

function LogoutButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const { t } = useI18n()

  async function handleLogout() {
    setBusy(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={busy}
      className="rounded-full bg-muted text-muted-foreground px-3 py-1 text-xs tracking-wide hover:text-foreground hover:bg-muted/80 transition-colors"
    >
      {busy ? t('dashboard.loggingOut') : t('dashboard.logout')}
    </button>
  )
}

function DashboardShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const { mounted } = useThemeCustomizer()

  return (
    <div
      className="h-dvh bg-background flex flex-col overflow-hidden p-3 gap-3 transition-opacity duration-150"
      style={{ opacity: mounted ? 1 : 0 }}
    >
      {/* ── Header ───────────── */}
      <header className="shrink-0 flex items-center gap-3 px-3 py-1.5">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <rect width="28" height="28" rx="7" fill="currentColor" className="text-primary" />
          <path d="M8 20V8h2.4l5.6 8V8H18v12h-2.4L10 12v8H8Z" fill="white" />
        </svg>
        <span className="hidden sm:inline text-sm font-semibold">Nexus Finance</span>
        <div className="ml-auto flex items-center gap-2">
          <AiAssistantButton />
          <DateRangePicker />
          <AiSettingsPanel />
          <LogoutButton />
        </div>
      </header>

      {/* ── Middle — sidebar + content ───────────── */}
      <div className="flex-1 min-h-0 flex gap-3 overflow-hidden">

        {/* Desktop sidebar — dark customizer panel */}
        <aside className="hidden lg:flex w-56 shrink-0 self-start flex-col overflow-auto scrollbar-none bg-neutral-950/90 backdrop-blur-xl rounded-2xl ring-1 ring-neutral-800/50 shadow-xl">
          <ThemeCustomizerContent />
          <ThemeCustomizerFooter />
        </aside>

        {/* Content area */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-background rounded-2xl shadow-sm">
          <main className="flex-1 overflow-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {children}
          </main>
        </div>
      </div>

      {/* ── Customizer bar (mobile) ─────────────────────── */}
      <ThemeCustomizerBar />
    </div>
  )
}

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense>
      <ThemeCustomizerProvider>
        <DateRangeProvider>
          <TooltipProvider>
            <DashboardShell>{children}</DashboardShell>
          </TooltipProvider>
        </DateRangeProvider>
      </ThemeCustomizerProvider>
    </Suspense>
  )
}
