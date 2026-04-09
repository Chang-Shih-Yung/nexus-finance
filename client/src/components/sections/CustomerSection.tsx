'use client'

import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
} from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { LogIn, ArrowLeftRight, CheckCircle2 } from '@/lib/icons'
import ChartCard from '@/components/ChartCard'
import { useRpc } from '@/hooks/useRpc'
import { METRIC_KEYS } from '@/lib/metric-keys'
import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'

interface BreakdownRow { dimension_value: string; metric_value: number }
interface TopNRow { dimension_value: string; metric_value: number }
interface FunnelRow { step: string; users: number; conversion_rate: number; drop_off_rate: number }

const PIE_COLORS = [
  'var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)',
  'var(--color-chart-4)', 'var(--color-chart-5)',
]

const TIER_LABELS: Record<string, string> = {
  general: '一般', vip: 'VIP', premium: '尊榮',
}

const tierVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  premium: 'default', vip: 'secondary', general: 'outline',
}

const stepLabels: Record<string, string> = {
  login: '登入', transfer_init: '發起轉帳', transfer_success: '轉帳成功',
}

const FUNNEL_COLORS = ['var(--color-chart-1)', 'var(--color-chart-3)', 'var(--color-chart-2)']

export default function CustomerSection() {
  const { data: tierAmount } = useRpc<BreakdownRow[]>(
    ['breakdown', METRIC_KEYS.TXN_AMOUNT, 'tier'],
    'nf_current_breakdown',
    { p_metric_key: METRIC_KEYS.TXN_AMOUNT, p_dimension: 'tier' }
  )

  const { data: tierCount } = useRpc<BreakdownRow[]>(
    ['breakdown', METRIC_KEYS.TXN_COUNT, 'tier'],
    'nf_current_breakdown',
    { p_metric_key: METRIC_KEYS.TXN_COUNT, p_dimension: 'tier' }
  )

  const { data: topUsers } = useRpc<TopNRow[]>(
    ['top-n', METRIC_KEYS.TXN_AMOUNT, 'user'],
    'nf_top_n',
    { p_metric_key: METRIC_KEYS.TXN_AMOUNT, p_dimension: 'user', p_n: 10 }
  )

  const { data: funnelData } = useQuery<FunnelRow[]>({
    queryKey: ['funnel'],
    queryFn: () => api.getFunnel() as Promise<FunnelRow[]>,
  })

  const amountPie = (tierAmount ?? []).map(d => ({
    name: TIER_LABELS[d.dimension_value] ?? d.dimension_value,
    value: Number(d.metric_value),
  }))

  const countBar = (tierCount ?? []).map(d => ({
    name: TIER_LABELS[d.dimension_value] ?? d.dimension_value,
    value: Number(d.metric_value),
  }))

  const funnelChartData = (funnelData ?? []).map(d => ({
    step: stepLabels[d.step] ?? d.step,
    users: d.users,
  }))

  return (
    <>
      {/* Tier Amount Pie */}
      <ChartCard id="customers" title="客群交易金額分佈" height={200}>
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
      <ChartCard title="客群交易筆數" height={180}>
        {countBar.length > 0 && (
          <ChartContainer
            config={{ value: { label: '筆數', color: 'var(--chart-5)' } }}
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
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <LogIn className="h-3.5 w-3.5" /> 轉帳漏斗
          </CardTitle>
        </CardHeader>
        <CardContent>
          {funnelChartData.length > 0 && (
            <div style={{ height: 160 }}>
              <ChartContainer
                config={{ users: { label: '使用者數', color: 'var(--chart-1)' } }}
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
                轉換 {row.conversion_rate}%
              </span>
              <span className="text-destructive font-medium">流失 {row.drop_off_rate}%</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* VIP Top N Table */}
      <Card className="shadow-sm lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">交易金額 Top 10 客戶</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-56 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>客戶</TableHead>
                  <TableHead className="text-right">金額</TableHead>
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
