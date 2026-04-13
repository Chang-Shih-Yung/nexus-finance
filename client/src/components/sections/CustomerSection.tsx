'use client'

import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
} from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LogIn, ArrowLeftRight, CheckCircle2 } from '@/lib/icons'
import ChartCard from '@/components/ChartCard'
import { useI18n } from '@/lib/i18n/context'
import { useRpc } from '@/hooks/useRpc'
import { METRIC_KEYS } from '@/lib/metric-keys'
import { useDateRange } from '@/hooks/useDateRange'
import type { BreakdownRow, TopNRow, FunnelRow } from '@/types/rpc'
import { PIE_COLORS } from '@/lib/chart-constants'
import { toBreakdownData } from '@/lib/format'

const FUNNEL_COLORS = ['var(--color-chart-1)', 'var(--color-chart-3)', 'var(--color-chart-2)']

export default function CustomerSection() {
  const { t } = useI18n()
  const { fromISO, toISO } = useDateRange()

  const tierLabel = (k: string) => {
    const map: Record<string, string> = { general: t('sections.customers.tierGeneral'), vip: t('sections.customers.tierVip'), premium: t('sections.customers.tierPremium') }
    return map[k] ?? k
  }

  const stepLabels: Record<string, string> = {
    login: t('sections.customers.stepLogin'), transfer_init: t('sections.customers.stepTransferInit'), transfer_success: t('sections.customers.stepTransferSuccess'),
  }

  const { data: tierAmount } = useRpc<BreakdownRow[]>(
    ['breakdown', METRIC_KEYS.TXN_AMOUNT, 'tier', toISO],
    'nf_current_breakdown',
    { p_metric_key: METRIC_KEYS.TXN_AMOUNT, p_dimension: 'tier', p_date: toISO }
  )

  const { data: tierCount } = useRpc<BreakdownRow[]>(
    ['breakdown', METRIC_KEYS.TXN_COUNT, 'tier', toISO],
    'nf_current_breakdown',
    { p_metric_key: METRIC_KEYS.TXN_COUNT, p_dimension: 'tier', p_date: toISO }
  )

  const { data: topUsers } = useRpc<TopNRow[]>(
    ['top-n', METRIC_KEYS.TXN_AMOUNT, 'user', toISO],
    'nf_top_n',
    { p_metric_key: METRIC_KEYS.TXN_AMOUNT, p_dimension: 'user', p_n: 10, p_date: toISO }
  )

  const { data: funnelData } = useRpc<FunnelRow[]>(
    ['funnel', fromISO, toISO],
    'nf_stats_funnel',
    { p_from: fromISO, p_to: toISO }
  )

  const amountPie = toBreakdownData(tierAmount ?? [], tierLabel)

  const countBar = toBreakdownData(tierCount ?? [], tierLabel)

  const funnelChartData = (funnelData ?? []).map(d => ({
    step: stepLabels[d.step] ?? d.step,
    users: d.users,
  }))

  return (
    <>
      {/* Tier Amount Pie */}
      <ChartCard id="customers" title={t('sections.customers.tierAmountDist')} height={200}>
        {amountPie.length > 0 && (
          <ChartContainer
            config={Object.fromEntries(amountPie.map((d, i) => [
              d.name, { label: d.name, color: `var(--chart-${(i % 5) + 1})` },
            ]))}
            className="h-full w-full"
          >
            <PieChart>
              <Pie
                data={amountPie} cx="50%" cy="50%"
                innerRadius="50%" outerRadius="80%"
                dataKey="value" strokeWidth={0}
              >
                {amountPie.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
            </PieChart>
          </ChartContainer>
        )}
      </ChartCard>

      {/* Tier Count Bar */}
      <ChartCard title={t('sections.customers.tierCountDist')} height={180}>
        {countBar.length > 0 && (
          <ChartContainer
            config={{ value: { label: t('sections.chartLabels.count'), color: 'var(--chart-5)' } }}
            className="h-full w-full"
          >
            <BarChart data={countBar} layout="vertical" margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={48} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="var(--color-value)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </ChartCard>

      {/* Funnel */}
      <Card className="shadow-sm flex flex-col justify-center">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <LogIn className="h-3.5 w-3.5" /> {t('sections.customers.funnelTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {funnelChartData.length > 0 && (
            <div style={{ height: 160 }}>
              <ChartContainer
                config={{ users: { label: t('sections.chartLabels.users'), color: 'var(--chart-1)' } }}
                className="h-full w-full"
              >
                <BarChart data={funnelChartData} layout="vertical" margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="step" type="category" width={72} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="users" radius={[0, 6, 6, 0]}>
                    {funnelChartData.map((_, i) => (
                      <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          )}
          {(funnelData ?? []).filter(r => r.step !== 'login').map(row => (
            <div key={row.step} className="flex gap-3 text-xs mt-2">
              <span className="text-chart-2 font-medium">
                {row.step === 'transfer_init' ? <ArrowLeftRight className="h-3 w-3 inline mr-1" /> : <CheckCircle2 className="h-3 w-3 inline mr-1" />}
                {t('sections.customers.funnelConversion')} {row.conversion_rate}%
              </span>
              <span className="text-destructive font-medium">{t('sections.customers.funnelDropOff')} {row.drop_off_rate}%</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* VIP Top N Table */}
      <Card className="shadow-sm md:col-span-2 lg:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t('sections.customers.topUsers')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-56 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{t('common.user')}</TableHead>
                  <TableHead className="text-right">{t('common.amount')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(topUsers ?? []).map((row, i) => (
                  <TableRow key={row.dimension_value}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{row.dimension_value}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{Number(row.metric_value).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
