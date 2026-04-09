"use client"

import { Area, AreaChart, XAxis } from "recharts"

import { Badge } from "@/components/ui/badge"
import {
  Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { useRpc } from "@/hooks/useRpc"
import { useI18n } from '@/lib/i18n/context'

const areaChartConfig = {
  success_rate: { label: "Success Rate", color: "var(--chart-1)" },
} satisfies ChartConfig

export function Visitors() {
  const { t } = useI18n()
  const now = new Date()
  const from = new Date(now.getTime() - 180 * 86400000).toISOString()
  const to = now.toISOString()

  const { data, isLoading } = useRpc<
    { date: string; total: number; success_count: number; success_rate: number }[]
  >(["transfer-success-rate-180"], "nf_stats_transfer_success_rate", {
    p_from: from, p_to: to,
  })

  const items = data ?? []

  const chartData = items.map(d => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    success_rate: Number(d.success_rate),
  }))

  const latest = items.length > 0 ? Number(items[items.length - 1].success_rate) : 0
  const previous = items.length > 1 ? Number(items[items.length - 2].success_rate) : latest
  const trendDelta = previous > 0 ? ((latest - previous) / previous * 100).toFixed(1) : "0"
  const trendPrefix = Number(trendDelta) > 0 ? "+" : ""

  return (
    <Card className="pb-0">
      <CardHeader>
        <CardTitle>{t('cards.visitors.title')}</CardTitle>
        <CardDescription>{t('cards.visitors.description')}</CardDescription>
        <CardAction>
          {isLoading ? <Skeleton className="h-5 w-24" /> : (
            <Badge variant={Number(trendDelta) >= 0 ? "secondary" : "destructive"}>
              {trendPrefix}{trendDelta}% {t('cards.visitors.vsLastDay')}
            </Badge>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
        {isLoading ? (
          <Skeleton className="mx-4 h-48 w-[calc(100%-2rem)]" />
        ) : (
          <ChartContainer config={areaChartConfig} className="h-48 w-full">
            <AreaChart
              accessibilityLayer
              data={chartData}
              margin={{ left: 0, right: 0, top: 6, bottom: 0 }}
            >
              <XAxis dataKey="date" tickLine={false} hide axisLine={false} tickMargin={6} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
              <Area
                dataKey="success_rate"
                type="natural"
                fill="var(--color-success_rate)"
                fillOpacity={0.15}
                stroke="var(--color-success_rate)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
