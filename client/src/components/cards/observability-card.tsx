"use client"

import { CircleAlertIcon } from "@/lib/icons"

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

type FraudSummary = {
  total_alerts: number
  open_count: number
  investigating: number
  resolved: number
  false_positive: number
  critical_count: number
  high_count: number
  total_amount: number
}

export function ObservabilityCard() {
  const { t } = useI18n()
  const { data, isLoading } = useRpc<FraudSummary[]>(
    ["fraud-summary"],
    "nf_fraud_summary",
    {}
  )

  const fraud = data?.[0]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CircleAlertIcon className="size-4 text-destructive" />
          <CardTitle className="text-base">{t('cards.observabilityCard.title')}</CardTitle>
        </div>
        <CardDescription>{t('cards.observabilityCard.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading || !fraud ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-8 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-4 w-40" />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="text-2xl font-bold tabular-nums">
              {fraud.open_count}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                {t('cards.observabilityCard.pending')}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {fraud.critical_count > 0 && (
                <Badge variant="destructive">
                  {fraud.critical_count} {t('cards.observabilityCard.critical')}
                </Badge>
              )}
              {fraud.high_count > 0 && (
                <Badge variant="secondary">
                  {fraud.high_count} {t('cards.observabilityCard.highRisk')}
                </Badge>
              )}
              <Badge variant="outline">
                {fraud.investigating} {t('cards.observabilityCard.investigating')}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {t('cards.observabilityCard.involvedAmount')}{" "}
              <span className="font-semibold text-foreground tabular-nums">
                NT${fraud.total_amount.toLocaleString()}
              </span>
            </div>
            <div className="flex gap-4 border-t pt-2 text-xs text-muted-foreground tabular-nums">
              <span>{t('cards.observabilityCard.resolved')} {fraud.resolved}</span>
              <span>{t('cards.observabilityCard.falsePositive')} {fraud.false_positive}</span>
              <span>{t('cards.observabilityCard.total')} {fraud.total_alerts}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
