"use client"

import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  Item, ItemActions, ItemContent, ItemGroup, ItemMedia, ItemTitle,
} from "@/components/ui/item"
import { Skeleton } from "@/components/ui/skeleton"
import { useRpc } from "@/hooks/useRpc"
import { useI18n } from '@/lib/i18n/context'

const ERROR_CODE_LABELS: Record<string, Record<string, string>> = {
  "zh-TW": {
    E_TIMEOUT: "逾時",
    E_FRAUD: "詐欺",
    E_BALANCE: "餘額不足",
    E_ACCOUNT: "帳戶異常",
    E_LIMIT: "超過限額",
    E_AUTH: "驗證失敗",
    E_NETWORK: "網路錯誤",
    E_DUPLICATE: "重複交易",
    E_INVALID: "資料無效",
    E_MAINTENANCE: "系統維護",
  },
  en: {
    E_TIMEOUT: "Timeout",
    E_FRAUD: "Fraud",
    E_BALANCE: "Insufficient Balance",
    E_ACCOUNT: "Account Error",
    E_LIMIT: "Over Limit",
    E_AUTH: "Auth Failed",
    E_NETWORK: "Network Error",
    E_DUPLICATE: "Duplicate",
    E_INVALID: "Invalid Data",
    E_MAINTENANCE: "Maintenance",
  },
}

function useMetricLabels() {
  const { t } = useI18n()
  return {
    txn_count: t('cards.usageCard.transactions'),
    txn_amount: t('cards.usageCard.volumeTwd'),
    success_rate: t('cards.usageCard.successRate'),
    error_count: t('cards.usageCard.errors'),
    login_count: t('cards.usageCard.logins'),
    active_users: t('cards.usageCard.activeUsers'),
    avg_balance: t('cards.usageCard.avgBalance'),
    error_rate: t('cards.usageCard.errorRate'),
  } as Record<string, string>
}

function CircularGauge({ percentage }: { percentage: number }) {
  const normalizedPercentage = Math.min(Math.max(percentage, 0), 100)
  const circumference = 2 * Math.PI * 42.5
  const strokePercent = (normalizedPercentage / 100) * circumference

  return (
    <svg aria-hidden="true" fill="none" height="16" width="16" strokeWidth="2" viewBox="0 0 100 100" className="-rotate-90">
      <circle cx="50" cy="50" r="42.5" strokeWidth="12" strokeDashoffset="0" strokeLinecap="round" strokeLinejoin="round" className="opacity-20" stroke="currentColor" style={{ strokeDasharray: `${circumference} ${circumference}` }} />
      <circle cx="50" cy="50" r="42.5" strokeWidth="12" strokeDashoffset="0" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" className="transition-all duration-300" style={{ strokeDasharray: `${strokePercent} ${circumference}` }} />
    </svg>
  )
}

function formatValue(key: string, value: number): string {
  if (key === "success_rate" || key === "error_rate") return `${value.toFixed(1)}%`
  if (key === "txn_amount" || key === "avg_balance") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "TWD", notation: "compact", maximumFractionDigits: 1 }).format(value)
  }
  return value.toLocaleString()
}

// Gauge percentage heuristic per metric
function gaugePercent(key: string, value: number): number {
  if (key === "success_rate") return value
  if (key === "error_rate") return Math.min(value * 10, 100)
  if (key === "txn_count") return Math.min((value / 50) * 100, 100)
  if (key === "login_count" || key === "active_users") return Math.min((value / 30) * 100, 100)
  if (key === "error_count") return Math.min((value / 20) * 100, 100)
  return Math.min((value / 100) * 100, 100)
}

export function UsageCard() {
  const { t, locale } = useI18n()
  const METRIC_LABELS = useMetricLabels()
  const errorLabels = ERROR_CODE_LABELS[locale] ?? ERROR_CODE_LABELS.en ?? {}
  const { data, isLoading } = useRpc<
    { metric_key: string; dimension: string; dimension_value: string; today_value: number; avg_7d: number; stddev_7d: number; z_score: number }[]
  >(["anomaly-check"], "nf_anomaly_check", {})

  const now = new Date()
  const from = new Date(now.getTime() - 30 * 86400000).toISOString()
  const to = now.toISOString()

  // If no anomalies, fall back to error breakdown
  const { data: errorBreakdown, isLoading: loadingErrors } = useRpc<
    { error_code: string; count: number }[]
  >(["error-breakdown"], "nf_stats_error_breakdown", {
    p_from: from, p_to: to,
  })

  const loading = isLoading || loadingErrors

  // Build items from anomaly data or fallback to error breakdown
  const items = (data && data.length > 0)
    ? data.slice(0, 6).map(d => ({
        name: METRIC_LABELS[d.metric_key] ?? d.metric_key,
        value: formatValue(d.metric_key, d.today_value),
        percentage: gaugePercent(d.metric_key, d.today_value),
      }))
    : (errorBreakdown ?? []).slice(0, 6).map(d => ({
        name: (errorLabels[d.error_code] ?? d.error_code) || "Unknown",
        value: Number(d.count).toLocaleString(),
        percentage: Math.min((Number(d.count) / ((errorBreakdown ?? []).reduce((s, x) => s + Number(x.count), 0) || 1)) * 100, 100),
      }))

  return (
    <Card className="w-full max-w-sm gap-4">
      <CardHeader>
        <CardTitle className="px-1 text-sm">
          {data && data.length > 0 ? `${data.length} ${t('cards.usageCard.anomaliesDetected')}` : t('cards.usageCard.errorBreakdown')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : (
          <ItemGroup className="gap-0">
            {items.map((item) => (
              <Item key={item.name} size="xs" className="px-0 group-hover/item-group:bg-transparent" asChild>
                <a href="#">
                  <ItemMedia variant="icon" className="text-primary">
                    <CircularGauge percentage={item.percentage} />
                  </ItemMedia>
                  <ItemContent className="inline-block truncate">
                    <ItemTitle className="inline capitalize">{item.name}</ItemTitle>
                  </ItemContent>
                  <ItemActions>
                    <span className="font-mono text-xs font-medium text-muted-foreground tabular-nums">{item.value}</span>
                  </ItemActions>
                </a>
              </Item>
            ))}
          </ItemGroup>
        )}
      </CardContent>
    </Card>
  )
}
