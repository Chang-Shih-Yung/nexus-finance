"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useRpc } from "@/hooks/useRpc"
import { useI18n } from "@/lib/i18n/context"

type BudgetVsActual = {
  metric_key: string
  target_total: number
  actual_total: number
  achievement_pct: number
}

const METRIC_I18N_KEYS: Record<string, string> = {
  revenue: "cards.iconPreviewGrid.revenue",
  new_accounts: "cards.iconPreviewGrid.newAccounts",
  loan_volume: "cards.iconPreviewGrid.loanVolume",
  deposit_growth: "cards.iconPreviewGrid.depositGrowth",
  nps_score: "cards.iconPreviewGrid.nps",
  digital_adoption: "cards.iconPreviewGrid.digitalAdoption",
}

function formatValue(key: string, value: number): string {
  if (key === "nps_score") return value.toFixed(1)
  if (key === "digital_adoption") return `${value.toFixed(1)}%`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString()
}

function Ring({ pct }: { pct: number }) {
  const r = 18
  const circumference = 2 * Math.PI * r
  const offset = circumference - (Math.min(pct, 100) / 100) * circumference
  return (
    <svg className="size-10 -rotate-90" viewBox="0 0 44 44">
      <circle
        cx="22" cy="22" r={r}
        fill="none"
        className="stroke-muted"
        strokeWidth="3.5"
      />
      <circle
        cx="22" cy="22" r={r}
        fill="none"
        className="stroke-primary"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </svg>
  )
}

export function IconPreviewGrid() {
  const { t } = useI18n()
  const { data, isLoading } = useRpc<BudgetVsActual[]>(
    ["budget-vs-actual"],
    "nf_budget_vs_actual",
    {}
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cards.iconPreviewGrid.title')}</CardTitle>
        <CardDescription>{t('cards.iconPreviewGrid.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-2 rounded-lg border p-3"
                >
                  <Skeleton className="size-10 rounded-full" />
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-5 w-16" />
                </div>
              ))
            : (data ?? []).map((metric) => (
                <div
                  key={metric.metric_key}
                  className="flex flex-col items-center gap-1 rounded-lg border p-3"
                >
                  <div className="relative">
                    <Ring pct={metric.achievement_pct} />
                    <span className="absolute inset-0 flex items-center justify-center text-[0.6rem] font-medium tabular-nums">
                      {Math.round(metric.achievement_pct)}%
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {METRIC_I18N_KEYS[metric.metric_key] ? t(METRIC_I18N_KEYS[metric.metric_key]) : metric.metric_key}
                  </span>
                  <span className="text-lg font-semibold leading-tight tabular-nums">
                    {formatValue(metric.metric_key, metric.actual_total)}
                  </span>
                </div>
              ))}
        </div>
      </CardContent>
    </Card>
  )
}
