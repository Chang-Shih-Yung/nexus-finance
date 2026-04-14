'use client'

import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis } from 'recharts'
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
  ChartLegend, ChartLegendContent,
} from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Timer, AlertCircle, Activity } from '@/lib/icons'
import ChartCard from '@/components/ChartCard'
import { useRpc } from '@/hooks/useRpc'
import { METRIC_KEYS } from '@/lib/metric-keys'
import { useI18n } from '@/lib/i18n/context'
import { useDateRange } from '@/hooks/useDateRange'
import { CHANNEL_LABELS, getLabel } from '@/lib/i18n/labels'
import type { BreakdownRow, HealthRow } from '@/types/rpc'
import { PIE_COLORS } from '@/lib/chart-constants'
import { toBreakdownData } from '@/lib/format'

export default function SystemSection() {
  const { locale, t } = useI18n()
  const { fromISO, toISO } = useDateRange()

  const { data: healthData } = useRpc<HealthRow[]>(
    ['api-health', fromISO, toISO],
    'nf_stats_api_health',
    { p_from: `${fromISO}T00:00:00`, p_to: `${toISO}T23:59:59` },
    { refetchInterval: 15_000 }
  )

  const { data: branchBreakdown } = useRpc<BreakdownRow[]>(
    ['breakdown', METRIC_KEYS.TXN_AMOUNT, 'branch', toISO],
    'nf_current_breakdown',
    { p_metric_key: METRIC_KEYS.TXN_AMOUNT, p_dimension: 'branch', p_date: toISO }
  )

  const { data: channelBreakdown } = useRpc<BreakdownRow[]>(
    ['breakdown', METRIC_KEYS.TXN_COUNT, 'channel', toISO],
    'nf_current_breakdown',
    { p_metric_key: METRIC_KEYS.TXN_COUNT, p_dimension: 'channel', p_date: toISO }
  )

  const health = healthData ?? []
  const avgLatency = health.length
    ? Math.round(health.reduce((a, d) => a + Number(d.avg_latency), 0) / health.length)
    : 0
  const errorRate = (() => {
    if (!health.length) return 0
    const totalErr = health.reduce((a, d) => a + Number(d.error_count), 0)
    const totalReq = health.reduce((a, d) => a + Number(d.total_requests), 0)
    return totalReq ? +(totalErr / totalReq * 100).toFixed(2) : 0
  })()
  const totalRequests = health.reduce((a, d) => a + Number(d.total_requests), 0)

  const latencyOk = avgLatency <= 500
  const errorRateOk = errorRate <= 5

  // Aggregate to hourly when data spans more than 2 hours (>120 points)
  const latencyData = (() => {
    if (health.length <= 120) {
      return health.map(d => {
        const dt = new Date(d.minute)
        return {
          time: `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`,
          avg_latency: Number(d.avg_latency),
          threshold: 500,
        }
      })
    }
    // Group by hour
    const hourMap = new Map<string, { sum: number; count: number }>()
    health.forEach(d => {
      const dt = new Date(d.minute)
      const key = `${dt.toISOString().slice(0, 10)} ${String(dt.getHours()).padStart(2, '0')}:00`
      const prev = hourMap.get(key) ?? { sum: 0, count: 0 }
      prev.sum += Number(d.avg_latency)
      prev.count += 1
      hourMap.set(key, prev)
    })
    return Array.from(hourMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => ({
        time: key.slice(5), // "MM-DD HH:00"
        avg_latency: Math.round(v.sum / v.count),
        threshold: 500,
      }))
  })()

  const branchData = toBreakdownData(branchBreakdown ?? [])

  const channelPie = toBreakdownData(channelBreakdown ?? [], key => getLabel(CHANNEL_LABELS, locale, key))

  return (
    <>
      {/* API Health KPI */}
      <Card id="system" className="shadow-sm flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t('sections.system.apiHealth')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 flex-1 flex flex-col justify-center">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className={`mx-auto mb-1.5 w-9 h-9 rounded-full flex items-center justify-center ${latencyOk ? 'bg-chart-2/10' : 'bg-destructive/10'}`}>
                <Timer className={`h-4 w-4 ${latencyOk ? 'text-chart-2' : 'text-destructive'}`} />
              </div>
              <p className={`text-lg font-bold leading-none ${latencyOk ? 'text-foreground' : 'text-destructive'}`}>{avgLatency}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t('sections.system.msLatency')}</p>
            </div>
            <div className="border-x border-border/60">
              <div className={`mx-auto mb-1.5 w-9 h-9 rounded-full flex items-center justify-center ${errorRateOk ? 'bg-chart-2/10' : 'bg-destructive/10'}`}>
                <AlertCircle className={`h-4 w-4 ${errorRateOk ? 'text-chart-2' : 'text-destructive'}`} />
              </div>
              <p className={`text-lg font-bold leading-none ${errorRateOk ? 'text-foreground' : 'text-destructive'}`}>{errorRate}%</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t('sections.system.errorRate')}</p>
            </div>
            <div>
              <div className="mx-auto mb-1.5 w-9 h-9 rounded-full flex items-center justify-center bg-primary/10">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <p className="text-lg font-bold leading-none text-foreground">{totalRequests.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t('sections.system.totalRequests')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branch Performance Ranking */}
      <ChartCard title={t('sections.system.branchRanking')} height={160}>
        {branchData.length > 0 && (
          <ChartContainer
            config={{ value: { label: t('sections.chartLabels.txnAmount'), color: 'var(--chart-1)' } }}
            className="h-full w-full"
          >
            <BarChart data={branchData} layout="vertical" margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="var(--color-value)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </ChartCard>

      {/* Digital vs Branch Pie */}
      <ChartCard title={t('sections.system.digitalVsBranch')} height={160}>
        {channelPie.length > 0 && (
          <ChartContainer
            config={Object.fromEntries(channelPie.map((d, i) => [
              d.name, { label: d.name, color: `var(--chart-${(i % 5) + 1})` },
            ]))}
            className="h-full w-full"
          >
            <PieChart>
              <Pie
                data={channelPie} cx="50%" cy="50%"
                innerRadius="55%" outerRadius="90%"
                dataKey="value" strokeWidth={0}
              >
                {channelPie.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
              <ChartLegend content={<ChartLegendContent nameKey="name" />} verticalAlign="bottom" />
            </PieChart>
          </ChartContainer>
        )}
      </ChartCard>

      {/* API Latency Trend */}
      <ChartCard title={t('sections.system.apiLatencyTrend')} height={140} className="md:col-span-3">
        {latencyData.length > 0 && (
          <ChartContainer
            config={{
              avg_latency: { label: t('sections.system.chartLatency'), color: 'var(--chart-3)' },
              threshold: { label: t('sections.system.chartThreshold'), color: 'var(--chart-4)' },
            }}
            className="h-full w-full"
          >
            <AreaChart data={latencyData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <defs>
                <linearGradient id="fillLatencyNew" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-avg_latency)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-avg_latency)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area dataKey="avg_latency" stroke="var(--color-avg_latency)" fill="url(#fillLatencyNew)" strokeWidth={2} dot={false} />
              <Area dataKey="threshold" stroke="var(--color-threshold)" fill="none" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        )}
      </ChartCard>
    </>
  )
}
