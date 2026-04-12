"use client"

import { Bar, BarChart, XAxis } from "recharts"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useRpc } from "@/hooks/useRpc"
import { useI18n } from '@/lib/i18n/context'

export function PowerUsage() {
  const { t } = useI18n()
  const chartConfig = {
    avg_latency: { label: t('cards.powerUsage.avgLatency'), color: "var(--chart-2)" },
  } satisfies ChartConfig
  const { data, isLoading } = useRpc<
    { minute: string; avg_latency: number; total_requests: number; error_count: number; error_rate: number }[]
  >(["api-health-60"], "nf_stats_api_health", { p_minutes: 60 })

  const items = data ?? []

  const chartData = items.map(d => ({
    minute: new Date(d.minute).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    avg_latency: Number(d.avg_latency),
  }))

  const latestLatency = items.length > 0 ? Number(items[items.length - 1].avg_latency) : 0
  const totalRequests = items.reduce((s, d) => s + Number(d.total_requests), 0)
  const totalErrors = items.reduce((s, d) => s + Number(d.error_count), 0)
  const overallErrorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0
  const healthPct = Math.max(0, 100 - overallErrorRate)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cards.powerUsage.title')}</CardTitle>
        <CardDescription>{t('cards.powerUsage.description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading ? (
          <Skeleton className="h-[140px] w-full" />
        ) : (
          <ChartContainer config={chartConfig} className="h-[140px] w-full">
            <BarChart data={chartData} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
              <XAxis dataKey="minute" tickLine={false} tickMargin={6} axisLine={false} className="text-xs" />
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="avg_latency" fill="var(--color-avg_latency)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
        <Separator />
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-muted-foreground">{t('cards.powerUsage.currentLatency')}</span>
            {isLoading ? <Skeleton className="h-6 w-16" /> : (
              <span className="text-lg font-semibold tabular-nums">{latestLatency.toFixed(0)} ms</span>
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-muted-foreground">{t('cards.powerUsage.requests1h')}</span>
            {isLoading ? <Skeleton className="h-6 w-16" /> : (
              <span className="text-lg font-semibold text-chart-1 tabular-nums">{totalRequests.toLocaleString()}</span>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start gap-1">
        <span className="text-sm text-muted-foreground">{t('cards.powerUsage.healthScore')}</span>
        <div className="flex w-full items-center gap-2">
          {isLoading ? <Skeleton className="h-2 flex-1" /> : (
            <>
              <Progress value={healthPct} className="flex-1" />
              <span className="text-sm font-medium tabular-nums">{healthPct.toFixed(0)}%</span>
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
