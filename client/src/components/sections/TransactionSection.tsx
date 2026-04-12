'use client'

import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis,
} from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import ChartCard from '@/components/ChartCard'
import { useRpc } from '@/hooks/useRpc'
import { METRIC_KEYS } from '@/lib/metric-keys'
import { useI18n } from '@/lib/i18n/context'
import { useDateRange } from '@/hooks/useDateRange'
import { CATEGORY_LABELS, CHANNEL_LABELS, getLabel } from '@/lib/i18n/labels'
import type { TrendRow, BreakdownRow } from '@/types/rpc'
import { PIE_COLORS } from '@/lib/chart-constants'
import { toChartData, toBreakdownData } from '@/lib/format'

export default function TransactionSection() {
  const { locale, t } = useI18n()
  const { toISO, days } = useDateRange()

  const { data: countTrend } = useRpc<TrendRow[]>(
    ['daily-trend', METRIC_KEYS.TXN_COUNT, String(days)],
    'nf_daily_trend',
    { p_metric_key: METRIC_KEYS.TXN_COUNT, p_days: days }
  )

  const { data: amountTrend } = useRpc<TrendRow[]>(
    ['daily-trend', METRIC_KEYS.TXN_AMOUNT, String(days)],
    'nf_daily_trend',
    { p_metric_key: METRIC_KEYS.TXN_AMOUNT, p_days: days }
  )

  const { data: categoryBreakdown } = useRpc<BreakdownRow[]>(
    ['breakdown', METRIC_KEYS.TXN_COUNT, 'category', toISO],
    'nf_current_breakdown',
    { p_metric_key: METRIC_KEYS.TXN_COUNT, p_dimension: 'category', p_date: toISO }
  )

  const { data: channelBreakdown } = useRpc<BreakdownRow[]>(
    ['breakdown', METRIC_KEYS.TXN_COUNT, 'channel', toISO],
    'nf_current_breakdown',
    { p_metric_key: METRIC_KEYS.TXN_COUNT, p_dimension: 'channel', p_date: toISO }
  )

  const { data: successTrend } = useRpc<TrendRow[]>(
    ['daily-trend', METRIC_KEYS.SUCCESS_RATE, String(days)],
    'nf_daily_trend',
    { p_metric_key: METRIC_KEYS.SUCCESS_RATE, p_days: days }
  )

  const countData = toChartData(countTrend ?? [])
  const amountData = toChartData(amountTrend ?? [])
  const successData = toChartData(successTrend ?? [])

  const catData = toBreakdownData(categoryBreakdown ?? [], k => getLabel(CATEGORY_LABELS, locale, k))

  const channelData = toBreakdownData(channelBreakdown ?? [], k => getLabel(CHANNEL_LABELS, locale, k))

  return (
    <>
      {/* Daily Transaction Volume (Bar) */}
      <ChartCard id="transactions" title={t('sections.transactions.dailyVolume')} height={200}>
        {countData.length > 0 && (
          <ChartContainer
            config={{ value: { label: t('sections.chartLabels.txnCount'), color: 'var(--chart-1)' } }}
            className="h-full w-full"
          >
            <BarChart data={countData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="var(--color-value)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </ChartCard>

      {/* Daily Amount Trend (Area) */}
      <ChartCard title={t('sections.transactions.dailyAmount')} height={200}>
        {amountData.length > 0 && (
          <ChartContainer
            config={{ value: { label: t('sections.chartLabels.txnAmount'), color: 'var(--chart-2)' } }}
            className="h-full w-full"
          >
            <AreaChart data={amountData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <defs>
                <linearGradient id="fillTxAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area dataKey="value" stroke="var(--color-value)" fill="url(#fillTxAmount)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ChartContainer>
        )}
      </ChartCard>

      {/* Category Distribution (Horizontal Bar) */}
      <ChartCard title={t('sections.transactions.categoryDist')} height={180}>
        {catData.length > 0 && (
          <ChartContainer
            config={{ value: { label: t('sections.chartLabels.count'), color: 'var(--chart-3)' } }}
            className="h-full w-full"
          >
            <BarChart data={catData} layout="vertical" margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={56} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="var(--color-value)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </ChartCard>

      {/* Channel Distribution (Pie) */}
      <ChartCard title={t('sections.transactions.channelDist')} height={200}>
        {channelData.length > 0 && (
          <ChartContainer
            config={Object.fromEntries(channelData.map((d, i) => [
              d.name, { label: d.name, color: `var(--chart-${(i % 5) + 1})` },
            ]))}
            className="h-full w-full"
          >
            <PieChart>
              <Pie
                data={channelData} cx="50%" cy="50%"
                innerRadius="50%" outerRadius="80%"
                dataKey="value" strokeWidth={0}
              >
                {channelData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
            </PieChart>
          </ChartContainer>
        )}
      </ChartCard>

      {/* Success Rate Trend (Area) */}
      <ChartCard title={t('sections.transactions.successTrend')} height={180} className="lg:col-span-2">
        {successData.length > 0 && (
          <ChartContainer
            config={{ value: { label: t('sections.chartLabels.successRate'), color: 'var(--chart-2)' } }}
            className="h-full w-full"
          >
            <AreaChart data={successData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <defs>
                <linearGradient id="fillSuccess" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis hide domain={[0, 100]} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area dataKey="value" stroke="var(--color-value)" fill="url(#fillSuccess)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ChartContainer>
        )}
      </ChartCard>
    </>
  )
}
