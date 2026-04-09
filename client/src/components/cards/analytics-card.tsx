"use client"

import { Area, AreaChart } from "recharts"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card, CardAction, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { useRpc } from "@/hooks/useRpc"

const chartConfig = {
  logins: { label: "Logins", color: "var(--chart-1)" },
} satisfies ChartConfig

export function AnalyticsCard() {
  const now = new Date()
  const from = new Date(now.getTime() - 180 * 86400000).toISOString()
  const to = now.toISOString()

  const { data, isLoading } = useRpc<
    { date: string; count: number }[]
  >(["daily-logins-180"], "nf_stats_daily_logins", {
    p_from: from, p_to: to,
  })

  const chartData = (data ?? []).map(d => ({
    month: new Date(d.date).toLocaleDateString("en-US", { month: "short" }),
    logins: Number(d.count),
  }))

  const total = chartData.reduce((s, d) => s + d.logins, 0)
  const half = Math.floor(chartData.length / 2)
  const firstHalf = chartData.slice(0, half).reduce((s, d) => s + d.logins, 0)
  const secondHalf = chartData.slice(half).reduce((s, d) => s + d.logins, 0)
  const pctChange = firstHalf > 0 ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100) : 0
  const pctPrefix = pctChange > 0 ? "+" : ""

  return (
    <Card className="mx-auto w-full max-w-sm data-[size=sm]:pb-0" size="sm">
      <CardHeader>
        <CardTitle>Analytics</CardTitle>
        <CardDescription>
          {isLoading ? (
            <Skeleton className="h-4 w-32 inline-block" />
          ) : (
            <>{total.toLocaleString()} Logins <Badge>{pctPrefix}{pctChange}%</Badge></>
          )}
        </CardDescription>
        <CardAction>
          <Button variant="outline" size="sm">View Analytics</Button>
        </CardAction>
      </CardHeader>
      {isLoading ? (
        <Skeleton className="mx-4 mb-4 h-[80px]" />
      ) : (
        <ChartContainer config={chartConfig} className="aspect-[1/0.35]">
          <AreaChart accessibilityLayer data={chartData} margin={{ left: 0, right: 0 }}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" hideLabel />} />
            <Area dataKey="logins" type="linear" fill="var(--color-logins)" fillOpacity={0.4} stroke="var(--color-logins)" />
          </AreaChart>
        </ChartContainer>
      )}
    </Card>
  )
}
