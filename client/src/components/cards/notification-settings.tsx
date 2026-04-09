"use client"

import * as React from "react"
import { useI18n } from "@/lib/i18n/context"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"

const NOTIFICATION_KEYS = [
  { id: "transactions", labelKey: "largeTransactionAlert", descKey: "largeTransactionAlertDescription", defaultChecked: true },
  { id: "security", labelKey: "securityEventNotification", descKey: "securityEventNotificationDescription", defaultChecked: true },
  { id: "goals", labelKey: "goalAchievementReminder", descKey: "goalAchievementReminderDescription", defaultChecked: false },
  { id: "market", labelKey: "marketMovementNotification", descKey: "marketMovementNotificationDescription", defaultChecked: false },
]

export function NotificationSettings() {
  const { t } = useI18n()
  const [checked, setChecked] = React.useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATION_KEYS.map((n) => [n.id, n.defaultChecked]))
  )

  const allChecked = NOTIFICATION_KEYS.every((n) => checked[n.id])
  const someChecked = NOTIFICATION_KEYS.some((n) => checked[n.id]) && !allChecked

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cards.notificationSettings.title')}</CardTitle>
        <CardDescription>{t('cards.notificationSettings.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field orientation="horizontal">
            <Checkbox
              id="notify-all"
              checked={someChecked ? "indeterminate" : allChecked}
              onCheckedChange={(v) => setChecked(Object.fromEntries(NOTIFICATION_KEYS.map((n) => [n.id, !!v])))}
            />
            <FieldContent>
              <FieldLabel htmlFor="notify-all">{t('cards.notificationSettings.selectAll')}</FieldLabel>
            </FieldContent>
          </Field>
          {NOTIFICATION_KEYS.map((n) => (
            <Field key={n.id} orientation="horizontal">
              <Checkbox
                id={`notify-${n.id}`}
                checked={checked[n.id]}
                onCheckedChange={(v) => setChecked((prev) => ({ ...prev, [n.id]: !!v }))}
              />
              <FieldContent>
                <FieldLabel htmlFor={`notify-${n.id}`}>{t(`cards.notificationSettings.${n.labelKey}`)}</FieldLabel>
                <FieldDescription>{t(`cards.notificationSettings.${n.descKey}`)}</FieldDescription>
              </FieldContent>
            </Field>
          ))}
        </FieldGroup>
      </CardContent>
      <CardFooter>
        <Button className="w-full">{t('cards.notificationSettings.savePreferences')}</Button>
      </CardFooter>
    </Card>
  )
}
