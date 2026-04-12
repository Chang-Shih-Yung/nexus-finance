"use client"

import { Label, Pie, PieChart } from "recharts"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useRpc } from "@/hooks/useRpc"
import { useI18n } from '@/lib/i18n/context'

const chartConfig = {
  success: { label: "Success", color: "var(--chart-2)" },
  failed: { label: "Failed", color: "var(--chart-1)" },
} satisfies ChartConfig

export function SavingsProgress() {
  const { t } = useI18n()
  const { data: breakdown, isLoading } = useRpc<
    { dimension_value: string; metric_value: number }[]
  >(["branch-breakdown"], "nf_current_breakdown", {
    p_metric_key: "txn_count",
    p_dimension: "channel",
  })

  const total = (breakdown ?? []).reduce((s, d) => s + d.metric_value, 0)
  // Use top category as "saved" portion, rest as "remaining"
  const sorted = [...(breakdown ?? [])].sort((a, b) => b.metric_value - a.metric_value)
  const topCategory = sorted[0]
  const topValue = topCategory?.metric_value ?? 0
  const restValue = total - topValue
  const pct = total > 0 ? Math.round((topValue / total) * 100) : 0

  const chartData = [
    { name: "success", value: topValue, fill: "var(--color-success)" },
    { name: "failed", value: restValue, fill: "var(--color-failed)" },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cards.savingsProgress.title')}</CardTitle>
        <CardDescription>{t('cards.savingsProgress.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="mx-auto flex aspect-square max-h-[220px] items-center justify-center">
            <Skeleton className="size-[190px] rounded-full" />
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[220px]">
            <PieChart>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={95} strokeWidth={0} startAngle={90} endAngle={-270}>
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={(viewBox.cy || 0) - 12} className="fill-foreground text-2xl font-bold">
                            {topValue.toLocaleString()}
                          </tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 12} className="fill-muted-foreground text-xs">
                            {pct}% of {total.toLocaleString()}
                          </tspan>
                        </text>
                      )
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-0">
        <div className="flex w-full items-center justify-between py-3">
          <span className="text-sm text-muted-foreground">{t('cards.savingsProgress.topChannel')}</span>
          <span className="text-sm font-semibold capitalize">
            {isLoading ? <Skeleton className="h-4 w-20" /> : (topCategory?.dimension_value ?? "—")}
          </span>
        </div>
        <Separator />
        <div className="flex w-full items-center justify-between py-3">
          <span className="text-sm text-muted-foreground">{t('cards.savingsProgress.totalTransactions')}</span>
          <span className="text-sm font-semibold tabular-nums">
            {isLoading ? <Skeleton className="h-4 w-16" /> : total.toLocaleString()}
          </span>
        </div>
        <Separator />
        <div className="flex w-full items-center justify-between py-3">
          <span className="text-sm text-muted-foreground">{t('cards.savingsProgress.channels')}</span>
          <span className="text-sm font-semibold">
            {isLoading ? <Skeleton className="h-4 w-10" /> : (breakdown?.length ?? 0)}
          </span>
        </div>
      </CardFooter>
    </Card>
  )
}
