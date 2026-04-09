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

const barChartConfig = {
  success: { label: "Success", color: "var(--chart-1)" },
  failed: { label: "Failed", color: "var(--chart-2)" },
} satisfies ChartConfig

export function BarChartCard() {
  const { data: successData, isLoading: l1 } = useRpc<
    { date: string; metric_value: number }[]
  >(["success-trend-30"], "nf_daily_trend", {
    p_metric_key: "txn_count",
    p_days: 30,
  })

  const { data: errorData, isLoading: l2 } = useRpc<
    { date: string; metric_value: number }[]
  >(["error-trend-30"], "nf_daily_trend", {
    p_metric_key: "error_count",
    p_days: 30,
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
        <CardTitle className="text-lg">Transaction Volume</CardTitle>
        <CardDescription className="line-clamp-2 text-sm leading-snug">
          Daily successful vs failed transactions for the last 30 days — compare
          volume and error rates at a glance.
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
            <div className="text-[0.65rem] text-muted-foreground uppercase">Success</div>
            <div className="text-sm font-medium tabular-nums">{successTotal.toLocaleString()}</div>
          </div>
          <div className="px-2 text-center">
            <div className="text-[0.65rem] text-muted-foreground uppercase">Failed</div>
            <div className="text-sm font-medium tabular-nums">{failedTotal.toLocaleString()}</div>
          </div>
          <div className="px-2 text-center">
            <div className="text-[0.65rem] text-muted-foreground uppercase">Ratio</div>
            <div className="text-sm font-medium tabular-nums">{deltaPrefix}{delta}%</div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">View report</Button>
      </CardFooter>
    </Card>
  )
}
