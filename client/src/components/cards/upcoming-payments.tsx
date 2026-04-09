"use client"

import * as React from "react"
import dynamic from "next/dynamic"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item"
import { Skeleton } from "@/components/ui/skeleton"
import { useRpc } from "@/hooks/useRpc"

const Calendar = dynamic(
  () => import("@/components/ui/calendar").then((mod) => mod.Calendar),
  { ssr: false, loading: () => <div className="h-[280px] w-full" /> }
)

interface PendingTx {
  id: number
  user_name: string
  amount: number
  currency: string
  category: string
  created_at: string
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: currency || "TWD", minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function UpcomingPayments() {
  const [date, setDate] = React.useState<Date | undefined>(undefined)

  const { data, isLoading } = useRpc<PendingTx[]>(
    ["pending-transactions"], "nf_pending_transactions", { p_limit: 20 },
  )

  const items = data ?? []

  // Dates that have pending transactions (for calendar dot indicators)
  const pendingDates = React.useMemo(() => {
    return items.map(tx => {
      const d = new Date(tx.created_at)
      return new Date(d.getFullYear(), d.getMonth(), d.getDate())
    })
  }, [items])

  // Filter by selected date, or show all if no date selected
  const filtered = date
    ? items.filter(tx => isSameDay(new Date(tx.created_at), date))
    : items

  const description = date
    ? `${filtered.length} payment${filtered.length !== 1 ? "s" : ""} on ${formatDate(date.toISOString())}`
    : `${items.length} pending transaction${items.length !== 1 ? "s" : ""}`

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Payments</CardTitle>
        <CardDescription>{isLoading ? "Loading..." : description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Item variant="outline" className="justify-center">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => setDate(prev => prev && d && isSameDay(prev, d) ? undefined : d)}
            className="w-full"
            modifiers={{ pending: pendingDates }}
            modifiersClassNames={{ pending: "bg-primary/15 font-semibold text-primary" }}
          />
        </Item>
        <div className="max-h-[220px] overflow-y-auto scrollbar-thin">
          <ItemGroup className="w-full">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Item key={i} variant="muted">
                  <ItemContent>
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20 mt-1" />
                  </ItemContent>
                  <Skeleton className="h-5 w-16" />
                </Item>
              ))
            ) : filtered.length > 0 ? (
              filtered.map((tx) => (
                <Item key={tx.id} variant="muted">
                  <ItemContent>
                    <ItemTitle>{tx.user_name}</ItemTitle>
                    <ItemDescription>
                      {formatDate(tx.created_at)} · <span className="capitalize">{tx.category}</span>
                    </ItemDescription>
                  </ItemContent>
                  <Badge variant="secondary">{formatAmount(tx.amount, tx.currency)}</Badge>
                </Item>
              ))
            ) : (
              <Item variant="muted">
                <ItemContent>
                  <ItemTitle className="text-muted-foreground">
                    {date ? "No payments on this date" : "No pending payments"}
                  </ItemTitle>
                  <ItemDescription>
                    {date ? "Try selecting another date." : "All transactions are settled."}
                  </ItemDescription>
                </ItemContent>
              </Item>
            )}
          </ItemGroup>
        </div>
      </CardContent>
    </Card>
  )
}
