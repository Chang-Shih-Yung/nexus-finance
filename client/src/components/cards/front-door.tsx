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

type FraudAlert = {
  id: number
  user_name: string
  alert_type: string
  severity: string
  description: string
  status: string
  amount: number | null
  created_at: string
}

const SEVERITY_VARIANT: Record<string, "destructive" | "secondary" | "outline"> = {
  critical: "destructive",
  high: "destructive",
  medium: "secondary",
  low: "outline",
}

export function FrontDoor() {
  const { t } = useI18n()

  const SEVERITY_LABEL: Record<string, string> = {
    critical: t('cards.frontDoor.severityCritical'),
    high: t('cards.frontDoor.severityHigh'),
    medium: t('cards.frontDoor.severityMedium'),
    low: t('cards.frontDoor.severityLow'),
  }

  function timeAgo(dateStr: string): string {
    // eslint-disable-next-line react-hooks/purity
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins} ${t('cards.frontDoor.minutesAgo')}`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} ${t('cards.frontDoor.hoursAgo')}`
    return `${Math.floor(hrs / 24)} ${t('cards.frontDoor.daysAgo')}`
  }

  const { data, isLoading } = useRpc<FraudAlert[]>(
    ["fraud-alerts-list"],
    "nf_fraud_alerts_list",
    { p_limit: 8 }
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cards.frontDoor.title')}</CardTitle>
        <CardDescription>{t('cards.frontDoor.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex max-h-[140px] flex-col gap-1 overflow-y-auto scrollbar-thin">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1 py-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))
          ) : !data?.length ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t('cards.frontDoor.noSuspiciousTransactions')}
            </p>
          ) : (
            data.map((alert) => (
              <Item key={alert.id} size="sm">
                <ItemContent>
                  <ItemTitle className="flex items-center gap-2">
                    <span>{alert.user_name}</span>
                    <Badge
                      variant={SEVERITY_VARIANT[alert.severity] ?? "outline"}
                      className="text-[0.6rem]"
                    >
                      {SEVERITY_LABEL[alert.severity] ?? alert.severity}
                    </Badge>
                  </ItemTitle>
                  <ItemDescription className="line-clamp-1">
                    {alert.description}
                  </ItemDescription>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {alert.amount && (
                      <span className="tabular-nums">
                        NT${alert.amount.toLocaleString()}
                      </span>
                    )}
                    <span>{timeAgo(alert.created_at)}</span>
                  </div>
                </ItemContent>
              </Item>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
