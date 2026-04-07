'use client'

import { useEffect, useState } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import { AlertTriangle } from 'lucide-react'
import StatCard from '@/components/StatCard'
import ChartCard from '@/components/ChartCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { useChartColors } from '@/hooks/useChartColors'
import AiQuerySection from '@/components/sections/AiQuerySection'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler)

interface Overview {
  today_logins: number
  today_transactions: number
  today_success_rate: number
  today_active_users: number
}
interface TrendRow { date: string; logins: number; success_rate: number }
interface FunnelRow { step: string; users: number; conversion_rate: number; drop_off_rate: number }
interface ErrorRow { error_code: string; count: number }
interface TxRow {
  id: number; created_at: string; user_name: string; tier: string
  amount: number; channel: string; error_code: string; error_message: string
}
interface HealthRow {
  minute: string; avg_latency: number; error_count: number; error_rate: number; total_requests: number
}

const stepLabels: Record<string, string> = {
  login: '登入', transfer_init: '發起轉帳', transfer_success: '轉帳成功',
}

const tierVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  premium: 'default', vip: 'secondary', general: 'outline',
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function DashboardBento() {
  const colors = useChartColors()

  const [overview, setOverview] = useState<Overview>({
    today_logins: 0, today_transactions: 0, today_success_rate: 0, today_active_users: 0,
  })
  const [trendData, setTrendData] = useState<TrendRow[]>([])
  const [funnelData, setFunnelData] = useState<FunnelRow[]>([])
  const [errorData, setErrorData] = useState<ErrorRow[]>([])
  const [failedTx, setFailedTx] = useState<TxRow[]>([])
  const [healthData, setHealthData] = useState<HealthRow[]>([])
  const [monitorError, setMonitorError] = useState<string | null>(null)

  useEffect(() => {
    const loadOverview = () => {
      Promise.allSettled([
        api.getOverview() as Promise<Overview>,
        api.getTrend(7) as Promise<TrendRow[]>,
      ]).then(([ov, trend]) => {
        if (ov.status === 'fulfilled') setOverview(ov.value)
        if (trend.status === 'fulfilled') setTrendData(trend.value)
      })
    }
    const loadMonitor = () => {
      (api.getApiHealth(60) as Promise<HealthRow[]>)
        .then(data => { setHealthData(data); setMonitorError(null) })
        .catch((err: unknown) => setMonitorError(err instanceof Error ? err.message : '載入 API 健康資料失敗'))
    }

    loadOverview()
    api.getFunnel().then(d => setFunnelData(d as FunnelRow[])).catch(console.error)
    Promise.allSettled([
      api.getErrorBreakdown(),
      api.getFailedTransactions(30),
    ]).then(([errors, txs]) => {
      if (errors.status === 'fulfilled') setErrorData(errors.value as ErrorRow[])
      if (txs.status === 'fulfilled') setFailedTx(txs.value as TxRow[])
    })
    loadMonitor()

    const t1 = setInterval(loadOverview, 30000)
    const t2 = setInterval(loadMonitor, 15000)
    return () => { clearInterval(t1); clearInterval(t2) }
  }, [])

  const trendLabels = trendData.map(d => {
    const dt = new Date(d.date)
    return `${dt.getMonth() + 1}/${dt.getDate()}`
  })

  const healthLabels = healthData.map(d => {
    const dt = new Date(d.minute)
    return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`
  })

  const avgLatency = healthData.length
    ? Math.round(healthData.reduce((a, d) => a + Number(d.avg_latency), 0) / healthData.length)
    : 0

  const errorRate = (() => {
    if (!healthData.length) return 0
    const totalErr = healthData.reduce((a, d) => a + Number(d.error_count), 0)
    const totalReq = healthData.reduce((a, d) => a + Number(d.total_requests), 0)
    return totalReq ? +(totalErr / totalReq * 100).toFixed(2) : 0
  })()

  const totalRequests = healthData.reduce((a, d) => a + Number(d.total_requests), 0)
  const hasAlert = avgLatency > 500 || errorRate > 5
  const alertMessage = [
    avgLatency > 500 && `平均延遲 ${avgLatency}ms 超過 500ms 閾值`,
    errorRate > 5 && `錯誤率 ${errorRate}% 超過 5% 閾值`,
  ].filter(Boolean).join('；')

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  }

  return (
    <div className="flex flex-col gap-4 **:data-[slot=card]:bg-muted **:data-[slot=card]:ring-0 **:data-[slot=card]:shadow-none">

      {/* Alert — full width, conditional */}
      {(monitorError || hasAlert) && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <div>
            <p className="text-destructive font-semibold text-sm">
              {monitorError ? '資料載入失敗' : '異常警示'}
            </p>
            <p className="text-destructive/80 text-sm">{monitorError ?? alertMessage}</p>
          </div>
        </div>
      )}

      {/* Scroll anchors */}
      <div id="overview" className="-mb-4 scroll-mt-28" aria-hidden="true" />

      {/* ── 三欄主體：items-start 讓每欄自己長高 ── */}
      <div className="grid grid-cols-3 items-start gap-4">

        {/* ── 欄 1：大圖開頭，讓第一條切線就歪掉 ── */}
        <div className="flex flex-col gap-4">
          {/* 高圖表開頭 → col2/col3 此時還在 StatCard，高度立刻錯開 */}
          <ChartCard title="每日登入人數 (最近 7 天)" height={280}>
            {trendData.length > 0 && (
              <Line data={{
                labels: trendLabels,
                datasets: [{
                  label: '登入人數',
                  data: trendData.map(d => Number(d.logins)),
                  borderColor: colors.chart1,
                  backgroundColor: `${colors.chart1}1a`,
                  fill: true, tension: 0.3,
                }],
              }} options={baseOptions} />
            )}
          </ChartCard>
          <StatCard title="今日登入人數" value={overview.today_logins} format="number"
            subtitle="與昨日相比" />
          <StatCard title="今日交易筆數" value={overview.today_transactions} format="number" />
          {funnelData.length > 0 && (
            <Card className="shadow-sm">
              <CardContent className="pt-5 pb-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">漏斗 — {stepLabels[funnelData[0]?.step] ?? funnelData[0]?.step}</p>
                <p className="text-3xl font-bold text-foreground">{funnelData[0]?.users.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-2">本週不重複使用者</p>
              </CardContent>
            </Card>
          )}
          <ChartCard title="Error Rate % (每分鐘)" height={160}>
            {healthData.length > 0 && (
              <Line data={{
                labels: healthLabels,
                datasets: [{
                  label: 'Error Rate %',
                  data: healthData.map(d => Number(d.error_rate)),
                  borderColor: colors.chart4,
                  backgroundColor: `${colors.chart4}1a`,
                  fill: true, tension: 0.3,
                }],
              }} options={{ ...baseOptions, scales: { y: { min: 0 } } }} />
            )}
          </ChartCard>
        </div>

        {/* ── 欄 2：兩個 StatCard 開頭（短），再接中型圖 ── */}
        <div id="funnel" className="flex flex-col gap-4 scroll-mt-28">
          <StatCard title="今日成功率" value={overview.today_success_rate} format="percent"
            warn={overview.today_success_rate < 80} />
          <StatCard title="今日活躍用戶" value={overview.today_active_users} format="number" />
          <ChartCard title="登入 → 發起轉帳 → 轉帳成功" height={200}>
            {funnelData.length > 0 && (
              <Bar data={{
                labels: funnelData.map(d => stepLabels[d.step] || d.step),
                datasets: [{
                  label: '不重複使用者數',
                  data: funnelData.map(d => d.users),
                  backgroundColor: [colors.chart1, colors.chart3, colors.chart2],
                  borderRadius: 8,
                }],
              }} options={{
                ...baseOptions,
                indexAxis: 'y' as const,
                scales: { x: { beginAtZero: true } },
              }} />
            )}
          </ChartCard>
          {funnelData.length > 1 && (
            <Card className="shadow-sm">
              <CardContent className="pt-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">漏斗 — {stepLabels[funnelData[1]?.step] ?? funnelData[1]?.step}</p>
                <p className="text-3xl font-bold text-foreground">{funnelData[1]?.users.toLocaleString()}</p>
                <div className="mt-3 flex gap-4 text-sm">
                  <span className="text-chart-2">轉換率 {funnelData[1]?.conversion_rate}%</span>
                  <span className="text-destructive">流失率 {funnelData[1]?.drop_off_rate}%</span>
                </div>
              </CardContent>
            </Card>
          )}
          <div id="errors" className="scroll-mt-28">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">最近失敗交易明細</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
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
                      {failedTx.map(tx => (
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
          </div>
        </div>

        {/* ── 欄 3：三個 StatCard 開頭（很短），再接長圖 ── */}
        <div id="monitor" className="flex flex-col gap-4 scroll-mt-28">
          <StatCard title="平均延遲 (ms)" value={avgLatency} format="number" warn={avgLatency > 500} />
          <StatCard title="Error Rate" value={errorRate} format="percent" warn={errorRate > 5} />
          <StatCard title="請求總數 (1hr)" value={totalRequests} format="number"
            subtitle="過去 60 分鐘累計" />
          <ChartCard title="交易成功率趨勢 (最近 7 天)" height={240}>
            {trendData.length > 0 && (
              <Line data={{
                labels: trendLabels,
                datasets: [{
                  label: '成功率 %',
                  data: trendData.map(d => Number(d.success_rate)),
                  borderColor: colors.chart2,
                  backgroundColor: `${colors.chart2}1a`,
                  fill: true, tension: 0.3,
                }],
              }} options={{ ...baseOptions, scales: { y: { min: 0, max: 100 } } }} />
            )}
          </ChartCard>
          {funnelData.length > 2 && (
            <Card className="shadow-sm">
              <CardContent className="pt-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">漏斗 — {stepLabels[funnelData[2]?.step] ?? funnelData[2]?.step}</p>
                <p className="text-3xl font-bold text-foreground">{funnelData[2]?.users.toLocaleString()}</p>
                <div className="mt-3 flex gap-4 text-sm">
                  <span className="text-chart-2">轉換率 {funnelData[2]?.conversion_rate}%</span>
                  <span className="text-destructive">流失率 {funnelData[2]?.drop_off_rate}%</span>
                </div>
              </CardContent>
            </Card>
          )}
          <ChartCard title="錯誤代碼分佈" height={190}>
            {errorData.length > 0 && (
              <Bar data={{
                labels: errorData.map(d => d.error_code),
                datasets: [{
                  label: '次數',
                  data: errorData.map(d => Number(d.count)),
                  backgroundColor: colors.chart4,
                  borderRadius: 6,
                }],
              }} options={baseOptions} />
            )}
          </ChartCard>
          <ChartCard title="API 平均延遲 (每分鐘)" height={190}>
            {healthData.length > 0 && (
              <Line data={{
                labels: healthLabels,
                datasets: [{
                  label: '延遲 (ms)',
                  data: healthData.map(d => Number(d.avg_latency)),
                  borderColor: colors.chart3,
                  backgroundColor: `${colors.chart3}1a`,
                  fill: true, tension: 0.3,
                }],
              }} options={baseOptions} />
            )}
          </ChartCard>
        </div>

      </div>

      {/* AI Query — full width */}
      <div id="ai-query" className="scroll-mt-28 [&>section]:border-t-0 [&>section]:py-0">
        <AiQuerySection />
      </div>

    </div>
  )
}
