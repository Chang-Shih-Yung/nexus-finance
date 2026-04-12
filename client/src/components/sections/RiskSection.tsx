'use client'

import { useState } from 'react'
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { AlertTriangle, Download, CheckCircle2 } from '@/lib/icons'
import ChartCard from '@/components/ChartCard'
import { useRpc } from '@/hooks/useRpc'
import { useDateRange } from '@/hooks/useDateRange'
import { useI18n } from '@/lib/i18n/context'
import { METRIC_KEYS } from '@/lib/metric-keys'
import { api } from '@/lib/api'
import { downloadCsv } from '@/lib/csv-export'
import { useQueryClient } from '@tanstack/react-query'

interface BreakdownRow { dimension_value: string; metric_value: number }
interface TrendRow { date: string; metric_value: number }
interface AnomalyRow {
  metric_key: string; dimension: string; dimension_value: string
  today_value: number; avg_7d: number; stddev_7d: number; z_score: number
}
interface TxRow {
  id: number; created_at: string; user_name: string; tier: string
  amount: number; channel: string; error_code: string; error_message: string
  reviewed_at?: string | null; review_note?: string | null
}
interface AckRow { metric_key: string; dimension: string; dim_value: string }

const PIE_COLORS = [
  'var(--color-chart-4)', 'var(--color-chart-1)', 'var(--color-chart-3)',
  'var(--color-chart-5)', 'var(--color-chart-2)',
]

const tierVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  premium: 'default', vip: 'secondary', general: 'outline',
}

