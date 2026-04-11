'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import AiQuerySection from '@/components/sections/AiQuerySection'
import { useI18n } from '@/lib/i18n/context'

/**
 * Gemini-style 4-point sparkle icon.
 * Each arm is a curve that bulges concavely toward the center,
 * forming a soft 4-pointed star. Filled with a blue→purple→pink gradient.
 */
function GeminiSparkle({ className, size = 18 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="gemini-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4285F4" />
          <stop offset="50%" stopColor="#9B72F9" />
          <stop offset="100%" stopColor="#F26B8A" />
        </linearGradient>
      </defs>
      <path
        d="M12 1.5 C12 7.5 16.5 12 22.5 12 C16.5 12 12 16.5 12 22.5 C12 16.5 7.5 12 1.5 12 C7.5 12 12 7.5 12 1.5 Z"
        fill="url(#gemini-grad)"
      />
    </svg>
  )
}

export default function AiAssistantButton() {
  const { t } = useI18n()

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={t('dashboard.aiAssistant.open')}
          className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <GeminiSparkle size={18} />
        </button>
      </DialogTrigger>
      <DialogContent
        className="w-[calc(100%-2rem)] sm:max-w-3xl h-[min(80vh,720px)] flex flex-col p-0 gap-0 overflow-hidden"
      >
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <GeminiSparkle size={20} />
            {t('dashboard.aiAssistant.title')}
          </DialogTitle>
          <DialogDescription>
            {t('dashboard.aiAssistant.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 flex flex-col px-6 py-4 overflow-hidden">
          <AiQuerySection />
        </div>
      </DialogContent>
    </Dialog>
  )
}
