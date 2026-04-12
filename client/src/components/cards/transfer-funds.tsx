"use client"

import { X } from "@/lib/icons"
import { useRpc } from "@/hooks/useRpc"

import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { Item, ItemContent } from "@/components/ui/item"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useI18n } from "@/lib/i18n/context"

function formatCompact(n: number, loc = "en-US") {
  return new Intl.NumberFormat(loc, {
    style: "currency", currency: "TWD", notation: "compact", maximumFractionDigits: 1,
  }).format(n)
}

export function TransferFunds() {
  const { t, locale } = useI18n()
  const { data: summary, isLoading } = useRpc<{
    total_balance: number; account_count: number; primary_currency: string; avg_balance: number
  }>(
    ["account-summary-transfer"], "nf_account_summary", {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { select: (rows: any) => rows[0] ?? { total_balance: 0, account_count: 0, primary_currency: "TWD", avg_balance: 0 } },
  )

  const balance = summary?.total_balance ?? 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cards.transferFunds.title')}</CardTitle>
        <CardDescription>{t('cards.transferFunds.description')}</CardDescription>
        <CardAction>
          <Button variant="ghost" size="icon-sm" className="bg-muted">
            <X className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="transfer-amount">{t('cards.transferFunds.amountToTransfer')}</FieldLabel>
            <InputGroup>
              <InputGroupAddon><InputGroupText>$</InputGroupText></InputGroupAddon>
              <InputGroupInput id="transfer-amount" defaultValue="1,200.00" />
            </InputGroup>
          </Field>
          <Field>
            <FieldLabel id="from-account-label">{t('cards.transferFunds.fromAccount')}</FieldLabel>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select defaultValue="checking">
                <SelectTrigger aria-labelledby="from-account-label" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="checking">{t('cards.transferFunds.mainChecking')} — {formatCompact(balance * 0.3, locale)}</SelectItem>
                    <SelectItem value="savings">{t('cards.transferFunds.savings')} — {formatCompact(balance * 0.5, locale)}</SelectItem>
                    <SelectItem value="wealth">{t('cards.transferFunds.wealth')} — {formatCompact(balance * 0.2, locale)}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          </Field>
          <Field>
            <FieldLabel id="to-account-label">{t('cards.transferFunds.toAccount')}</FieldLabel>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select defaultValue="savings">
                <SelectTrigger aria-labelledby="to-account-label" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="checking">{t('cards.transferFunds.mainChecking')} — {formatCompact(balance * 0.3, locale)}</SelectItem>
                    <SelectItem value="savings">{t('cards.transferFunds.savings')} — {formatCompact(balance * 0.5, locale)}</SelectItem>
                    <SelectItem value="wealth">{t('cards.transferFunds.wealth')} — {formatCompact(balance * 0.2, locale)}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          </Field>
          <Item variant="muted" className="flex-col items-stretch">
            <ItemContent className="gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('cards.transferFunds.estimatedArrival')}</span>
                <span className="text-sm font-medium">{t('common.today')}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('cards.transferFunds.transactionFee')}</span>
                <span className="text-sm font-medium tabular-nums">$0.00</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('cards.transferFunds.totalAmount')}</span>
                <span className="text-sm font-semibold tabular-nums">$1,200.00</span>
              </div>
            </ItemContent>
          </Item>
        </FieldGroup>
      </CardContent>
      <CardFooter>
        <Button className="w-full">{t('cards.transferFunds.confirmTransfer')}</Button>
      </CardFooter>
    </Card>
  )
}
