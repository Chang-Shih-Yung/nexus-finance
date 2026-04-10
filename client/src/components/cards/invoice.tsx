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
import { useI18n } from '@/lib/i18n/context'
import { ERROR_CODE_LABELS } from '@/lib/i18n/labels'

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

function formatCurrency(value: number, currency = "TWD", loc = "en-US") {
  return new Intl.NumberFormat(loc, {
    style: "currency", currency, maximumFractionDigits: 0,
  }).format(value)
}

export function Invoice() {
  const { t, locale } = useI18n()
  const errorLabels = ERROR_CODE_LABELS[locale] ?? {}

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(locale, { month: "short", day: "numeric" })
  }
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
        <CardTitle>{t('cards.invoice.title')}</CardTitle>
        <CardDescription>{t('cards.invoice.description')} · {items.length} {t('cards.invoice.failures')}</CardDescription>
        <CardAction>
          <Badge variant="destructive">{isLoading ? "..." : formatCurrency(totalLost, "TWD", locale)} {t('cards.invoice.lost')}</Badge>
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
                <TableHead>{t('cards.invoice.user')}</TableHead>
                <TableHead>{t('cards.invoice.error')}</TableHead>
                <TableHead className="text-right">{t('cards.invoice.amount')}</TableHead>
                <TableHead className="text-right">{t('cards.invoice.date')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.user_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{errorLabels[row.error_code] ?? row.error_code}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(Number(row.amount), row.currency, locale)}
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
        <Button variant="outline" size="sm">{t('cards.invoice.exportCsv')}</Button>
        <Button size="sm" className="ml-auto">{t('cards.invoice.investigate')}</Button>
      </CardFooter>
    </Card>
  )
}
