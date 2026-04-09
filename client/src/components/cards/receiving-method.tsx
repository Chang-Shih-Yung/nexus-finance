"use client"

import { useI18n } from "@/lib/i18n/context"
import { XIcon } from "@/lib/icons"

import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export function ReceivingMethod() {
  const { t } = useI18n()

  return (
    <Card>
      <CardHeader>
        <CardDescription>{t('cards.receivingMethod.paymentPreferences')}</CardDescription>
        <CardTitle>{t('cards.receivingMethod.title')}</CardTitle>
        <CardAction>
          <Button variant="ghost" size="icon-sm" className="bg-muted">
            <XIcon className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="account-holder">{t('cards.receivingMethod.accountHolder')}</FieldLabel>
            <Input id="account-holder" defaultValue={t('cards.receivingMethod.accountHolderDefault')} />
          </Field>
          <div>
            <FieldLabel className="mb-2">{t('cards.receivingMethod.channelSelection')}</FieldLabel>
            <RadioGroup defaultValue="bank" className="grid grid-cols-1 items-start gap-3 md:grid-cols-2">
              <label htmlFor="method-bank">
                <Field orientation="horizontal" className="pb-2.5">
                  <RadioGroupItem value="bank" id="method-bank" />
                  <FieldContent>
                    <FieldDescription className="font-medium text-foreground">{t('cards.receivingMethod.bankTransfer')}</FieldDescription>
                    <FieldDescription>{t('cards.receivingMethod.bankTransferDescription')}</FieldDescription>
                  </FieldContent>
                </Field>
              </label>
              <label htmlFor="method-mobile">
                <Field orientation="horizontal" className="pb-2.5">
                  <RadioGroupItem value="mobile" id="method-mobile" />
                  <FieldContent>
                    <FieldDescription className="font-medium text-foreground">{t('cards.receivingMethod.mobilePayment')}</FieldDescription>
                    <FieldDescription className="line-clamp-1">{t('cards.receivingMethod.mobilePaymentDescription')}</FieldDescription>
                  </FieldContent>
                </Field>
              </label>
            </RadioGroup>
          </div>
          <Field>
            <FieldLabel htmlFor="iban">{t('cards.receivingMethod.accountId')}</FieldLabel>
            <Input id="iban" placeholder={t('cards.receivingMethod.accountIdPlaceholder')} />
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter>
        <Button className="w-full" disabled>{t('cards.receivingMethod.saveChannelSettings')}</Button>
      </CardFooter>
    </Card>
  )
}
