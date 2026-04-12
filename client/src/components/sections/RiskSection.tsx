'use client'

import { useState, useMemo } from 'react'
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
import type { BreakdownRow, TrendRow, AnomalyRow, FailedTxRow, AckRow } from '@/types/rpc'
import { PIE_COLORS_ALT, TIER_VARIANT } from '@/lib/chart-constants'
import { formatTime, toChartData } from '@/lib/format'

export default function RiskSection() {
  const { t } = useI18n()
  const { fromISO, toISO, days } = useDateRange()
  const qc = useQueryClient()

  // ── Review dialog state ──
  const [reviewTx, setReviewTx] = useState<FailedTxRow | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [reviewBusy, setReviewBusy] = useState(false)

  // ── Anomaly ack state ──
  const [ackBusy, setAckBusy] = useState<string | null>(null)

  const metricLabel = (k: string) => {
    const map: Record<string, string> = {
      txn_count: t('sections.risk.metricTxnCount'),
      txn_amount: t('sections.risk.metricTxnAmount'),
      success_rate: t('sections.risk.metricSuccessRate'),
      error_count: t('sections.risk.metricErrorCount'),
      error_rate: t('sections.risk.metricErrorRate'),
      login_count: t('sections.risk.metricLoginCount'),
      active_users: t('sections.risk.metricActiveUsers'),
      avg_balance: t('sections.risk.metricAvgBalance'),
    }
    return map[k] ?? k
  }

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

  const { data: failedTx } = useRpc<FailedTxRow[]>(
    ['failed-transactions', fromISO, toISO],
    'nf_stats_failed_transactions',
    { p_limit: 50, p_from: fromISO, p_to: toISO }
  )

  const { data: acks } = useRpc<AckRow[]>(
    ['anomaly-acks-today'],
    'nf_anomaly_acks_today'
  )

  const ackedSet = useMemo(() => new Set(
    (acks ?? []).map(a => `${a.metric_key}|${a.dimension}|${a.dim_value}`)
  ), [acks])

  const pieData = (errorBreakdown ?? []).map(d => ({
    name: d.dimension_value,
    value: Number(d.metric_value),
  }))

  const errorData = toChartData(errorTrend ?? [])

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
    const headers: Record<string, string> = {
      id: 'ID', created_at: t('sections.risk.csvTime'), user_name: t('sections.risk.csvCustomer'),
      tier: t('sections.risk.csvTier'), amount: t('sections.risk.csvAmount'),
      error_code: t('sections.risk.csvErrorCode'), error_message: t('sections.risk.csvErrorMessage'),
      channel: t('sections.risk.csvChannel'),
    }
    downloadCsv(rows as unknown as Record<string, unknown>[], `failed-transactions-${fromISO}-${toISO}`, headers)
  }

  const unreviewedTx = (failedTx ?? []).filter(tx => !tx.reviewed_at)
  const reviewedCount = (failedTx ?? []).length - unreviewedTx.length

  return (
    <>
      {/* Error Type Pie */}
      <ChartCard id="risk" title={t('sections.risk.errorTypeDist')} height={200}>
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
                  <Cell key={i} fill={PIE_COLORS_ALT[i % PIE_COLORS_ALT.length]} />
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
            {t('sections.risk.failedTransactions')}
            {reviewedCount > 0 && (
              <Badge variant="secondary" className="ml-2 text-[10px]">
                {reviewedCount} {t('sections.risk.reviewed')}
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
                  <TableHead>{t('sections.risk.time')}</TableHead>
                  <TableHead>{t('sections.risk.customer')}</TableHead>
                  <TableHead>{t('sections.risk.tier')}</TableHead>
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
                      <Badge variant={TIER_VARIANT[tx.tier] ?? 'outline'}>{tx.tier}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{Number(tx.amount).toLocaleString()}</TableCell>
                    <TableCell><span className="text-destructive font-mono text-xs">{tx.error_code}</span></TableCell>
                    <TableCell className="text-center">
                      {tx.reviewed_at ? (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <CheckCircle2 className="h-3 w-3 text-chart-2" />
                          {t('sections.risk.reviewed')}
                        </Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] px-2"
                          onClick={() => { setReviewTx(tx); setReviewNote('') }}
                        >
                          {t('sections.risk.markReview')}
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
            {t('sections.risk.anomalyDetection')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {anomalyList.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t('sections.risk.noAnomalies')}
            </p>
          ) : (
            <div className="space-y-2">
              {anomalyList.slice(0, 5).map((a, i) => {
                const ackKey = `${a.metric_key}|${a.dimension}|${a.dimension_value}`
                const isAcked = ackedSet.has(ackKey)
                return (
                  <div key={i} className={`flex items-center justify-between py-1.5 border-b border-border/50 last:border-0 ${isAcked ? 'opacity-40' : ''}`}>
                    <div>
                      <p className="text-xs font-medium">{metricLabel(a.metric_key)}</p>
                      <p className="text-[10px] text-muted-foreground">{a.dimension}: {a.dimension_value}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <Badge variant="destructive" className="text-xs">
                          z={a.z_score}
                        </Badge>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {t('sections.risk.today')} {Number(a.today_value).toLocaleString()} / {t('sections.risk.avg')} {Number(a.avg_7d).toLocaleString()}
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
      <ChartCard title={`${t('sections.risk.errorRateTrend')} (${days}d)`} height={180} className="lg:col-span-2">
        {errorData.length > 0 && (
          <ChartContainer
            config={{ value: { label: t('sections.chartLabels.errorRate'), color: 'var(--chart-4)' } }}
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
            <DialogTitle>{t('sections.risk.dialogTitle')}</DialogTitle>
            <DialogDescription>
              {reviewTx && (
                <>
                  ID: {reviewTx.id} · {reviewTx.user_name} · {Number(reviewTx.amount).toLocaleString()} · {reviewTx.error_code}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={t('sections.risk.dialogNotes')}
            value={reviewNote}
            onChange={e => setReviewNote(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewTx(null)}>{t('common.cancel')}</Button>
            <Button onClick={handleReview} disabled={reviewBusy}>
              {reviewBusy
                ? t('sections.risk.dialogSaving')
                : t('sections.risk.dialogConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
