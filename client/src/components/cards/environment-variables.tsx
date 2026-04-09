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

type FxRate = {
  currency_pair: string
  buy_rate: number
  sell_rate: number
  change_pct: number
  updated_at: string
}

export function EnvironmentVariables() {
  const { t } = useI18n()
  const { data, isLoading } = useRpc<FxRate[]>(
    ["fx-rates"],
    "nf_fx_rates",
    {}
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cards.environmentVariables.title')}</CardTitle>
        <CardDescription>{t('cards.environmentVariables.description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-md px-2.5 py-2 ring ring-border"
            >
              <Skeleton className="h-4 w-20" />
              <Skeleton className="ml-auto h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-14" />
            </div>
          ))
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">{t('cards.environmentVariables.noData')}</p>
        ) : (
          data.map((fx) => (
            <div
              key={fx.currency_pair}
              className="flex items-center gap-3 rounded-md px-2.5 py-2 font-mono text-xs ring ring-border"
            >
              <span className="min-w-[5rem] font-medium">
                {fx.currency_pair}
              </span>
              <div className="ml-auto flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-[0.6rem] text-muted-foreground">
                    {t('cards.environmentVariables.buy')}
                  </span>
                  <span>{fx.buy_rate.toFixed(4)}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[0.6rem] text-muted-foreground">
                    {t('cards.environmentVariables.sell')}
                  </span>
                  <span>{fx.sell_rate.toFixed(4)}</span>
                </div>
                <Badge
                  variant={fx.change_pct >= 0 ? "default" : "destructive"}
                  className={
                    fx.change_pct >= 0
                      ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                      : ""
                  }
                >
                  {fx.change_pct >= 0 ? "+" : ""}
                  {fx.change_pct.toFixed(2)}%
                </Badge>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
