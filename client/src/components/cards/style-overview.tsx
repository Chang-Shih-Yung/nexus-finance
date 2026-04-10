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

type BranchRanking = {
  branch_name: string
  target_value: number
  actual_value: number
  achievement_pct: number
  rank: number
}

const BRANCH_LABELS: Record<string, string> = {
  "新竹分行": "Hsinchu",
  "台南分行": "Tainan",
  "桃園分行": "Taoyuan",
  "台北南區分行": "Taipei South",
  "高雄分行": "Kaohsiung",
  "台中分行": "Taichung",
  "台北北區分行": "Taipei North",
  "板橋分行": "Banqiao",
  "中壢分行": "Zhongli",
  "嘉義分行": "Chiayi",
}

export function StyleOverview() {
  const { t, locale } = useI18n()
  const { data, isLoading } = useRpc<BranchRanking[]>(
    ["branch-ranking"],
    "nf_branch_ranking",
    { p_metric: "revenue", p_period: "2026-Q2" }
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cards.styleOverview.title')}</CardTitle>
        <CardDescription>{t('cards.styleOverview.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex max-h-[360px] flex-col gap-2 overflow-y-auto scrollbar-thin">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-md border p-2.5">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex flex-1 flex-col gap-1">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))
          ) : !data?.length ? (
            <p className="text-sm text-muted-foreground">{t('cards.styleOverview.noData')}</p>
          ) : (
            data.map((branch) => {
              const pct = branch.achievement_pct
              return (
                <div
                  key={branch.branch_name}
                  className="flex items-center gap-3 rounded-md border p-2.5"
                >
                  <div className="flex size-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {branch.rank}
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="truncate text-sm font-medium">
                        {locale === "en" ? (BRANCH_LABELS[branch.branch_name] ?? branch.branch_name) : branch.branch_name}
                      </span>
                      <Badge
                        variant={pct >= 90 ? "default" : pct >= 70 ? "secondary" : "destructive"}
                        className="ml-2 flex-shrink-0 tabular-nums"
                      >
                        {pct.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground tabular-nums">
                      <span>{t('cards.styleOverview.actual')} {(branch.actual_value / 1e6).toFixed(1)}M</span>
                      <span>{t('cards.styleOverview.target')} {(branch.target_value / 1e6).toFixed(1)}M</span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
