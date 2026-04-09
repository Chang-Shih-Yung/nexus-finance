"use client"

import { Bar, BarChart, XAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { useRpc } from "@/hooks/useRpc"
import { useI18n } from "@/lib/i18n/context"

const chartConfig = { amount: { label: "Transactions", color: "var(--chart-2)" } } satisfies ChartConfig

function formatCompact(amount: number, currency: string) {
  const abs = Math.abs(amount)
  if (abs >= 1_000_000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: currency || "TWD",
      notation: "compact", maximumFractionDigits: 1,
    }).format(amount)
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: currency || "TWD", maximumFractionDigits: 0,
  }).format(amount)
}

export function CardOverview() {
  const { t } = useI18n()
  const { data: summary, isLoading: loadingSummary } = useRpc<{
    total_balance: number; account_count: number; primary_currency: string; avg_balance: number
  }>(
    ["account-summary"], "nf_account_summary", {},
    { select: (rows: any) => rows[0] ?? { total_balance: 0, account_count: 0, primary_currency: "TWD", avg_balance: 0 } },
  )

  const { data: activity, isLoading: loadingActivity } = useRpc<
    { month: string; txn_count: number; txn_amount: number }[]
  >(["monthly-activity"], "nf_monthly_activity", { p_months: 12 })

  const cur = summary?.primary_currency ?? "TWD"
  const chartData = (activity ?? []).map(d => ({ month: d.month, amount: d.txn_count }))

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card>
        <CardContent>
          <CardDescription>{t('cards.cardOverview.totalBalance')}</CardDescription>
          {loadingSummary ? (
            <Skeleton className="h-8 w-32 mt-1" />
          ) : (
            <CardTitle className="text-2xl tabular-nums">
              {formatCompact(summary?.total_balance ?? 0, cur)}
            </CardTitle>
          )}
          <CardDescription className="tabular-nums">
            {loadingSummary ? (
              <Skeleton className="h-4 w-24 mt-1" />
            ) : (
              `${summary?.account_count ?? 0} ${t('cards.cardOverview.accounts')}`
            )}
          </CardDescription>
        </CardContent>
      </Card>
      <Card className="flex flex-col justify-between">
        <CardContent className="flex flex-1 flex-col justify-between">
          <div className="flex flex-col gap-1">
            <CardDescription>{t('cards.cardOverview.avgBalance')}</CardDescription>
            {loadingSummary ? (
              <Skeleton className="h-8 w-28 mt-1" />
            ) : (
              <CardTitle className="text-2xl tabular-nums">
                {formatCompact(summary?.avg_balance ?? 0, cur)}
              </CardTitle>
            )}
          </div>
          <Button variant="outline" size="sm" className="mt-3 w-full">{t('cards.cardOverview.viewAll')}</Button>
        </CardContent>
      </Card>
      <Card className="col-span-2">
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <CardDescription>{t('cards.cardOverview.yearlyActivity')}</CardDescription>
            <Badge variant="secondary">{chartData.length} {t('cards.cardOverview.months')}</Badge>
          </div>
          {loadingActivity ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <ChartContainer config={chartConfig} className="h-20 w-full">
              <BarChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <XAxis dataKey="month" tickLine={false} tickMargin={4} axisLine={false} tickFormatter={(v) => String(v).slice(0, 1)} className="text-[10px]" />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="amount" fill="var(--color-amount)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
