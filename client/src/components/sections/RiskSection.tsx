'use client'

import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from '@/lib/icons'
import ChartCard from '@/components/ChartCard'
import { useRpc } from '@/hooks/useRpc'
import { METRIC_KEYS } from '@/lib/metric-keys'

interface BreakdownRow { dimension_value: string; metric_value: number }
interface TrendRow { date: string; metric_value: number }
interface AnomalyRow {
  metric_key: string; dimension: string; dimension_value: string
  today_value: number; avg_7d: number; stddev_7d: number; z_score: number
}
interface TxRow {
  id: number; created_at: string; user_name: string; tier: string
  amount: number; channel: string; error_code: string; error_message: string
}

const PIE_COLORS = [
  'var(--color-chart-4)', 'var(--color-chart-1)', 'var(--color-chart-3)',
  'var(--color-chart-5)', 'var(--color-chart-2)',
]

const tierVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  premium: 'default', vip: 'secondary', general: 'outline',
}

const METRIC_LABELS: Record<string, string> = {
  txn_count: '交易筆數', txn_amount: '交易金額', success_rate: '成功率',
  error_count: '錯誤數', error_rate: '錯誤率', login_count: '登入數',
  active_users: '活躍用戶', avg_balance: '平均餘額',
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function RiskSection() {
  const { data: errorBreakdown } = useRpc<BreakdownRow[]>(
    ['breakdown', METRIC_KEYS.ERROR_COUNT, 'error_code'],
    'nf_current_breakdown',
    { p_metric_key: METRIC_KEYS.ERROR_COUNT, p_dimension: 'error_code' }
  )

  const { data: errorTrend } = useRpc<TrendRow[]>(
    ['daily-trend', METRIC_KEYS.ERROR_RATE, '30'],
    'nf_daily_trend',
    { p_metric_key: METRIC_KEYS.ERROR_RATE, p_days: 30 }
  )

  const { data: anomalies } = useRpc<AnomalyRow[]>(
    ['anomaly-check'],
    'nf_anomaly_check',
    {}
  )

  const { data: failedTx } = useRpc<TxRow[]>(
    ['failed-transactions'],
    'nf_stats_failed_transactions',
    { p_limit: 20 }
  )

  const pieData = (errorBreakdown ?? []).map(d => ({
    name: d.dimension_value,
    value: Number(d.metric_value),
  }))

  const errorData = (errorTrend ?? []).map(d => ({
    date: formatDate(d.date),
    value: Number(d.metric_value),
  }))

  const anomalyList = anomalies ?? []

  return (
    <>
      {/* Error Type Pie */}
      <ChartCard id="risk" title="錯誤類型分佈" height={200}>
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
                innerRadius="50%" outerRadius="80%"
                dataKey="value" strokeWidth={0}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
            </PieChart>
          </ChartContainer>
        )}
      </ChartCard>

      {/* Failed Transactions Table */}
      <Card className="shadow-sm lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">失敗交易明細</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>時間</TableHead>
                  <TableHead>客戶</TableHead>
                  <TableHead>等級</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                  <TableHead>錯誤</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(failedTx ?? []).map(tx => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-muted-foreground text-xs">{formatTime(tx.created_at)}</TableCell>
                    <TableCell className="font-medium">{tx.user_name}</TableCell>
                    <TableCell>
                      <Badge variant={tierVariant[tx.tier] ?? 'outline'}>{tx.tier}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{Number(tx.amount).toLocaleString()}</TableCell>
                    <TableCell><span className="text-destructive font-mono text-xs">{tx.error_code}</span></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Anomaly Detection */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5" /> 異常偵測
          </CardTitle>
        </CardHeader>
        <CardContent>
          {anomalyList.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">今日未偵測到異常指標</p>
          ) : (
            <div className="space-y-2">
              {anomalyList.slice(0, 5).map((a, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-xs font-medium">{METRIC_LABELS[a.metric_key] ?? a.metric_key}</p>
                    <p className="text-[10px] text-muted-foreground">{a.dimension}: {a.dimension_value}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive" className="text-xs">
                      z={a.z_score}
                    </Badge>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      今日 {Number(a.today_value).toLocaleString()} / 均值 {Number(a.avg_7d).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Rate Trend */}
      <ChartCard title="每日錯誤率趨勢 (30天)" height={180} className="lg:col-span-2">
        {errorData.length > 0 && (
          <ChartContainer
            config={{ value: { label: '錯誤率 %', color: 'var(--chart-4)' } }}
            className="h-full w-full"
          >
            <AreaChart data={errorData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <defs>
                <linearGradient id="fillErrorTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis hide domain={[0, 'auto']} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area dataKey="value" stroke="var(--color-value)" fill="url(#fillErrorTrend)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ChartContainer>
        )}
      </ChartCard>
    </>
  )
}
