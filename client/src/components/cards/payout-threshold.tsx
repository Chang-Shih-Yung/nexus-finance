"use client"

import * as React from "react"
import { useI18n } from "@/lib/i18n/context"
import { XIcon } from "@/lib/icons"

import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"

const METRIC_KEYS = [
  { key: "transactionAmountNtd", value: "amount" },
  { key: "errorRatePct", value: "error_rate" },
  { key: "latencyMs", value: "latency" },
  { key: "loginCount", value: "logins" },
]

export function PayoutThreshold() {
  const { t } = useI18n()
  const [amount, setAmount] = React.useState([500000])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cards.payoutThreshold.title')}</CardTitle>
        <CardDescription>{t('cards.payoutThreshold.description')}</CardDescription>
        <CardAction>
          <Button variant="ghost" size="icon-sm" className="bg-muted">
            <XIcon className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="preferred-currency">{t('cards.payoutThreshold.monitorMetric')}</FieldLabel>
            <Select defaultValue="amount">
              <SelectTrigger id="preferred-currency" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {METRIC_KEYS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{t(`cards.payoutThreshold.${item.key}`)}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <div className="flex items-baseline justify-between">
              <FieldLabel id="min-payout-label">{t('cards.payoutThreshold.thresholdAmount')}</FieldLabel>
              <span className="text-2xl font-semibold tabular-nums">NT${amount[0].toLocaleString()}</span>
            </div>
            <Slider aria-labelledby="min-payout-label" value={amount} onValueChange={(value) => setAmount(Array.isArray(value) ? [...value] : [value])} min={10000} max={5000000} step={10000} />
            <div className="flex items-center justify-between">
              <FieldDescription>{t('cards.payoutThreshold.minimum')}</FieldDescription>
              <FieldDescription>{t('cards.payoutThreshold.maximum')}</FieldDescription>
            </div>
          </Field>
          <Field>
            <FieldLabel htmlFor="payout-notes">{t('cards.payoutThreshold.notificationNotes')}</FieldLabel>
            <Textarea id="payout-notes" placeholder={t('cards.payoutThreshold.notificationNotesPlaceholder')} className="min-h-[100px]" />
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter>
        <Button className="w-full">{t('cards.payoutThreshold.saveSettings')}</Button>
      </CardFooter>
    </Card>
  )
}
