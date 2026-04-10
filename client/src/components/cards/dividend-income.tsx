"use client"

import { Bar, BarChart } from "recharts"
import { X } from "@/lib/icons"

import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item"
import { Skeleton } from "@/components/ui/skeleton"
import { useRpc } from "@/hooks/useRpc"
import { useI18n } from '@/lib/i18n/context'

const miniChartConfig = {
  value: { label: "Volume", color: "var(--chart-2)" },
} satisfies ChartConfig

function formatAmount(n: number, loc = "en-US") {
  return new Intl.NumberFormat(loc, { style: "currency", currency: "TWD", maximumFractionDigits: 0 }).format(n)
}

export function DividendIncome() {
  const { t, locale } = useI18n()
  const now = new Date()
  const from = new Date(now.getTime() - 30 * 86400000).toISOString()
  const to = now.toISOString()

  const { data, isLoading } = useRpc<
    { user_name: string; tx_count: number; total_amount: number }[]
  >(["top-transfer-users"], "nf_ai_top_transfer_users", {
    p_from: from, p_to: to, p_limit: 5,
  })

  // Fetch 5-day trend shape to use as sparkline pattern
  const { data: trendData } = useRpc<
    { date: string; metric_value: number }[]
  >(["trend-5d-sparkline"], "nf_daily_trend", {
    p_metric_key: "txn_amount", p_days: 5,
  })

  const totalAmount = (data ?? []).reduce((s, d) => s + Number(d.total_amount), 0)

  // Normalize trend into proportions [0..1] so we can scale per user
  const trendValues = (trendData ?? []).map(d => Number(d.metric_value))
  const trendMax = Math.max(...trendValues, 1)
  const trendRatios = trendValues.map(v => v / trendMax)

  const items = (data ?? []).map(d => ({
    name: d.user_name,
    amount: formatAmount(Number(d.total_amount), locale),
    raw: Number(d.total_amount),
    txCount: Number(d.tx_count),
    // Scale 5-day trend shape by user's total amount
    sparkline: trendRatios.map((r, i) => ({
      day: `D${i + 1}`,
      value: Math.round(r * Number(d.total_amount) / (trendRatios.length || 1)),
    })),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cards.dividendIncome.title')}</CardTitle>
        <CardDescription>{t('cards.dividendIncome.description')}</CardDescription>
        <CardAction>
          <Button variant="ghost" size="icon-sm" className="bg-muted">
            <X className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="ml-auto h-5 w-20" />
              </div>
            ))}
          </div>
        ) : (
          <ItemGroup className="max-h-[280px] overflow-y-auto scrollbar-thin">
            {items.map((item) => (
              <Item key={item.name} variant="muted">
                <ItemContent>
                  <ItemTitle className="capitalize">{item.name}</ItemTitle>
                  <ItemDescription>{item.txCount} {t('cards.dividendIncome.txns')} · {Math.round((item.raw / (totalAmount || 1)) * 100)}% {t('cards.dividendIncome.ofTotal')}</ItemDescription>
                </ItemContent>
                <ChartContainer config={miniChartConfig} className="hidden h-8 w-24 md:block">
                  <BarChart data={item.sparkline} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                    <Bar dataKey="value" fill="var(--color-value)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ChartContainer>
                <span className="hidden text-sm font-semibold tabular-nums md:block">{item.amount}</span>
              </Item>
            ))}
          </ItemGroup>
        )}
      </CardContent>
    </Card>
  )
}
