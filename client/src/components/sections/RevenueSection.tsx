'use client'

import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown } from '@/lib/icons'
import ChartCard from '@/components/ChartCard'
import { useRpc } from '@/hooks/useRpc'
import { METRIC_KEYS } from '@/lib/metric-keys'
import { useI18n } from '@/lib/i18n/context'
import { useDateRange } from '@/hooks/useDateRange'
import { CATEGORY_LABELS, getLabel } from '@/lib/i18n/labels'
import type { TrendRow, BreakdownRow, PeriodCompare } from '@/types/rpc'
import { PIE_COLORS } from '@/lib/chart-constants'
import { formatAmount, toChartData, toBreakdownData } from '@/lib/format'


export default function RevenueSection() {
  const { locale, t } = useI18n()
  const { fromISO, toISO, days } = useDateRange()

  // Previous period = same-length window immediately before selected range
  const prevEnd = new Date(fromISO)
  prevEnd.setDate(prevEnd.getDate() - 1)
  const prevStart = new Date(prevEnd)
  prevStart.setDate(prevStart.getDate() - days + 1)
  const prevStartISO = prevStart.toISOString().slice(0, 10)
  const prevEndISO = prevEnd.toISOString().slice(0, 10)

  const { data: compare } = useRpc<PeriodCompare[]>(
    ['period-compare', METRIC_KEYS.TXN_AMOUNT, fromISO, toISO],
    'nf_period_compare',
    { p_metric_key: METRIC_KEYS.TXN_AMOUNT, p_current_start: fromISO, p_current_end: toISO, p_previous_start: prevStartISO, p_previous_end: prevEndISO },
    { select: (rows: PeriodCompare[]) => rows }
  )
  const cmp = compare?.[0] ?? { current_total: 0, previous_total: 0, change_pct: 0 }

  const { data: amountTrend } = useRpc<TrendRow[]>(
    ['daily-trend', METRIC_KEYS.TXN_AMOUNT, String(days)],
    'nf_daily_trend',
    { p_metric_key: METRIC_KEYS.TXN_AMOUNT, p_days: days }
  )

  const { data: categoryBreakdown } = useRpc<BreakdownRow[]>(
    ['breakdown', METRIC_KEYS.TXN_AMOUNT, 'category', toISO],
    'nf_current_breakdown',
    { p_metric_key: METRIC_KEYS.TXN_AMOUNT, p_dimension: 'category', p_date: toISO }
  )

  const { data: countTrend } = useRpc<TrendRow[]>(
    ['daily-trend', METRIC_KEYS.TXN_COUNT, String(days)],
    'nf_daily_trend',
    { p_metric_key: METRIC_KEYS.TXN_COUNT, p_days: days }
  )

  const trendData = toChartData(amountTrend ?? [])
  const countData = toChartData(countTrend ?? [])
  const pieData = toBreakdownData(categoryBreakdown ?? [], key => getLabel(CATEGORY_LABELS, locale, key))

  const avgDailyCount = countData.length
    ? Math.round(countData.reduce((a, d) => a + d.value, 0) / countData.length)
    : 0

  const isUp = cmp.change_pct >= 0

  return (
    <>
      {/* MTD Revenue KPI */}
      <Card id="revenue" className="shadow-sm flex flex-col">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">{t('sections.revenue.mtdAmount')}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <p className="text-2xl font-bold text-foreground">{formatAmount(cmp.current_total)}</p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={isUp ? 'default' : 'destructive'} className="text-xs gap-1">
              {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {isUp ? '+' : ''}{cmp.change_pct}%
            </Badge>
            <span className="text-xs text-muted-foreground">vs {t('sections.revenue.lastMonth')} {formatAmount(cmp.previous_total)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Daily Revenue Trend */}
      <ChartCard title={t('sections.revenue.dailyTrend')} height={240} className="md:col-span-2 lg:col-span-2">
        {trendData.length > 0 && (
          <ChartContainer
            config={{ value: { label: t('sections.chartLabels.txnAmount'), color: 'var(--chart-1)' } }}
            className="h-full w-full"
          >
            <AreaChart data={trendData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <defs>
                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area dataKey="value" stroke="var(--color-value)" fill="url(#fillRevenue)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ChartContainer>
        )}
      </ChartCard>

      {/* Category Breakdown Pie */}
      <ChartCard title={t('sections.revenue.categoryBreakdown')} height={200}>
        {pieData.length > 0 && (
          <ChartContainer
            config={Object.fromEntries(pieData.map((d, i) => [
              d.name, { label: d.name, color: `var(--chart-${(i % 5) + 1})` },
            ]))}
            className="h-full w-full"
          >
            <PieChart>
              <Pie
                data={pieData} cx="50%" cy="50%"
                innerRadius="55%" outerRadius="90%"
                dataKey="value" strokeWidth={0}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
              <ChartLegend content={<ChartLegendContent nameKey="name" />} verticalAlign="bottom" />
            </PieChart>
          </ChartContainer>
        )}
      </ChartCard>

      {/* Daily Transaction Count KPI + Sparkline */}
      <Card className="shadow-sm lg:col-span-2 flex flex-col">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">{t('sections.revenue.dailyAvgCount')}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <p className="text-2xl font-bold text-foreground">{avgDailyCount.toLocaleString()}</p>
          {countData.length > 0 && (
            <div className="mt-3 h-10">
              <ChartContainer
                config={{ value: { label: t('sections.chartLabels.count'), color: 'var(--chart-3)' } }}
                className="h-full w-full"
              >
                <AreaChart data={countData.slice(-14)} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                  <Area dataKey="value" stroke="var(--color-value)" fill="var(--color-value)" fillOpacity={0.1} strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ChartContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