const METRIC_LABELS: Record<string, Record<string, string>> = {
  'zh-TW': {
    txn_count: '交易筆數', txn_amount: '交易金額', success_rate: '成功率',
    error_count: '錯誤數', error_rate: '錯誤率', login_count: '登入數',
    active_users: '活躍用戶', avg_balance: '平均餘額',
  },
  'en': {
    txn_count: 'Txn Count', txn_amount: 'Txn Amount', success_rate: 'Success Rate',
    error_count: 'Error Count', error_rate: 'Error Rate', login_count: 'Logins',
    active_users: 'Active Users', avg_balance: 'Avg Balance',
  },
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
  const { t, locale } = useI18n()
  const { fromISO, toISO, days } = useDateRange()
  const qc = useQueryClient()

  // ── Review dialog state ──
  const [reviewTx, setReviewTx] = useState<TxRow | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [reviewBusy, setReviewBusy] = useState(false)

  // ── Anomaly ack state ──
  const [ackBusy, setAckBusy] = useState<string | null>(null)

  const metricLabel = METRIC_LABELS[locale] ?? METRIC_LABELS['en']

  // ── Data queries ──
  const { data: errorBreakdown } = useRpc<BreakdownRow[]>(
    ['breakdown', METRIC_KEYS.ERROR_COUNT, 'error_code', toISO],
    'nf_current_breakdown',
    { p_metric_key: METRIC_KEYS.ERROR_COUNT, p_dimension: 'error_code', p_date: toISO }
  )

  const { data: errorTrend } = useRpc<TrendRow[]>(
    ['daily-trend', METRIC_KEYS.ERROR_RATE, String(days)],
    'nf_daily_trend',
    { p_metric_key: METRIC_KEYS.ERROR_RATE, p_days: days }
  )

  const { data: anomalies } = useRpc<AnomalyRow[]>(
    ['anomaly-check', toISO],
    'nf_anomaly_check',
    { p_date: toISO }
  )

  const { data: failedTx } = useRpc<TxRow[]>(
    ['failed-transactions', fromISO, toISO],
    'nf_stats_failed_transactions',
    { p_limit: 50, p_from: fromISO, p_to: toISO }
  )

  const { data: acks } = useRpc<AckRow[]>(
    ['anomaly-acks-today'],
    'nf_anomaly_acks_today'
  )

  const ackedSet = new Set(
    (acks ?? []).map(a => `${a.metric_key}|${a.dimension}|${a.dim_value}`)
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

  // ── Actions ──
  async function handleReview() {
    if (!reviewTx) return
    setReviewBusy(true)
    try {
      await api.reviewFailedTransaction(reviewTx.id, reviewNote)
      qc.invalidateQueries({ queryKey: ['failed-transactions'] })
      setReviewTx(null)
      setReviewNote('')
    } finally {
      setReviewBusy(false)
    }
  }

  async function handleAck(a: AnomalyRow) {
    const key = `${a.metric_key}|${a.dimension}|${a.dimension_value}`
    setAckBusy(key)
    try {
      await api.acknowledgeAnomaly(a.metric_key, a.dimension, a.dimension_value)
      qc.invalidateQueries({ queryKey: ['anomaly-acks-today'] })
    } finally {
      setAckBusy(null)
    }
  }

  function handleExportCsv() {
    const rows = failedTx ?? []
    if (!rows.length) return
    const headers: Record<string, string> = locale === 'zh-TW'
      ? { id: 'ID', created_at: '時間', user_name: '客戶', tier: '等級', amount: '金額', error_code: '錯誤碼', error_message: '錯誤訊息', channel: '通路' }
      : { id: 'ID', created_at: 'Time', user_name: 'Customer', tier: 'Tier', amount: 'Amount', error_code: 'Error Code', error_message: 'Error Message', channel: 'Channel' }
    downloadCsv(rows as unknown as Record<string, unknown>[], `failed-transactions-${fromISO}-${toISO}`, headers)
  }

  const unreviewedTx = (failedTx ?? []).filter(tx => !tx.reviewed_at)
  const reviewedCount = (failedTx ?? []).length - unreviewedTx.length

  return (
    <>
      {/* Error Type Pie */}
      <ChartCard id="risk" title={locale === 'zh-TW' ? '錯誤類型分佈' : 'Error Type Distribution'} height={200}>
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

      {/* Failed Transactions Table — with review + CSV export */}
      <Card className="shadow-sm lg:col-span-2">
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {locale === 'zh-TW' ? '失敗交易明細' : 'Failed Transactions'}
            {reviewedCount > 0 && (
              <Badge variant="secondary" className="ml-2 text-[10px]">
                {reviewedCount} {locale === 'zh-TW' ? '已處理' : 'reviewed'}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={handleExportCsv}>
            <Download className="h-3.5 w-3.5" />
            {t('common.exportCsv')}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{locale === 'zh-TW' ? '時間' : 'Time'}</TableHead>
                  <TableHead>{locale === 'zh-TW' ? '客戶' : 'Customer'}</TableHead>
                  <TableHead>{locale === 'zh-TW' ? '等級' : 'Tier'}</TableHead>
                  <TableHead className="text-right">{t('common.amount')}</TableHead>
                  <TableHead>{t('common.error')}</TableHead>
                  <TableHead className="text-center">{t('common.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(failedTx ?? []).map(tx => (
                  <TableRow key={tx.id} className={tx.reviewed_at ? 'opacity-50' : ''}>
                    <TableCell className="text-muted-foreground text-xs">{formatTime(tx.created_at)}</TableCell>
                    <TableCell className="font-medium">{tx.user_name}</TableCell>
                    <TableCell>
                      <Badge variant={tierVariant[tx.tier] ?? 'outline'}>{tx.tier}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{Number(tx.amount).toLocaleString()}</TableCell>
                    <TableCell><span className="text-destructive font-mono text-xs">{tx.error_code}</span></TableCell>
                    <TableCell className="text-center">
                      {tx.reviewed_at ? (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <CheckCircle2 className="h-3 w-3 text-chart-2" />
                          {locale === 'zh-TW' ? '已處理' : 'Done'}
                        </Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] px-2"
                          onClick={() => { setReviewTx(tx); setReviewNote('') }}
                        >
                          {locale === 'zh-TW' ? '標記處理' : 'Review'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Anomaly Detection — with acknowledge */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            {locale === 'zh-TW' ? '異常偵測' : 'Anomaly Detection'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {anomalyList.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {locale === 'zh-TW' ? '今日未偵測到異常指標' : 'No anomalies detected'}
            </p>
          ) : (
            <div className="space-y-2">
              {anomalyList.slice(0, 5).map((a, i) => {
                const ackKey = `${a.metric_key}|${a.dimension}|${a.dimension_value}`
                const isAcked = ackedSet.has(ackKey)
                return (
                  <div key={i} className={`flex items-center justify-between py-1.5 border-b border-border/50 last:border-0 ${isAcked ? 'opacity-40' : ''}`}>
                    <div>
                      <p className="text-xs font-medium">{metricLabel[a.metric_key] ?? a.metric_key}</p>
                      <p className="text-[10px] text-muted-foreground">{a.dimension}: {a.dimension_value}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <Badge variant="destructive" className="text-xs">
                          z={a.z_score}
                        </Badge>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {locale === 'zh-TW' ? '今日' : 'Today'} {Number(a.today_value).toLocaleString()} / {locale === 'zh-TW' ? '均值' : 'avg'} {Number(a.avg_7d).toLocaleString()}
                        </p>
                      </div>
                      {!isAcked && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5"
                          disabled={ackBusy === ackKey}
                          onClick={() => handleAck(a)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Rate Trend */}
      <ChartCard title={locale === 'zh-TW' ? `每日錯誤率趨勢 (${days}天)` : `Daily Error Rate (${days}d)`} height={180} className="lg:col-span-2">
        {errorData.length > 0 && (
          <ChartContainer
            config={{ value: { label: locale === 'zh-TW' ? '錯誤率 %' : 'Error Rate %', color: 'var(--chart-4)' } }}
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

      {/* Review Dialog */}
      <Dialog open={!!reviewTx} onOpenChange={open => { if (!open) setReviewTx(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{locale === 'zh-TW' ? '標記失敗交易為已處理' : 'Mark Transaction as Reviewed'}</DialogTitle>
            <DialogDescription>
              {reviewTx && (
                <>
                  ID: {reviewTx.id} · {reviewTx.user_name} · {Number(reviewTx.amount).toLocaleString()} · {reviewTx.error_code}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={locale === 'zh-TW' ? '備註（選填）' : 'Notes (optional)'}
            value={reviewNote}
            onChange={e => setReviewNote(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewTx(null)}>{t('common.cancel')}</Button>
            <Button onClick={handleReview} disabled={reviewBusy}>
              {reviewBusy
                ? (locale === 'zh-TW' ? '處理中...' : 'Saving...')
                : (locale === 'zh-TW' ? '確認處理' : 'Confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
