"use client"

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import { Button } from "@/components/ui/button"
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { useRpc } from "@/hooks/useRpc"
import { useDateRange } from "@/hooks/useDateRange"
import { useI18n } from "@/lib/i18n/context"

export function BarChartCard() {
  const { t } = useI18n()
  const { days } = useDateRange()

  const barChartConfig = {
    success: { label: t('cards.barChartCard.success'), color: "var(--chart-1)" },
    failed: { label: t('cards.barChartCard.failed'), color: "var(--chart-2)" },
  } satisfies ChartConfig
  const { data: successData, isLoading: l1 } = useRpc<
    { date: string; metric_value: number }[]
  >(["success-trend", String(days)], "nf_daily_trend", {
    p_metric_key: "txn_count",
    p_days: days,
  })

  const { data: errorData, isLoading: l2 } = useRpc<
    { date: string; metric_value: number }[]
  >(["error-trend", String(days)], "nf_daily_trend", {
    p_metric_key: "error_count",
    p_days: days,
  })

  const isLoading = l1 || l2

  // Merge by date
  const merged = (successData ?? []).map((s, i) => {
    const e = (errorData ?? [])[i]
    return {
      date: new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      success: s.metric_value,
      failed: e?.metric_value ?? 0,
    }
  })

  const successTotal = merged.reduce((s, d) => s + d.success, 0)
  const failedTotal = merged.reduce((s, d) => s + d.failed, 0)
  const delta = failedTotal > 0 ? Math.round(((successTotal - failedTotal) / failedTotal) * 100) : 100
  const deltaPrefix = delta > 0 ? "+" : ""

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('cards.barChartCard.title')}</CardTitle>
        <CardDescription className="line-clamp-2 text-sm leading-snug">
          {t('cards.barChartCard.description').replace('{{days}}', String(days))}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-0">
        {isLoading ? (
          <Skeleton className="h-[180px] w-full" />
        ) : (
          <ChartContainer config={barChartConfig} className="max-h-[180px] w-full">
            <BarChart accessibilityLayer data={merged} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="date" tickLine={false} tickMargin={8} axisLine={false} tickFormatter={(v) => String(v).split(" ")[1] ?? v} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="success" fill="var(--color-success)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="failed" fill="var(--color-failed)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
        <div className="grid w-full grid-cols-3 divide-x divide-border/60">
          <div className="px-2 text-center">
            <div className="text-[0.65rem] text-muted-foreground uppercase">{t('cards.barChartCard.success')}</div>
            <div className="text-sm font-medium tabular-nums">{successTotal.toLocaleString()}</div>
          </div>
          <div className="px-2 text-center">
            <div className="text-[0.65rem] text-muted-foreground uppercase">{t('cards.barChartCard.failed')}</div>
            <div className="text-sm font-medium tabular-nums">{failedTotal.toLocaleString()}</div>
          </div>
          <div className="px-2 text-center">
            <div className="text-[0.65rem] text-muted-foreground uppercase">{t('cards.barChartCard.ratio')}</div>
            <div className="text-sm font-medium tabular-nums">{deltaPrefix}{delta}%</div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">{t('cards.barChartCard.viewReport')}</Button>
      </CardFooter>
    </Card>
  )
}
