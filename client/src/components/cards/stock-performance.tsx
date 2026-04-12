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
import { useDateRange } from "@/hooks/useDateRange"
import { useI18n } from "@/lib/i18n/context"

const METRICS = ["txn_amount", "txn_count", "login_count", "active_users", "avg_balance"]

const chartConfig = { value: { label: "Value", color: "var(--chart-1)" } } satisfies ChartConfig

export function StockPerformance() {
  const { t } = useI18n()
  const { days } = useDateRange()
  const [metric, setMetric] = React.useState("txn_amount")

  const METRIC_LABELS: Record<string, string> = {
    txn_amount: t('cards.stockPerformance.txnAmount'),
    txn_count: t('cards.stockPerformance.txnCount'),
    login_count: t('cards.stockPerformance.loginCount'),
    active_users: t('cards.stockPerformance.activeUsers'),
    avg_balance: t('cards.stockPerformance.avgBalance'),
  }

  const { data, isLoading } = useRpc<
    { date: string; metric_value: number }[]
  >(["daily-trend", metric, String(days)], "nf_daily_trend", {
    p_metric_key: metric,
    p_days: days,
  })

  const chartData = (data ?? []).map(d => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value: d.metric_value,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cards.stockPerformance.title')}</CardTitle>
        <CardDescription>{t('cards.stockPerformance.description').replace('{{days}}', String(days))}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="metric-select">{t('cards.stockPerformance.metricLabel')}</FieldLabel>
            <Combobox
              items={METRICS.map(m => METRIC_LABELS[m] ?? m)}
              value={METRIC_LABELS[metric] ?? metric}
              onValueChange={(value) => {
                if (value !== null) {
                  const key = METRICS.find(m => (METRIC_LABELS[m] ?? m) === value)
                  if (key) setMetric(key)
                }
              }}
            >
              <ComboboxInput id="metric-select" placeholder={t('cards.stockPerformance.searchMetric')} />
              <ComboboxContent>
                <ComboboxEmpty>{t('cards.stockPerformance.noMetrics')}</ComboboxEmpty>
                <ComboboxList>
                  {(item) => (
                    <ComboboxItem key={item} value={item}>
                      {item}
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
