"use client"

import { Bar, BarChart, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { useRpc } from "@/hooks/useRpc"
import { useI18n } from "@/lib/i18n/context"

export function FeedbackForm() {
  const { t } = useI18n()

  const chartConfig = {
    promoters: { label: t('cards.feedbackForm.promoters'), color: "var(--chart-2)" },
    passives: { label: t('cards.feedbackForm.passives'), color: "var(--chart-4)" },
    detractors: { label: t('cards.feedbackForm.detractors'), color: "var(--chart-5)" },
  } satisfies ChartConfig

  const { data, isLoading } = useRpc<{
    avg_score: number
    total_responses: number
    promoters: number
    passives: number
    detractors: number
    nps_score: number
  }>(
    ["customer-nps"],
    "nf_customer_nps",
    {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { select: (rows: any) => (Array.isArray(rows) ? rows[0] : rows) ?? null },
  )

  const stackData = data
    ? [
        {
          name: "NPS",
          promoters: data.promoters,
          passives: data.passives,
          detractors: data.detractors,
        },
      ]
    : []

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cards.feedbackForm.title')}</CardTitle>
        <CardDescription>
          {isLoading ? (
            <Skeleton className="h-4 w-32" />
          ) : (
            `${data?.total_responses ?? 0} ${t('cards.feedbackForm.totalResponses')}`
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading ? (
          <>
            <Skeleton className="h-14 w-24" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-full" />
          </>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tabular-nums">
                {data?.nps_score ?? 0}
              </span>
              <span className="text-sm text-muted-foreground">{t('cards.feedbackForm.npsScore')}</span>
            </div>

            <ChartContainer config={chartConfig} className="h-10 w-full">
              <BarChart
                data={stackData}
                layout="vertical"
                margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" hide />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent />}
                />
                <Bar
                  dataKey="promoters"
                  stackId="nps"
                  fill="var(--color-promoters)"
                  radius={[4, 0, 0, 4]}
                />
                <Bar
                  dataKey="passives"
                  stackId="nps"
                  fill="var(--color-passives)"
                  radius={0}
                />
                <Bar
                  dataKey="detractors"
                  stackId="nps"
                  fill="var(--color-detractors)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ChartContainer>

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t('cards.feedbackForm.promoters')} {data?.promoters ?? 0}</span>
              <span>{t('cards.feedbackForm.passives')} {data?.passives ?? 0}</span>
              <span>{t('cards.feedbackForm.detractors')} {data?.detractors ?? 0}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
