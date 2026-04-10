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

type SystemOverview = {
  total_components: number
  operational: number
  degraded: number
  outage: number
  avg_uptime: number
}

type SystemComponent = {
  name: string
  category: string
  status: string
  uptime_pct: number
  avg_response_ms: number
  last_incident: string
  last_check: string
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  operational: "default",
  degraded: "secondary",
  outage: "destructive",
  maintenance: "outline",
}

const STATUS_LABEL_KEYS: Record<string, string> = {
  operational: "cards.codespacesCard.operational",
  degraded: "cards.codespacesCard.degraded",
  outage: "cards.codespacesCard.outage",
  maintenance: "cards.codespacesCard.maintenance",
}

export function CodespacesCard() {
  const { t } = useI18n()
  const { data: overview, isLoading: l1 } = useRpc<SystemOverview[]>(
    ["system-overview"],
    "nf_system_overview"
  )
  const { data: components, isLoading: l2 } = useRpc<SystemComponent[]>(
    ["system-status"],
    "nf_system_status"
  )

  const o = overview?.[0]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cards.codespacesCard.title')}</CardTitle>
        <CardDescription>{t('cards.codespacesCard.description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {l1 || !o ? (
          <Skeleton className="h-6 w-48" />
        ) : (
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="tabular-nums">
              <span className="font-semibold">{o.operational}</span>
              <span className="text-muted-foreground">/{o.total_components} {t('cards.codespacesCard.operational')}</span>
            </span>
            {o.degraded > 0 && (
              <Badge variant="secondary">{o.degraded} {t('cards.codespacesCard.degraded')}</Badge>
            )}
            {o.outage > 0 && (
              <Badge variant="destructive">{o.outage} {t('cards.codespacesCard.outage')}</Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {t('cards.codespacesCard.avgUptime')} {o.avg_uptime}%
            </span>
          </div>
        )}
        <div className="flex max-h-[300px] flex-col gap-1 overflow-y-auto scrollbar-thin">
          {l2 ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))
          ) : (
            (components ?? []).map((c) => (
              <Item key={c.name} size="sm">
                <ItemContent>
                  <ItemTitle className="flex items-center gap-2">
                    <span>{c.name}</span>
                    <Badge
                      variant={STATUS_VARIANT[c.status] ?? "outline"}
                      className="text-[0.6rem]"
                    >
                      {STATUS_LABEL_KEYS[c.status] ? t(STATUS_LABEL_KEYS[c.status]) : c.status}
                    </Badge>
                  </ItemTitle>
                  <ItemDescription>
                    {c.avg_response_ms}ms · {t('cards.codespacesCard.avgUptime')} {c.uptime_pct}%
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
