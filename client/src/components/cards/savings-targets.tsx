"use client"

import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { Item, ItemContent, ItemDescription, ItemFooter, ItemGroup } from "@/components/ui/item"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { useRpc } from "@/hooks/useRpc"
import { useI18n } from '@/lib/i18n/context'

function getDateRange(offsetMonths: number) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 0)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

function formatCompact(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "TWD", notation: "compact", maximumFractionDigits: 1,
  }).format(n)
}

export function SavingsTargets() {
  const { t } = useI18n()
  const current = getDateRange(0)
  const previous = getDateRange(-1)

  const { data: txnCompare, isLoading: l1 } = useRpc<
    { current_total: number; previous_total: number; change_pct: number }[]
  >(["period-compare-txn"], "nf_period_compare", {
    p_metric_key: "txn_amount",
    p_current_start: current.start,
    p_current_end: current.end,
    p_previous_start: previous.start,
    p_previous_end: previous.end,
  })

  const { data: loginCompare, isLoading: l2 } = useRpc<
    { current_total: number; previous_total: number; change_pct: number }[]
  >(["period-compare-login"], "nf_period_compare", {
    p_metric_key: "login_count",
    p_current_start: current.start,
    p_current_end: current.end,
    p_previous_start: previous.start,
    p_previous_end: previous.end,
  })

  const isLoading = l1 || l2
  const txn = txnCompare?.[0]
  const login = loginCompare?.[0]

  // Progress: current vs previous as percentage (capped at 100)
  const txnPct = txn && Number(txn.previous_total) > 0
    ? Math.min(Math.round((Number(txn.current_total) / Number(txn.previous_total)) * 100), 100)
    : 0
  const loginPct = login && Number(login.previous_total) > 0
    ? Math.min(Math.round((Number(login.current_total) / Number(login.previous_total)) * 100), 100)
    : 0

  return (
    <div className="grid grid-cols-2 gap-(--gap)">
      <Card>
        <CardHeader>
          <CardTitle>{t('cards.savingsTargets.monthOverMonth')}</CardTitle>
          <CardDescription>{t('cards.savingsTargets.currentVsPrevious')}</CardDescription>
          <CardAction><Button variant="outline" size="sm">{t('common.details')}</Button></CardAction>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <ItemGroup className="gap-3">
              <Item variant="muted" className="flex-col items-stretch">
                <ItemContent className="gap-3">
                  <ItemDescription className="text-xs font-medium tracking-wider text-muted-foreground uppercase">{t('cards.savingsTargets.transactionVolume')}</ItemDescription>
                  <span className="text-3xl font-semibold tabular-nums">{formatCompact(Number(txn?.current_total ?? 0))}</span>
                  <Progress value={txnPct} />
                </ItemContent>
                <ItemFooter>
                  <span className="text-sm text-muted-foreground">{txnPct}% {t('cards.savingsTargets.ofLastMonth')}</span>
                  <span className="text-sm font-medium tabular-nums">{formatCompact(Number(txn?.previous_total ?? 0))}</span>
                </ItemFooter>
              </Item>
              <Item variant="muted" className="flex-col items-stretch">
                <ItemContent className="gap-3">
                  <ItemDescription className="text-xs font-medium tracking-wider text-muted-foreground uppercase">{t('cards.savingsTargets.loginActivity')}</ItemDescription>
                  <span className="text-3xl font-semibold tabular-nums">{Number(login?.current_total ?? 0).toLocaleString()}</span>
                  <Progress value={loginPct} />
                </ItemContent>
                <ItemFooter>
                  <span className="text-sm text-muted-foreground">{loginPct}% {t('cards.savingsTargets.ofLastMonth')}</span>
                  <span className="text-sm font-medium tabular-nums">{Number(login?.previous_total ?? 0).toLocaleString()}</span>
                </ItemFooter>
              </Item>
            </ItemGroup>
          )}
        </CardContent>
        <CardFooter>
          <CardDescription className="text-center">
            {isLoading ? t('common.loading') : `${t('cards.savingsTargets.transactionVolume')} ${Number(txn?.change_pct ?? 0) >= 0 ? t('cards.savingsTargets.up') : t('cards.savingsTargets.down')} ${Math.abs(Number(txn?.change_pct ?? 0)).toFixed(1)}%`}
          </CardDescription>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t('cards.savingsTargets.buyInvestment')}</CardTitle></CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3">
          <FieldGroup className="flex-1">
            <Field>
              <FieldLabel htmlFor="invest-amount">{t('cards.savingsTargets.amountToInvest')}</FieldLabel>
              <InputGroup>
                <InputGroupAddon><InputGroupText>$</InputGroupText></InputGroupAddon>
                <InputGroupInput id="invest-amount" defaultValue="1,000.00" />
              </InputGroup>
            </Field>
            <Field>
              <FieldLabel htmlFor="invest-type">{t('cards.savingsTargets.orderType')}</FieldLabel>
              <NativeSelect id="invest-type" defaultValue="market">
                <NativeSelectOption value="market">{t('cards.savingsTargets.marketOrder')}</NativeSelectOption>
                <NativeSelectOption value="limit">{t('cards.savingsTargets.limitOrder')}</NativeSelectOption>
                <NativeSelectOption value="stop">{t('cards.savingsTargets.stopOrder')}</NativeSelectOption>
              </NativeSelect>
              <FieldDescription>{t('cards.savingsTargets.marketOrderDescription')}</FieldDescription>
            </Field>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('cards.savingsTargets.estimatedShares')}</span>
                <span className="text-sm font-semibold tabular-nums">1.95</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('cards.savingsTargets.buyingPower')}</span>
                <span className="text-sm font-semibold tabular-nums">$12,450.00</span>
              </div>
            </div>
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <Button className="w-full">{t('cards.savingsTargets.reviewOrder')}</Button>
          <CardDescription className="text-center">{t('cards.savingsTargets.tradeExecutionNote')}</CardDescription>
        </CardFooter>
      </Card>
    </div>
  )
}
