"use client"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item"
import { Skeleton } from "@/components/ui/skeleton"
import { useRpc } from "@/hooks/useRpc"
import { useI18n } from "@/lib/i18n/context"

type InvestmentSummary = {
  total_aum: number
  product_count: number
  avg_return: number
  high_risk_count: number
  medium_risk_count: number
  low_risk_count: number
}

type InvestmentProduct = {
  name: string
  category: string
  risk_level: string
  return_ytd: number
  aum: number
  currency: string
}

const RISK_VARIANT: Record<string, "destructive" | "secondary" | "outline"> = {
  high: "destructive",
  medium: "secondary",
  low: "outline",
}

function fmtAum(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`
  return v.toLocaleString()
}

export function IndexInvesting() {
  const { t } = useI18n()

  const RISK_LABEL: Record<string, string> = {
    high: t('cards.indexInvesting.highRisk'),
    medium: t('cards.indexInvesting.mediumRisk'),
    low: t('cards.indexInvesting.lowRisk'),
  }

  const { data: summary, isLoading: l1 } = useRpc<InvestmentSummary[]>(
    ["investment-summary"],
    "nf_investment_summary"
  )
  const { data: products, isLoading: l2 } = useRpc<InvestmentProduct[]>(
    ["investment-products"],
    "nf_investment_products",
    { p_limit: 6 }
  )

  const s = summary?.[0]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cards.indexInvesting.title')}</CardTitle>
        <CardDescription>{t('cards.indexInvesting.description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {l1 || !s ? (
          <Skeleton className="h-6 w-48" />
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold tabular-nums">
              AUM NT${fmtAum(s.total_aum)}
            </span>
            <span className="text-xs text-muted-foreground">
              {t('cards.indexInvesting.products').replace('{count}', String(s.product_count))} · {t('cards.indexInvesting.avgReturn').replace('{rate}', String(s.avg_return))}
            </span>
          </div>
        )}
        <div className="flex max-h-[240px] flex-col gap-1 overflow-y-auto scrollbar-thin">
          {l2 ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))
          ) : (
            (products ?? []).map((p) => (
              <Item key={p.name} size="sm">
                <ItemContent>
                  <ItemTitle className="flex items-center gap-2">
                    <span className="truncate">{p.name}</span>
                    <Badge
                      variant={RISK_VARIANT[p.risk_level] ?? "outline"}
                      className="flex-shrink-0 text-[0.6rem]"
                    >
                      {RISK_LABEL[p.risk_level] ?? p.risk_level}
                    </Badge>
                  </ItemTitle>
                  <ItemDescription>
                    YTD{" "}
                    <span
                      className={
                        p.return_ytd >= 0
                          ? "text-foreground"
                          : "text-destructive"
                      }
                    >
                      {p.return_ytd >= 0 ? "+" : ""}
                      {p.return_ytd}%
                    </span>
                    {" · "}AUM {fmtAum(p.aum)} {p.currency}
                  </ItemDescription>
                </ItemContent>
              </Item>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
