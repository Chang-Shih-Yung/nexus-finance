"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useRpc } from "@/hooks/useRpc"

const METRICS = ["txn_amount", "txn_count", "login_count", "active_users", "avg_balance"]
const METRIC_LABELS: Record<string, string> = {
  txn_amount: "Transaction Amount",
  txn_count: "Transaction Count",
  login_count: "Logins",
  active_users: "Active Users",
  avg_balance: "Avg Balance",
}

const chartConfig = { value: { label: "Value", color: "var(--chart-1)" } } satisfies ChartConfig

export function StockPerformance() {
  const [metric, setMetric] = React.useState("txn_amount")

  const { data, isLoading } = useRpc<
    { date: string; metric_value: number }[]
  >(["daily-trend", metric], "nf_daily_trend", {
    p_metric_key: metric,
    p_days: 30,
  })

  const chartData = (data ?? []).map(d => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value: d.metric_value,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Metric Trend</CardTitle>
        <CardDescription>30-day daily trend.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="metric-select">Metric</FieldLabel>
            <Combobox
              items={METRICS}
              value={metric}
              onValueChange={(value) => { if (value !== null) setMetric(value) }}
            >
              <ComboboxInput id="metric-select" placeholder="Search metric..." />
              <ComboboxContent>
                <ComboboxEmpty>No metrics found.</ComboboxEmpty>
                <ComboboxList>
                  {(item) => (
                    <ComboboxItem key={item} value={item}>
                      {METRIC_LABELS[item] ?? item}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </Field>
        </FieldGroup>
        <Separator />
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : (
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <AreaChart accessibilityLayer data={chartData} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-value)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--color-value)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Area type="monotone" dataKey="value" stroke="var(--color-value)" strokeWidth={2} fill="url(#fillValue)" />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
