"use client"

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Skeleton } from "@/components/ui/skeleton"
import { useRpc } from "@/hooks/useRpc"
import { useI18n } from "@/lib/i18n/context"

type RmPerformance = {
  rm_name: string
  client_count: number
  total_txn_amount: number
  txn_count: number
  avg_client_balance: number
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function formatAmount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return value.toLocaleString()
}

export function Contributors() {
  const { t } = useI18n()
  const { data, isLoading } = useRpc<RmPerformance[]>(
    ["rm-performance"],
    "nf_rm_performance",
    {}
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t('cards.contributors.title')}{" "}
          {data?.length ? (
            <Badge variant="secondary">{data.length}</Badge>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex max-h-[300px] flex-col gap-1 overflow-y-auto scrollbar-thin">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex flex-col gap-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
          ))
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">{t('cards.contributors.noData')}</p>
        ) : (
          data.map((rm) => (
            <Item key={rm.rm_name} size="sm">
              <ItemMedia>
                <Avatar className="size-9">
                  <AvatarFallback className="text-xs">
                    {getInitials(rm.rm_name)}
                  </AvatarFallback>
                </Avatar>
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{rm.rm_name}</ItemTitle>
                <ItemDescription>
                  {rm.client_count} {t('cards.contributors.clients')} | {t('cards.contributors.txn')}: ${formatAmount(rm.total_txn_amount)} |
                  {t('cards.contributors.avgBal')}: ${formatAmount(rm.avg_client_balance)}
                </ItemDescription>
              </ItemContent>
            </Item>
          ))
        )}
      </CardContent>
    </Card>
  )
}
