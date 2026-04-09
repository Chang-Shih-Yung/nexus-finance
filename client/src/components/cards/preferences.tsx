"use client"

import { useI18n } from "@/lib/i18n/context"
import { XIcon } from "@/lib/icons"

import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

const CURRENCY_KEYS = ["twd", "usd", "eur", "jpy"] as const

export function Preferences() {
  const { t } = useI18n()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cards.preferences.title')}</CardTitle>
        <CardDescription>{t('cards.preferences.description')}</CardDescription>
        <CardAction>
          <Button variant="ghost" size="icon-sm" className="bg-muted">
            <XIcon className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="default-currency">{t('cards.preferences.defaultCurrency')}</FieldLabel>
            <Select defaultValue="twd">
              <SelectTrigger id="default-currency" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectGroup>{CURRENCY_KEYS.map((key) => (<SelectItem key={key} value={key}>{t(`cards.preferences.${key}`)}</SelectItem>))}</SelectGroup></SelectContent>
            </Select>
          </Field>
          <FieldSeparator className="-my-4" />
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="public-statistics">{t('cards.preferences.liveDataUpdates')}</FieldLabel>
              <FieldDescription>{t('cards.preferences.liveDataUpdatesDescription')}</FieldDescription>
            </FieldContent>
            <Switch id="public-statistics" defaultChecked />
          </Field>
          <FieldSeparator className="-my-4" />
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="email-notifications">{t('cards.preferences.anomalyAlertNotifications')}</FieldLabel>
              <FieldDescription>{t('cards.preferences.anomalyAlertNotificationsDescription')}</FieldDescription>
            </FieldContent>
            <Switch id="email-notifications" defaultChecked />
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter>
        <Button variant="outline">{t('cards.preferences.reset')}</Button>
        <Button className="ml-auto">{t('cards.preferences.savePreferences')}</Button>
      </CardFooter>
    </Card>
  )
}
