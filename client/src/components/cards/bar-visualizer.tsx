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

type ChannelDist = {
  channel: string
  event_count: number
  pct: number
}

export function BarVisualizer() {
  const { t } = useI18n()

  const CHANNEL_LABELS: Record<string, string> = {
    web: t('cards.barVisualizer.web'),
    mobile: t('cards.barVisualizer.mobile'),
    atm: t('cards.barVisualizer.atm'),
    desktop: t('cards.barVisualizer.desktop'),
    branch: t('cards.barVisualizer.branch'),
  }

  const { data, isLoading } = useRpc<ChannelDist[]>(
    ["channel-distribution"],
    "nf_channel_distribution",
    { p_days: 7 }
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cards.barVisualizer.title')}</CardTitle>
        <CardDescription>{t('cards.barVisualizer.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {(data ?? []).map((ch) => (
              <div key={ch.channel} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {CHANNEL_LABELS[ch.channel] ?? ch.channel}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {ch.event_count.toLocaleString()} ({ch.pct}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${ch.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
