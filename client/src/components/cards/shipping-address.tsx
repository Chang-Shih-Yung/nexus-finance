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

export function ShippingAddress() {
  const { t } = useI18n()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cards.shippingAddress.title')}</CardTitle>
        <CardDescription>{t('cards.shippingAddress.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="branch-name">{t('cards.shippingAddress.branchName')}</FieldLabel>
            <Input id="branch-name" placeholder={t('cards.shippingAddress.branchNamePlaceholder')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="branch-code">{t('cards.shippingAddress.branchCode')}</FieldLabel>
            <Input id="branch-code" placeholder={t('cards.shippingAddress.branchCodePlaceholder')} />
          </Field>
          <FieldGroup className="grid grid-cols-2">
            <Field>
              <FieldLabel htmlFor="branch-region">{t('cards.shippingAddress.region')}</FieldLabel>
              <Select defaultValue="north">
                <SelectTrigger id="branch-region" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="north">{t('cards.shippingAddress.regionNorth')}</SelectItem>
                    <SelectItem value="central">{t('cards.shippingAddress.regionCentral')}</SelectItem>
                    <SelectItem value="south">{t('cards.shippingAddress.regionSouth')}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="branch-manager">{t('cards.shippingAddress.branchManager')}</FieldLabel>
              <Input id="branch-manager" placeholder={t('cards.shippingAddress.branchManagerPlaceholder')} />
            </Field>
          </FieldGroup>
          <Field>
            <FieldLabel htmlFor="branch-phone">{t('cards.shippingAddress.phone')}</FieldLabel>
            <Input id="branch-phone" placeholder={t('cards.shippingAddress.phonePlaceholder')} />
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm">
          {t('cards.shippingAddress.cancel')}
        </Button>
        <Button size="sm" className="ml-auto">
          {t('cards.shippingAddress.save')}
        </Button>
      </CardFooter>
    </Card>
  )
}
