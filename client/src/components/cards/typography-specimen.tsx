"use client"

import { Badge } from "@/components/ui/badge"
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

type LoanPortfolio = {
  total_outstanding: number
  loan_count: number
  avg_rate: number
  overdue_count: number
  overdue_amount: number
  npl_ratio: number
  default_count: number
}

type LoanByType = {
  loan_type: string
  loan_count: number
  total_outstanding: number
  avg_rate: number
  overdue_count: number
}

const LOAN_LABEL_KEYS: Record<string, string> = {
  mortgage: "cards.typographySpecimen.mortgage",
  personal: "cards.typographySpecimen.personal",
  business: "cards.typographySpecimen.business",
  auto: "cards.typographySpecimen.auto",
  credit_line: "cards.typographySpecimen.creditLine",
}

function fmt(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`
  return v.toLocaleString()
}

export function TypographySpecimen() {
  const { t } = useI18n()
  const { data: portfolio, isLoading: l1 } = useRpc<LoanPortfolio[]>(
    ["loan-portfolio"],
    "nf_loan_portfolio"
  )
  const { data: byType, isLoading: l2 } = useRpc<LoanByType[]>(
    ["loan-by-type"],
    "nf_loan_by_type"
  )

  const p = portfolio?.[0]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cards.typographySpecimen.title')}</CardTitle>
        <CardDescription>{t('cards.typographySpecimen.description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {l1 || !p ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-bold tabular-nums">
                NT${fmt(p.total_outstanding)}
              </span>
              <span className="text-xs text-muted-foreground">
                {p.loan_count} {t('cards.typographySpecimen.loans').replace('{count} ', '')} · {t('cards.typographySpecimen.avgRate').replace('{rate}', String(p.avg_rate))}
              </span>
            </div>
            <div className="flex gap-3">
              <Badge variant={p.npl_ratio > 2 ? "destructive" : "secondary"}>
                {t('cards.typographySpecimen.npl')} {p.npl_ratio}%
              </Badge>
              <Badge variant={p.overdue_count > 0 ? "outline" : "secondary"}>
                {t('cards.typographySpecimen.overdue')} {p.overdue_count}
              </Badge>
              {p.default_count > 0 && (
                <Badge variant="destructive">{t('cards.typographySpecimen.default')} {p.default_count}</Badge>
              )}
            </div>
          </>
        )}
        {l2 ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))
        ) : (
          <div className="flex max-h-[200px] flex-col gap-1.5 overflow-y-auto scrollbar-thin">
            {(byType ?? []).map((lt) => (
              <div
                key={lt.loan_type}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {LOAN_LABEL_KEYS[lt.loan_type] ? t(LOAN_LABEL_KEYS[lt.loan_type]) : lt.loan_type}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {lt.loan_count} 筆 · {lt.avg_rate}%
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold tabular-nums">
                    {fmt(lt.total_outstanding)}
                  </span>
                  {lt.overdue_count > 0 && (
                    <div className="text-xs text-destructive">
                      {lt.overdue_count} {t('cards.typographySpecimen.overdue')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
