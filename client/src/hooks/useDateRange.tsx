'use client'

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'

export interface DateRange {
  from: Date
  to: Date
}

interface DateRangeCtx {
  range: DateRange
  setRange: (r: DateRange) => void
  /** ISO string for RPC params */
  fromISO: string
  toISO: string
  /** Number of days in range */
  days: number
}

function defaultRange(): DateRange {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 29)
  return { from, to }
}

function toISO(d: Date) {
  return d.toISOString().slice(0, 10)
}

function daysBetween(a: Date, b: Date) {
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1)
}

const Ctx = createContext<DateRangeCtx | null>(null)

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [range, setRangeRaw] = useState<DateRange>(defaultRange)

  const setRange = useCallback((r: DateRange) => {
    setRangeRaw({ from: r.from, to: r.to })
  }, [])

  const ctx = useMemo<DateRangeCtx>(() => ({
    range,
    setRange,
    fromISO: toISO(range.from),
    toISO: toISO(range.to),
    days: daysBetween(range.from, range.to),
  }), [range, setRange])

  return <Ctx value={ctx}>{children}</Ctx>
}

export function useDateRange() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useDateRange must be inside DateRangeProvider')
  return ctx
}
