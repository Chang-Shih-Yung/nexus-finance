"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { useRpc } from "@/hooks/useRpc"

interface FailedTx {
  id: number
  user_name: string
  tier: string
  amount: number
  currency: string
  from_account: string
  to_account: string
  error_code: string
  error_message: string
  channel: string
  created_at: string
}

function formatCurrency(value: number, currency = "TWD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency, maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function Invoice() {
  const now = new Date()
  const from = new Date(now.getTime() - 30 * 86400000).toISOString()
  const to = now.toISOString()

  const { data, isLoading } = useRpc<FailedTx[]>(
    ["failed-transactions"], "nf_stats_failed_transactions",
    { p_limit: 8, p_from: from, p_to: to },
  )

  const items = data ?? []
  const totalLost = items.reduce((s, t) => s + Number(t.amount), 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Failed Transactions</CardTitle>
        <CardDescription>Last 30 days · {items.length} failures</CardDescription>
        <CardAction>
          <Badge variant="destructive">{isLoading ? "..." : formatCurrency(totalLost)} lost</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Error</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.user_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{row.error_code}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(Number(row.amount), row.currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatDate(row.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm">Export CSV</Button>
        <Button size="sm" className="ml-auto">Investigate</Button>
      </CardFooter>
    </Card>
  )
}
