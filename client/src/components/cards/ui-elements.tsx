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

type DepositSummary = {
  total_deposits: number
  account_count: number
  avg_balance: number
  weighted_rate: number
}

type DepositByProduct = {
  product_type: string
  account_count: number
  total_balance: number
  avg_rate: number
}

const PRODUCT_LABEL_KEYS: Record<string, string> = {
  savings: "cards.uiElements.savings",
  checking: "cards.uiElements.checking",
  time_deposit: "cards.uiElements.timeDeposit",
  money_market: "cards.uiElements.moneyMarket",
}

function fmt(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`
  return v.toLocaleString()
}

export function UIElements() {
  const { t } = useI18n()
  const { data: summary, isLoading: l1 } = useRpc<DepositSummary[]>(
    ["deposit-summary"],
    "nf_deposit_summary"
  )
  const { data: byProduct, isLoading: l2 } = useRpc<DepositByProduct[]>(
    ["deposit-by-product"],
    "nf_deposit_by_product"
  )

  const s = summary?.[0]
  const total = (byProduct ?? []).reduce((sum, p) => sum + p.total_balance, 0) || 1

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t('cards.uiElements.title')}</CardTitle>
        <CardDescription>{t('cards.uiElements.description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {l1 || !s ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-bold tabular-nums">
              NT${fmt(s.total_deposits)}
            </span>
            <span className="text-xs text-muted-foreground">
              {s.account_count} {t('cards.uiElements.accounts')} · {t('cards.uiElements.avgBalance')} {fmt(s.avg_balance)} · {t('cards.uiElements.weightedRate')}{" "}
              {s.weighted_rate}%
            </span>
          </div>
        )}
        {l2 ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <>
            {/* Stacked bar */}
            <div className="flex h-3 w-full overflow-hidden rounded-full">
              {(byProduct ?? []).map((p, i) => (
                <div
                  key={p.product_type}
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${(p.total_balance / total) * 100}%`,
                    opacity: 1 - i * 0.2,
                  }}
                />
              ))}
            </div>
            {/* Legend list */}
            <div className="flex flex-col gap-2">
              {(byProduct ?? []).map((p, i) => (
                <div
                  key={p.product_type}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="size-2.5 rounded-full bg-primary"
                      style={{ opacity: 1 - i * 0.2 }}
                    />
                    <span>
                      {PRODUCT_LABEL_KEYS[p.product_type] ? t(PRODUCT_LABEL_KEYS[p.product_type]) : p.product_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 tabular-nums text-muted-foreground">
                    <span className="text-xs">
                      {p.account_count} {t('cards.uiElements.accounts')} · {p.avg_rate}%
                    </span>
                    <span className="font-medium text-foreground">
                      {fmt(p.total_balance)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
