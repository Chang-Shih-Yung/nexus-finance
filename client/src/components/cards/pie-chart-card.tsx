"use client"

import { Label, Pie, PieChart } from "recharts"

import { Badge } from "@/components/ui/badge"
import {
  Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { useRpc } from "@/hooks/useRpc"

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]

export function PieChartCard() {
  const { data, isLoading } = useRpc<
    { dimension_value: string; metric_value: number }[]
  >(["txn-by-tier"], "nf_current_breakdown", {
    p_metric_key: "txn_count",
    p_dimension: "tier",
  })

  const items = (data ?? []).map((d, i) => ({
    tier: d.dimension_value,
    count: d.metric_value,
    fill: COLORS[i % COLORS.length],
  }))

  const totalCount = items.reduce((s, d) => s + d.count, 0)
  const top = items.length > 0
    ? items.reduce((max, d) => (d.count > max.count ? d : max))
    : null
  const topShare = top && totalCount > 0 ? Math.round((top.count / totalCount) * 100) : 0

  const pieChartConfig: ChartConfig = {
    count: { label: "Transactions" },
    ...Object.fromEntries(items.map((d, i) => [
      d.tier, { label: d.tier, color: COLORS[i % COLORS.length] },
    ])),
  }

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle>Tier Distribution</CardTitle>
        <CardDescription>Transaction count by user tier</CardDescription>
        <CardAction>
          {top && <Badge variant="outline" className="capitalize">{top.tier}</Badge>}
        </CardAction>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="mx-auto flex aspect-square max-h-[190px] items-center justify-center">
            <Skeleton className="size-[160px] rounded-full" />
          </div>
        ) : (
          <ChartContainer config={pieChartConfig} className="mx-auto aspect-square max-h-[190px]">
            <PieChart>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Pie data={items} dataKey="count" nameKey="tier" innerRadius={50} strokeWidth={5}>
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={viewBox.cy! - 16} className="fill-foreground text-2xl font-bold">
                            {totalCount.toLocaleString()}
                          </tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 4} className="fill-muted-foreground text-xs">
                            Transactions
                          </tspan>
                        </text>
                      )
                    }
                  }}
                />
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="tier" />} className="translate-y-2" />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2">
        <div className="flex items-center text-xs">
          <span className="font-medium capitalize">{top?.tier ?? "—"}</span>
          <span className="ml-auto text-muted-foreground tabular-nums">{topShare}%</span>
        </div>
        <Progress value={topShare} className="**:data-[slot=progress-indicator]:bg-chart-3" />
      </CardFooter>
    </Card>
  )
}
