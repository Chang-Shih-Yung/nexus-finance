"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useRpc } from "@/hooks/useRpc"
import { useI18n } from '@/lib/i18n/context'

const DAY_LABELS_EN = ["M", "T", "W", "T", "F", "S", "S"]
const DAY_LABELS_ZH = ["一", "二", "三", "四", "五", "六", "日"]

export function WeeklyFitnessSummary() {
  const { t, locale } = useI18n()
  const DAY_LABELS = locale === "zh-TW" ? DAY_LABELS_ZH : DAY_LABELS_EN
  const { data, isLoading } = useRpc<
    { date: string; logins: number; transactions: number; success_rate: number }[]
  >(["stats-trend-7"], "nf_stats_trend", { p_days: 7 })

  const items = (data ?? []).slice(-7)

  // Normalize bar heights relative to max transaction count
  const maxTx = Math.max(...items.map(d => Number(d.transactions)), 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cards.weeklyFitnessSummary.title')}</CardTitle>
        <CardDescription>{t('cards.weeklyFitnessSummary.description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading ? (
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-md" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1.5">
            {items.map((day, index) => {
              const pct = Math.round((Number(day.transactions) / maxTx) * 100)
              return (
                <div
                  key={day.date}
                  className="rounded-md p-1.5 text-center ring ring-border"
                >
                  <div className="text-sm text-muted-foreground">{DAY_LABELS[index] ?? "?"}</div>
                  <div className="relative mt-1 h-16 overflow-hidden rounded-sm bg-muted">
                    <div
                      className="absolute inset-x-0 bottom-0 rounded-sm bg-chart-3"
                      style={{ height: `${pct}%` } as React.CSSProperties}
                    />
                  </div>
                  <div className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">{Number(day.transactions)}</div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button className="w-full">{t('cards.weeklyFitnessSummary.viewDetails')}</Button>
      </CardFooter>
    </Card>
  )
}
