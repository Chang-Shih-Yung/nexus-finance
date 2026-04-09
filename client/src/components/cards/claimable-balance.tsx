"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Item, ItemContent } from "@/components/ui/item"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useRpc } from "@/hooks/useRpc"
import { useI18n } from '@/lib/i18n/context'

interface StatsOverview {
  today_logins: number
  today_transactions: number
  today_success_rate: number
  today_active_users: number
}

function formatPct(n: number) {
  return `${Number(n).toFixed(1)}%`
}

export function ClaimableBalance() {
  const { t } = useI18n()
  const { data, isLoading } = useRpc<StatsOverview[]>(
    ["stats-overview"], "nf_stats_overview", {},
    { select: (rows: any) => rows },
  )

  const stats = data?.[0]

  const successRate = stats?.today_success_rate ?? 0
  const badgeVariant = Number(successRate) >= 95 ? "secondary" : Number(successRate) >= 80 ? "outline" : "destructive"
  const badgeLabel = Number(successRate) >= 95 ? t('cards.claimableBalance.healthy') : Number(successRate) >= 80 ? t('cards.claimableBalance.moderate') : t('cards.claimableBalance.degraded')

  return (
    <Card>
      <CardHeader>
        <CardDescription>{t('cards.claimableBalance.todaySummary')}</CardDescription>
        {isLoading ? (
          <Skeleton className="h-12 w-32" />
        ) : (
          <CardTitle className="text-5xl tabular-nums">{stats?.today_transactions?.toLocaleString() ?? 0}</CardTitle>
        )}
        <Badge variant={badgeVariant}>
          <span className="size-2 rounded-full bg-current" />
          {isLoading ? t('common.loading') : badgeLabel}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-end">
        <Item variant="muted" className="flex-col items-stretch">
          <ItemContent className="gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('cards.claimableBalance.loginsToday')}</span>
              {isLoading ? <Skeleton className="h-4 w-12" /> : (
                <span className="text-sm font-medium tabular-nums">{stats?.today_logins?.toLocaleString() ?? 0}</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('cards.claimableBalance.activeUsers')}</span>
              {isLoading ? <Skeleton className="h-4 w-12" /> : (
                <span className="text-sm font-medium tabular-nums">{stats?.today_active_users?.toLocaleString() ?? 0}</span>
              )}
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('cards.claimableBalance.successRate')}</span>
              {isLoading ? <Skeleton className="h-4 w-16" /> : (
                <span className="text-sm font-semibold tabular-nums">{formatPct(successRate)}</span>
              )}
            </div>
          </ItemContent>
        </Item>
      </CardContent>
      <CardFooter>
        <CardDescription>{t('cards.claimableBalance.footerDescription')}</CardDescription>
      </CardFooter>
    </Card>
  )
}
