'use client'

import { useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { CalendarIcon } from '@/lib/icons'
import { useDateRange } from '@/hooks/useDateRange'
import { useI18n } from '@/lib/i18n/context'
import type { DateRange as RDPRange } from 'react-day-picker'

const PRESETS_ZH = [
  { label: '今天', days: 0 },
  { label: '近 7 天', days: 6 },
  { label: '近 30 天', days: 29 },
  { label: '近 90 天', days: 89 },
] as const

const PRESETS_EN = [
  { label: 'Today', days: 0 },
  { label: 'Last 7d', days: 6 },
  { label: 'Last 30d', days: 29 },
  { label: 'Last 90d', days: 89 },
] as const

export default function DateRangePicker() {
  const { range, setRange } = useDateRange()
  const { locale, t } = useI18n()
  const [open, setOpen] = useState(false)

  const presets = locale === 'zh-TW' ? PRESETS_ZH : PRESETS_EN

  function applyPreset(days: number) {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - days)
    setRange({ from, to })
    setOpen(false)
  }

  function handleSelect(r: RDPRange | undefined) {
    if (r?.from && r?.to) {
      setRange({ from: r.from, to: r.to })
    } else if (r?.from) {
      setRange({ from: r.from, to: r.from })
    }
  }

  const fmt = (d: Date) => d.toLocaleDateString(locale, { month: 'short', day: 'numeric' })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs font-normal text-muted-foreground hover:text-foreground"
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          <span>{fmt(range.from)} – {fmt(range.to)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex">
          {/* Presets sidebar */}
          <div className="flex flex-col gap-1 border-r p-3 min-w-[100px]">
            {presets.map(p => (
              <Button
                key={p.days}
                variant="ghost"
                size="sm"
                className="justify-start text-xs h-7"
                onClick={() => applyPreset(p.days)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          {/* Calendar */}
          <Calendar
            mode="range"
            selected={{ from: range.from, to: range.to }}
            onSelect={handleSelect}
            numberOfMonths={2}
            disabled={{ after: new Date() }}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
