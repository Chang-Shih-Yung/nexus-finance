"use client"

import { Bar, BarChart } from "recharts"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { useRpc } from "@/hooks/useRpc"

const funnelChartConfig = {
  login: { label: "Login", color: "var(--chart-1)" },
  initiate: { label: "Initiate", color: "var(--chart-2)" },
  complete: { label: "Complete", color: "var(--chart-3)" },
} satisfies ChartConfig

export function SleepReport() {
  const now = new Date()
  const from = new Date(now.getTime() - 30 * 86400000).toISOString()
  const to = now.toISOString()

  const { data, isLoading } = useRpc<
    { step: string; users: number; conversion_rate: number; drop_off_rate: number }[]
  >(["stats-funnel"], "nf_stats_funnel", { p_from: from, p_to: to, p_window_hours: 24 })

  const steps = data ?? []

  // Build stacked chart data — one column per step
  const chartData = steps.map(s => ({
    step: s.step,
    login: s.step === "login" ? Number(s.users) : 0,
    initiate: s.step === "initiate_transfer" ? Number(s.users) : 0,
    complete: s.step === "complete_transfer" ? Number(s.users) : 0,
  }))

  const loginUsers = steps.find(s => s.step === "login")?.users ?? 0
  const initiateUsers = steps.find(s => s.step === "initiate_transfer")?.users ?? 0
  const completeUsers = steps.find(s => s.step === "complete_transfer")?.users ?? 0
  const overallRate = steps.find(s => s.step === "complete_transfer")?.conversion_rate ?? 0

  const badge = Number(overallRate) >= 50 ? "Good" : Number(overallRate) >= 30 ? "Fair" : "Low"

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion Funnel</CardTitle>
        <CardDescription>Last 30 days · Login → Transfer</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <ChartContainer config={funnelChartConfig} className="h-32 w-full">
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
              barSize={16}
            >
              <Bar dataKey="login" stackId="a" fill="var(--color-login)" radius={0} />
              <Bar dataKey="initiate" stackId="a" fill="var(--color-initiate)" radius={0} />
              <Bar dataKey="complete" stackId="a" fill="var(--color-complete)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Login", value: Number(loginUsers).toLocaleString() },
            { label: "Initiate", value: Number(initiateUsers).toLocaleString() },
            { label: "Complete", value: Number(completeUsers).toLocaleString() },
            { label: "Rate", value: `${Number(overallRate).toFixed(0)}%` },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-sm font-medium tabular-nums">{isLoading ? "..." : s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Badge variant="outline">{badge}</Badge>
        <Button variant="outline" size="sm" className="ml-auto">Details</Button>
      </CardFooter>
    </Card>
  )
}
