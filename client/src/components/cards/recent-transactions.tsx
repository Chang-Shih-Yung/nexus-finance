"use client"

import {
  Coffee, ShoppingCart, Wallet, Car, Tv, MoreHorizontal,
  ArrowLeftRight, CreditCard, Globe, DollarSign, Send,
} from "@/lib/icons"
import { useRpc } from "@/hooks/useRpc"

import { Button } from "@/components/ui/button"
import {
  Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import type { ComponentType } from "react"

// ── Category → icon mapping ─────────────────────────────────────────────────
const categoryIcons: Record<string, ComponentType<{ className?: string }>> = {
  "food_drink": Coffee,
  "groceries": ShoppingCart,
  "income": Wallet,
  "transport": Car,
  "entertainment": Tv,
  "transfer": ArrowLeftRight,
  "payment": CreditCard,
  "banking": DollarSign,
  "mobile": Send,
  "online": Globe,
}

function getCategoryIcon(category: string) {
  return categoryIcons[category.toLowerCase()] ?? ArrowLeftRight
}

// ── Format helpers ──────────────────────────────────────────────────────────
function formatAmount(amount: number, currency: string) {
  const abs = Math.abs(amount)
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
  }).format(abs)
  return amount >= 0 ? `+${formatted}` : `-${formatted}`
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)
  if (diffDays === 0) {
    return `Today, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
  }
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return d.toLocaleDateString("en-US", { weekday: "long" })
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// ── Types ───────────────────────────────────────────────────────────────────
interface Transaction {
  id: number
  user_name: string
  amount: number
  currency: string
  from_account: string
  to_account: string
  status: string
  category: string
  channel: string
  created_at: string
}

// ── Component ───────────────────────────────────────────────────────────────
export function RecentTransactions() {
  const { data, isLoading } = useRpc<Transaction[]>(
    ["recent-transactions"],
    "nf_recent_transactions",
    { p_limit: 5 },
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>Your latest account activity.</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm">View All</Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : (
          <Table>
            <TableBody>
              {(data ?? []).map((tx) => {
                const Icon = getCategoryIcon(tx.category)
                const positive = tx.amount >= 0
                return (
                  <TableRow key={tx.id}>
                    <TableCell className="w-10">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                        <Icon className="size-4 shrink-0" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{tx.user_name}</span>
                        <span className="text-sm text-muted-foreground capitalize">
                          {tx.category.replace(/_/g, " ")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(tx.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`text-sm font-semibold tabular-nums ${positive ? "text-emerald-500" : ""}`}>
                        {formatAmount(tx.amount, tx.currency)}
                      </span>
                    </TableCell>
                    <TableCell className="w-8">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View details</DropdownMenuItem>
                          <DropdownMenuItem>Add note</DropdownMenuItem>
                          <DropdownMenuItem>Categorize</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>Dispute</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
