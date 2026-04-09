"use client"

import { useI18n } from "@/lib/i18n/context"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function NewMilestone() {
  const { t } = useI18n()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cards.newMilestone.title')}</CardTitle>
        <CardDescription>{t('cards.newMilestone.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="goal-name">{t('cards.newMilestone.goalName')}</FieldLabel>
            <Input id="goal-name" placeholder={t('cards.newMilestone.goalNamePlaceholder')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="target-amount">{t('cards.newMilestone.targetAmount')}</FieldLabel>
              <Input id="target-amount" defaultValue="NT$50,000,000" />
            </Field>
            <Field>
              <FieldLabel htmlFor="target-date">{t('cards.newMilestone.targetDate')}</FieldLabel>
              <Input id="target-date" defaultValue="2026-06-30" />
            </Field>
          </div>
        </FieldGroup>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <Button className="w-full">{t('cards.newMilestone.createGoal')}</Button>
        <Button variant="outline" className="w-full">{t('cards.newMilestone.cancel')}</Button>
      </CardFooter>
    </Card>
  )
}
