"use client"

import { Bar, BarChart } from "recharts"
import { X } from "@/lib/icons"

import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item"
import { Skeleton } from "@/components/ui/skeleton"
import { useRpc } from "@/hooks/useRpc"

const miniChartConfig = {
  value: { label: "Amount", color: "var(--chart-2)" },
} satisfies ChartConfig

function formatAmount(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "TWD", maximumFractionDigits: 0 }).format(n)
}

export function DividendIncome() {
  const now = new Date()
  const from = new Date(now.getTime() - 30 * 86400000).toISOString()
  const to = now.toISOString()

  const { data, isLoading } = useRpc<
    { user_name: string; tx_count: number; total_amount: number }[]
  >(["top-transfer-users"], "nf_ai_top_transfer_users", {
    p_from: from, p_to: to, p_limit: 5,
  })

  const totalAmount = (data ?? []).reduce((s, d) => s + Number(d.total_amount), 0)

  const items = (data ?? []).map(d => ({
    name: d.user_name,
    amount: formatAmount(Number(d.total_amount)),
    raw: Number(d.total_amount),
    txCount: Number(d.tx_count),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Transfer Users</CardTitle>
        <CardDescription>Highest volume transfer users (30 days).</CardDescription>
        <CardAction>
          <Button variant="ghost" size="icon-sm" className="bg-muted">
            <X className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="ml-auto h-5 w-20" />
              </div>
            ))}
          </div>
        ) : (
          <ItemGroup>
            {items.map((item) => {
              const barData = [{ q: "val", value: item.raw }]
              return (
                <Item key={item.name} variant="muted">
                  <ItemContent>
                    <ItemTitle className="capitalize">{item.name}</ItemTitle>
                    <ItemDescription>{item.txCount} txns · {Math.round((item.raw / (totalAmount || 1)) * 100)}% of total</ItemDescription>
                  </ItemContent>
                  <ChartContainer config={miniChartConfig} className="hidden h-8 w-24 md:block">
                    <BarChart data={barData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                      <Bar dataKey="value" fill="var(--color-value)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                  <span className="hidden text-sm font-semibold tabular-nums md:block">{item.amount}</span>
                </Item>
              )
            })}
          </ItemGroup>
        )}
      </CardContent>
    </Card>
  )
}
