"use client"

import { useI18n } from "@/lib/i18n/context"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export function ReportBug() {
  const { t } = useI18n()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cards.reportBug.title')}</CardTitle>
        <CardDescription>{t('cards.reportBug.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="bug-title">{t('cards.reportBug.incidentTitle')}</FieldLabel>
            <Input id="bug-title" placeholder={t('cards.reportBug.incidentTitlePlaceholder')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="bug-severity">{t('cards.reportBug.severity')}</FieldLabel>
              <Select defaultValue="medium">
                <SelectTrigger id="bug-severity" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="critical">{t('cards.reportBug.p1Critical')}</SelectItem>
                    <SelectItem value="high">{t('cards.reportBug.p2High')}</SelectItem>
                    <SelectItem value="medium">{t('cards.reportBug.p3Medium')}</SelectItem>
                    <SelectItem value="low">{t('cards.reportBug.p4Low')}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="bug-component">{t('cards.reportBug.impactScope')}</FieldLabel>
              <Select defaultValue="core">
                <SelectTrigger id="bug-component" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="core">{t('cards.reportBug.coreSystem')}</SelectItem>
                    <SelectItem value="payment">{t('cards.reportBug.paymentGateway')}</SelectItem>
                    <SelectItem value="web">{t('cards.reportBug.onlineBanking')}</SelectItem>
                    <SelectItem value="mobile">{t('cards.reportBug.mobileBanking')}</SelectItem>
                    <SelectItem value="atm">{t('cards.reportBug.atm')}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="bug-steps">{t('cards.reportBug.incidentDescription')}</FieldLabel>
            <Textarea
              id="bug-steps"
              placeholder={t('cards.reportBug.incidentDescriptionPlaceholder')}
              className="min-h-24 resize-none"
            />
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter>
        <Field orientation="horizontal" className="justify-end">
          <Button variant="outline">{t('cards.reportBug.attachFile')}</Button>
          <Button>{t('cards.reportBug.submitReport')}</Button>
        </Field>
      </CardFooter>
    </Card>
  )
}
