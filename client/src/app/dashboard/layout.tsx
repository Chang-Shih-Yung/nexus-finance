'use client'

import { Suspense } from 'react'
import { ThemeCustomizerProvider, useThemeCustomizer } from '@/components/ThemeCustomizerProvider'
import ThemeCustomizerContent, { ThemeCustomizerFooter } from '@/components/ThemeCustomizerContent'
import ThemeCustomizerBar from '@/components/ThemeCustomizerBar'
import { TooltipProvider } from '@/components/ui/tooltip'

function DashboardShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const { mounted } = useThemeCustomizer()

  return (
    <div
      className="h-dvh bg-background flex flex-col overflow-hidden p-3 gap-3 transition-opacity duration-150"
      style={{ opacity: mounted ? 1 : 0 }}
    >
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
        <TooltipProvider>
          <DashboardShell>{children}</DashboardShell>
        </TooltipProvider>
      </ThemeCustomizerProvider>
    </Suspense>
  )
}
