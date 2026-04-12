"use client"

import { Bar, BarChart, XAxis } from "recharts"
import { useRpc } from "@/hooks/useRpc"
import { useDateRange } from "@/hooks/useDateRange"
import { METRIC_KEYS } from "@/lib/metric-keys"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart"
import { Item, ItemContent, ItemDescription } from "@/components/ui/item"
import { Skeleton } from "@/components/ui/skeleton"
import { useI18n } from '@/lib/i18n/context'

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function getDateRange(offsetMonths: number) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 0)
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
}

export function ContributionHistory() {
  const { t } = useI18n()
  const chartConfig = {
    metric_value: { label: t('cards.contributionHistory.transactions'), color: "var(--chart-2)" },
  } satisfies ChartConfig
  const { days } = useDateRange()
  const { data: rawData, isLoading } = useRpc<Array<{ date: string; metric_value: number }>>(
    ["daily_trend", METRIC_KEYS.TXN_COUNT, String(days)],
    "nf_daily_trend",
    { p_metric_key: METRIC_KEYS.TXN_COUNT, p_days: days }
  )

  // Period compare for precise badge
  const current = getDateRange(0)
  const previous = getDateRange(-1)
  const { data: periodData } = useRpc<
    { current_total: number; previous_total: number; change_pct: number }[]
  >(["period-compare-txn-count"], "nf_period_compare", {
    p_metric_key: "txn_count",
    p_current_start: current.start,
    p_current_end: current.end,
    p_previous_start: previous.start,
    p_previous_end: previous.end,
  })

  // Aggregate daily data into monthly buckets for the bar chart
  const chartData = (() => {
    if (!rawData?.length) return []
    const buckets: Record<string, number> = {}
    for (const row of rawData) {
      const d = new Date(row.date)
      const label = MONTH_NAMES[d.getMonth()]
      buckets[label] = (buckets[label] ?? 0) + Number(row.metric_value)
    }
    return Object.entries(buckets).map(([month, metric_value]) => ({ month, metric_value }))
  })()

  const total = rawData?.reduce((s, r) => s + Number(r.metric_value), 0) ?? 0

  // Use period compare for change %
  const periodChangePct = periodData?.[0]?.change_pct
  const changePct = periodChangePct != null ? Number(periodChangePct) : 0
  const changeLabel = changePct >= 0 ? `+${changePct.toFixed(0)}%` : `${changePct.toFixed(0)}%`

  // Next scheduled date (just show tomorrow)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const nextDate = tomorrow.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cards.contributionHistory.title')}</CardTitle>
        <CardDescription>{t('cards.contributionHistory.description').replace('{{days}}', String(days))}</CardDescription>
        <CardAction>
          <Badge variant="secondary">{isLoading ? "..." : `${changeLabel} ${t('cards.contributionHistory.vsPriorPeriod')}`}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[200px] w-full rounded-lg" />
        ) : (
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <BarChart accessibilityLayer data={chartData} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
              <XAxis dataKey="month" tickLine={false} tickMargin={8} axisLine={false} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel className="min-w-40" />} />
              <Bar dataKey="metric_value" fill="var(--color-metric_value)" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-4">
        <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2">
          <Item variant="muted" className="flex-col items-stretch">
            <ItemContent className="gap-1">
              <ItemDescription className="text-xs font-medium tracking-wider text-muted-foreground uppercase">{t('cards.contributionHistory.total30d').replace('30', String(days))}</ItemDescription>
              <span className="text-lg font-semibold">{isLoading ? "..." : total.toLocaleString()}</span>
              <span className="text-sm text-muted-foreground">{t('cards.contributionHistory.transactions')}</span>
            </ItemContent>
          </Item>
          <Item variant="muted" className="flex-col items-stretch">
            <ItemContent className="gap-1">
              <ItemDescription className="text-xs font-medium tracking-wider text-muted-foreground uppercase">{t('cards.contributionHistory.nextBatch')}</ItemDescription>
              <span className="text-lg font-semibold">{nextDate}</span>
              <span className="text-sm text-muted-foreground">{t('cards.contributionHistory.scheduledDaily')}</span>
            </ItemContent>
          </Item>
        </div>
        <Button className="w-full">{t('cards.contributionHistory.viewFullReport')}</Button>
      </CardFooter>
    </Card>
  )
}
