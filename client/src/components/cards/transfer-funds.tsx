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

function formatCompact(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "TWD", notation: "compact", maximumFractionDigits: 1,
  }).format(n)
}

export function TransferFunds() {
  const { data: summary, isLoading } = useRpc<{
    total_balance: number; account_count: number; primary_currency: string; avg_balance: number
  }>(
    ["account-summary-transfer"], "nf_account_summary", {},
    { select: (rows: any) => rows[0] ?? { total_balance: 0, account_count: 0, primary_currency: "TWD", avg_balance: 0 } },
  )

  const balance = summary?.total_balance ?? 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer Funds</CardTitle>
        <CardDescription>Move money between your connected accounts.</CardDescription>
        <CardAction>
          <Button variant="ghost" size="icon-sm" className="bg-muted">
            <X className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="transfer-amount">Amount to Transfer</FieldLabel>
            <InputGroup>
              <InputGroupAddon><InputGroupText>$</InputGroupText></InputGroupAddon>
              <InputGroupInput id="transfer-amount" defaultValue="1,200.00" />
            </InputGroup>
          </Field>
          <Field>
            <FieldLabel htmlFor="from-account">From Account</FieldLabel>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select defaultValue="checking">
                <SelectTrigger id="from-account" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="checking">Main Checking — {formatCompact(balance * 0.3)}</SelectItem>
                    <SelectItem value="savings">Savings — {formatCompact(balance * 0.5)}</SelectItem>
                    <SelectItem value="wealth">Wealth — {formatCompact(balance * 0.2)}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="to-account">To Account</FieldLabel>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select defaultValue="savings">
                <SelectTrigger id="to-account" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="checking">Main Checking — {formatCompact(balance * 0.3)}</SelectItem>
                    <SelectItem value="savings">Savings — {formatCompact(balance * 0.5)}</SelectItem>
                    <SelectItem value="wealth">Wealth — {formatCompact(balance * 0.2)}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          </Field>
          <Item variant="muted" className="flex-col items-stretch">
            <ItemContent className="gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estimated arrival</span>
                <span className="text-sm font-medium">Today</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Transaction fee</span>
                <span className="text-sm font-medium tabular-nums">$0.00</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total amount</span>
                <span className="text-sm font-semibold tabular-nums">$1,200.00</span>
              </div>
            </ItemContent>
          </Item>
        </FieldGroup>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Confirm Transfer</Button>
      </CardFooter>
    </Card>
  )
}
