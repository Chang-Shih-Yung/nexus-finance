"use client"

import { Area, AreaChart, XAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { useRpc } from "@/hooks/useRpc"
import { useI18n } from "@/lib/i18n/context"

function formatCompact(amount: number, locale: string) {
  if (Math.abs(amount) >= 1_000_000) {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "TWD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount)
  }
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function LiveWaveformCard() {
  const { t, locale } = useI18n()

  const chartConfig = {
    total_revenue: { label: t('cards.liveWaveform.revenue'), color: "var(--chart-1)" },
  } satisfies ChartConfig

  const { data: summary, isLoading: loadingSummary } = useRpc<{
    total_revenue: number
    interest_income: number
    fee_income: number
    daily_avg: number
    prev_total: number
    change_pct: number
  }>(
    ["revenue-summary"],
    "nf_revenue_summary",
    { p_days: 30 },
    { select: (rows: any) => (Array.isArray(rows) ? rows[0] : rows) ?? null },
  )

  const { data: trend, isLoading: loadingTrend } = useRpc<
    { date: string; total_revenue: number }[]
  >(["revenue-trend"], "nf_revenue_trend", { p_days: 30 })

  const chartData = (trend ?? []).map((d) => ({
    date: d.date,
    total_revenue: d.total_revenue,
  }))

  const changePct = summary?.change_pct ?? 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cards.liveWaveform.title')}</CardTitle>
        <CardDescription>{t('cards.liveWaveform.description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {loadingSummary ? (
          <Skeleton className="h-10 w-36" />
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums">
              {formatCompact(summary?.total_revenue ?? 0, locale)}
            </span>
            <Badge variant={changePct >= 0 ? "secondary" : "destructive"}>
              {changePct >= 0 ? "+" : ""}
              {changePct.toFixed(1)}%
            </Badge>
          </div>
        )}

        {loadingTrend ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <ChartContainer config={chartConfig} className="h-24 w-full">
            <AreaChart
              data={chartData}
              margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--color-total_revenue)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-total_revenue)"
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                tickFormatter={(v) => String(v).slice(5)}
                className="text-[10px]"
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Area
                type="monotone"
                dataKey="total_revenue"
                stroke="var(--color-total_revenue)"
                fill="url(#revGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}

        {loadingSummary ? (
          <Skeleton className="h-4 w-full" />
        ) : (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t('cards.liveWaveform.interestIncome')} {formatCompact(summary?.interest_income ?? 0, locale)}</span>
            <span>{t('cards.liveWaveform.feeIncome')} {formatCompact(summary?.fee_income ?? 0, locale)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
