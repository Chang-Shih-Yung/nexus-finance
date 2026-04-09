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

type FeedbackItem = {
  user_name: string
  channel: string
  score: number
  category: string
  comment: string
  created_at: string
}

function scoreVariant(score: number): "default" | "secondary" | "destructive" {
  if (score >= 9) return "default"
  if (score >= 7) return "secondary"
  return "destructive"
}

export function AssignIssue() {
  const { t } = useI18n()

  const CHANNEL_LABELS: Record<string, string> = {
    app: t('cards.assignIssue.app'),
    branch: t('cards.assignIssue.branch'),
    call_center: t('cards.assignIssue.callCenter'),
    web: t('cards.assignIssue.web'),
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins} ${t('cards.assignIssue.minutesAgo')}`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} ${t('cards.assignIssue.hoursAgo')}`
    return `${Math.floor(hrs / 24)} ${t('cards.assignIssue.daysAgo')}`
  }

  const { data, isLoading } = useRpc<FeedbackItem[]>(
    ["customer-feedback-recent"],
    "nf_customer_feedback_recent",
    { p_limit: 8 }
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cards.assignIssue.title')}</CardTitle>
        <CardDescription>{t('cards.assignIssue.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex max-h-[280px] flex-col gap-1 overflow-y-auto scrollbar-thin">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1 py-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))
          ) : (
            (data ?? []).map((fb, i) => (
              <Item key={i} size="sm">
                <ItemContent>
                  <ItemTitle className="flex items-center gap-2">
                    <Badge variant={scoreVariant(fb.score)} className="tabular-nums text-[0.6rem]">
                      {fb.score}
                    </Badge>
                    <span>{fb.user_name}</span>
                    <Badge variant="outline" className="text-[0.55rem]">
                      {CHANNEL_LABELS[fb.channel] ?? fb.channel}
                    </Badge>
                  </ItemTitle>
                  <ItemDescription className="line-clamp-1">
                    {fb.comment}
                  </ItemDescription>
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(fb.created_at)}
                  </span>
                </ItemContent>
              </Item>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
