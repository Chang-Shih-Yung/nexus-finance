'use client'

import { useEffect, useState } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  AlertTriangle, LogIn, ArrowLeftRight, CheckCircle2,
  Users, Timer, AlertCircle, Activity,
} from 'lucide-react'
import ChartCard from '@/components/ChartCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { useChartColors } from '@/hooks/useChartColors'
import AiQuerySection from '@/components/sections/AiQuerySection'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler)

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
const stepIcons = {
  login: LogIn,
  transfer_init: ArrowLeftRight,
  transfer_success: CheckCircle2,
}
const stepColors = {
  login: 'text-primary bg-primary/10',
  transfer_init: 'text-chart-3 bg-chart-3/10',
  transfer_success: 'text-chart-2 bg-chart-2/10',
}
const stepBarColors = {
  login: 'bg-primary',
  transfer_init: 'bg-chart-3',
  transfer_success: 'bg-chart-2',
}

const tierVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  premium: 'default', vip: 'secondary', general: 'outline',
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function FunnelCard({ row, isFirst }: { row: FunnelRow; isFirst?: boolean }) {
  const step = row.step as keyof typeof stepIcons
  const Icon = stepIcons[step] ?? Activity
  const colorClasses = stepColors[step] ?? 'text-primary bg-primary/10'
  const barColor = stepBarColors[step] ?? 'bg-primary'
  const pct = Math.min(row.conversion_rate ?? 100, 100)

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start gap-3 mb-3">
          <div className={`p-1.5 rounded-md shrink-0 ${colorClasses}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide truncate">
              {stepLabels[row.step] ?? row.step}
            </p>
            <p className="text-2xl font-bold text-foreground leading-tight">
              {row.users.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-border overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: isFirst ? '100%' : `${pct}%` }} />
        </div>
        {!isFirst ? (
          <div className="mt-2.5 flex gap-3 text-xs">
            <span className="text-chart-2 font-medium">轉換 {row.conversion_rate}%</span>
            <span className="text-destructive font-medium">流失 {row.drop_off_rate}%</span>
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">本週不重複使用者</p>
        )}
      </CardContent>
    </Card>
  )
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

  const noGrid = {
    grid: { display: false },
    border: { display: false },
    ticks: { display: false },
  }

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: noGrid, y: noGrid },
    elements: {
      point: { radius: 0, hoverRadius: 5, hitRadius: 12 },
    },
  }

  const latencyOk = avgLatency <= 500
  const errorRateOk = errorRate <= 5

  return (
    <div className="flex flex-col gap-4 -mx-4 md:-mx-8 -mt-6 -mb-6 px-4 md:px-8 pt-6 pb-6 bg-muted min-h-full">

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
      <div className="grid grid-cols-3 items-start gap-6">

        {/* ── 欄 1 ── */}
        <div className="flex flex-col gap-6">
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
                  pointRadius: 0,
                }],
              }} options={baseOptions} />
            )}
          </ChartCard>

          {/* 今日登入 + 今日交易 — 雙欄圖示卡 */}
          <Card className="shadow-sm">
            <CardContent className="pt-5 pb-5">
              <div className="grid grid-cols-2 divide-x divide-border">
                <div className="pr-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="p-1.5 rounded-md bg-primary/10">
                      <LogIn className="h-3.5 w-3.5 text-primary" />
                    </span>
                    <p className="text-xs text-muted-foreground">今日登入</p>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{overview.today_logins.toLocaleString()}</p>
                </div>
                <div className="pl-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="p-1.5 rounded-md bg-chart-3/10">
                      <ArrowLeftRight className="h-3.5 w-3.5 text-chart-3" />
                    </span>
                    <p className="text-xs text-muted-foreground">今日交易</p>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{overview.today_transactions.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 今日交易概覽 — 甜甜圈進度卡 */}
          <Card className="shadow-sm">
            <CardContent className="pt-5 pb-4">
              <div className="relative" style={{ height: 150 }}>
                <Doughnut data={{
                  datasets: [{
                    data: [
                      Math.max(overview.today_success_rate, 0),
                      Math.max(100 - overview.today_success_rate, 0),
                    ],
                    backgroundColor: [colors.chart2, `${colors.chart2}22`],
                    borderWidth: 0,
                    hoverOffset: 0,
                  }],
                }} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '72%',
                  plugins: { legend: { display: false }, tooltip: { enabled: false } },
                }} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-2xl font-bold text-foreground">{overview.today_success_rate}%</p>
                  <p className="text-[10px] text-muted-foreground">今日成功率</p>
                </div>
              </div>
              <div className="mt-3 divide-y divide-border text-sm">
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">今日交易筆數</span>
                  <span className="font-semibold">{overview.today_transactions.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">今日登入人次</span>
                  <span className="font-semibold">{overview.today_logins.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">今日活躍用戶</span>
                  <span className="font-semibold">{overview.today_active_users.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {funnelData.length > 0 && <FunnelCard row={funnelData[0]} isFirst />}

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
                  pointRadius: 0,
                }],
              }} options={{ ...baseOptions, scales: { x: noGrid, y: { ...noGrid, min: 0 } } }} />
            )}
          </ChartCard>
        </div>

        {/* ── 欄 2 ── */}
        <div id="funnel" className="flex flex-col gap-6 scroll-mt-28">

          {/* 今日成功率 + 今日活躍用戶 — 雙欄圖示卡 */}
          <Card className="shadow-sm">
            <CardContent className="pt-5 pb-5">
              <div className="grid grid-cols-2 divide-x divide-border">
                <div className="pr-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`p-1.5 rounded-md ${overview.today_success_rate < 80 ? 'bg-destructive/10' : 'bg-chart-2/10'}`}>
                      <CheckCircle2 className={`h-3.5 w-3.5 ${overview.today_success_rate < 80 ? 'text-destructive' : 'text-chart-2'}`} />
                    </span>
                    <p className="text-xs text-muted-foreground">今日成功率</p>
                  </div>
                  <p className={`text-2xl font-bold ${overview.today_success_rate < 80 ? 'text-destructive' : 'text-foreground'}`}>
                    {overview.today_success_rate}%
                  </p>
                  <div className="mt-2 h-1 rounded-full bg-border overflow-hidden">
                    <div
                      className={`h-full rounded-full ${overview.today_success_rate < 80 ? 'bg-destructive' : 'bg-chart-2'}`}
                      style={{ width: `${Math.min(overview.today_success_rate, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="pl-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="p-1.5 rounded-md bg-chart-5/10">
                      <Users className="h-3.5 w-3.5 text-chart-5" />
                    </span>
                    <p className="text-xs text-muted-foreground">今日活躍</p>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{overview.today_active_users.toLocaleString()}</p>
                  <p className="mt-2 text-xs text-muted-foreground">不重複用戶</p>
                </div>
              </div>
            </CardContent>
          </Card>

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
                scales: { x: { ...noGrid, beginAtZero: true }, y: noGrid },
              }} />
            )}
          </ChartCard>

          {funnelData.length > 1 && <FunnelCard row={funnelData[1]} />}

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

        {/* ── 欄 3 ── */}
        <div id="monitor" className="flex flex-col gap-6 scroll-mt-28">

          {/* API 健康 — 三欄圖示卡 */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" />
                API 健康 · 過去 60 分鐘
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className={`mx-auto mb-1.5 w-9 h-9 rounded-full flex items-center justify-center ${latencyOk ? 'bg-chart-2/10' : 'bg-destructive/10'}`}>
                    <Timer className={`h-4 w-4 ${latencyOk ? 'text-chart-2' : 'text-destructive'}`} />
                  </div>
                  <p className={`text-lg font-bold leading-none ${latencyOk ? 'text-foreground' : 'text-destructive'}`}>{avgLatency}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">ms 延遲</p>
                </div>
                <div className="border-x border-border/60">
                  <div className={`mx-auto mb-1.5 w-9 h-9 rounded-full flex items-center justify-center ${errorRateOk ? 'bg-chart-2/10' : 'bg-destructive/10'}`}>
                    <AlertCircle className={`h-4 w-4 ${errorRateOk ? 'text-chart-2' : 'text-destructive'}`} />
                  </div>
                  <p className={`text-lg font-bold leading-none ${errorRateOk ? 'text-foreground' : 'text-destructive'}`}>{errorRate}%</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">錯誤率</p>
                </div>
                <div>
                  <div className="mx-auto mb-1.5 w-9 h-9 rounded-full flex items-center justify-center bg-primary/10">
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-lg font-bold leading-none text-foreground">{totalRequests.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">請求總數</p>
                </div>
              </div>
            </CardContent>
          </Card>

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
                  pointRadius: 0,
                }],
              }} options={{ ...baseOptions, scales: { x: noGrid, y: { ...noGrid, min: 0, max: 100 } } }} />
            )}
          </ChartCard>

          {funnelData.length > 2 && <FunnelCard row={funnelData[2]} />}

          {/* 異常交易分析 — mini bar sparkline 卡 */}
          {errorData.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground">異常交易分析</CardTitle>
                <p className="text-xs text-muted-foreground">各錯誤類型累計次數</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {errorData.map((row, i) => {
                    const factors = [0.55, 0.40, 0.75, 0.60, 1.0]
                    const bars = factors.map((f, j) => {
                      const jitter = ((i * 7 + j * 13) % 25) / 100
                      return Math.round(Math.max(f + jitter, 0.15) * 100)
                    })
                    return (
                      <div key={row.error_code} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold font-mono text-foreground">{row.error_code}</p>
                        </div>
                        <div className="flex items-end gap-0.75 h-8 shrink-0">
                          {bars.map((h, j) => (
                            <div
                              key={j}
                              className="w-2 rounded-sm"
                              style={{
                                height: `${h}%`,
                                backgroundColor: j === 4 ? colors.chart1 : `${colors.chart1}70`,
                              }}
                            />
                          ))}
                        </div>
                        <p className="text-sm font-bold text-foreground w-10 text-right shrink-0">
                          {Number(row.count).toLocaleString()}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <ChartCard title="錯誤代碼分佈" height={190}>
            {errorData.length > 0 && (
              <Doughnut data={{
                labels: errorData.map(d => d.error_code),
                datasets: [{
                  label: '次數',
                  data: errorData.map(d => Number(d.count)),
                  backgroundColor: [colors.chart4, colors.chart1, colors.chart3, colors.chart5, colors.chart2],
                  borderWidth: 0,
                  hoverOffset: 6,
                }],
              }} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: true, position: 'right' as const, labels: { boxWidth: 10, font: { size: 11 } } },
                },
                cutout: '65%',
              }} />
            )}
          </ChartCard>

          <ChartCard title="API 平均延遲 (每分鐘)" height={190}>
            {healthData.length > 0 && (
              <Line data={{
                labels: healthLabels,
                datasets: [
                  {
                    label: '延遲 (ms)',
                    data: healthData.map(d => Number(d.avg_latency)),
                    borderColor: colors.chart3,
                    backgroundColor: `${colors.chart3}1a`,
                    fill: true, tension: 0.3,
                    pointRadius: 0,
                  },
                  {
                    label: '閾值 500ms',
                    data: healthData.map(() => 500),
                    borderColor: colors.chart4,
                    borderWidth: 1.5,
                    borderDash: [4, 4],
                    pointRadius: 0,
                    fill: false,
                    tension: 0,
                  },
                ],
              }} options={{
                ...baseOptions,
                plugins: {
                  legend: { display: true, position: 'top' as const, labels: { boxWidth: 10, font: { size: 10 } } },
                },
              }} />
            )}
          </ChartCard>
        </div>

      </div>

      {/* AI Query — full width, wrapped in a Card */}
      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0 [&>section]:border-t-0 [&>section]:px-6 [&>section]:pt-5 [&>section]:pb-6">
          <AiQuerySection />
        </CardContent>
      </Card>

    </div>
  )
}
