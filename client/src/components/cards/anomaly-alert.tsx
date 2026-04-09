"use client"

import { CircleAlertIcon, CheckCircle2Icon } from "@/lib/icons"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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

type AnomalyRow = {
  metric_key: string
  dimension: string
  dimension_value: string
  today_value: number
  avg_7d: number
  stddev_7d: number
  z_score: number
}

export function AnomalyAlert() {
  const { t } = useI18n()
  const { data, isLoading } = useRpc<AnomalyRow[]>(
    ["anomaly-check"],
    "nf_anomaly_check",
    {}
  )

  const anomalies = (data ?? []).sort(
    (a, b) => Math.abs(b.z_score) - Math.abs(a.z_score)
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cards.anomalyAlert.title')}</CardTitle>
        <CardDescription>{t('cards.anomalyAlert.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : anomalies.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <CheckCircle2Icon className="size-8 text-green-500" />
            <p className="text-sm font-medium">{t('cards.anomalyAlert.noAnomalies')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {anomalies.map((a) => {
              const absZ = Math.abs(a.z_score)
              const isCritical = absZ > 3
              return (
                <Item key={`${a.metric_key}-${a.dimension_value}`} size="sm">
                  <ItemMedia>
                    <CircleAlertIcon
                      className={`size-5 ${isCritical ? "text-red-500" : "text-yellow-500"}`}
                    />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle className="flex items-center gap-2">
                      {a.metric_key}
                      <Badge
                        variant={isCritical ? "destructive" : "secondary"}
                        className={
                          !isCritical
                            ? "border-yellow-300 bg-yellow-100 text-yellow-800 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                            : ""
                        }
                      >
                        {isCritical ? t('cards.anomalyAlert.critical') : t('cards.anomalyAlert.warning')}
                      </Badge>
                    </ItemTitle>
                    <ItemDescription>
                      {a.dimension}: {a.dimension_value} | {t('cards.anomalyAlert.todayValue')}:{" "}
                      {a.today_value.toLocaleString()} | {t('cards.anomalyAlert.avg7d')}:{" "}
                      {a.avg_7d.toFixed(1)} | {t('cards.anomalyAlert.zScore')}: {a.z_score.toFixed(2)}
                    </ItemDescription>
                  </ItemContent>
                </Item>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
