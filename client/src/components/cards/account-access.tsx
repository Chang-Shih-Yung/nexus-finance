"use client"

import { useI18n } from "@/lib/i18n/context"
import { CircleAlertIcon, ArrowRightIcon } from "@/lib/icons"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item"

export function AccountAccess() {
  const { t } = useI18n()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cards.accountAccess.title')}</CardTitle>
        <CardDescription>{t('cards.accountAccess.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email-address">{t('cards.accountAccess.loginEmail')}</FieldLabel>
            <Input id="email-address" type="email" defaultValue="admin@nexusfinance.tw" />
          </Field>
          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="current-password">{t('cards.accountAccess.password')}</FieldLabel>
              <a href="#" className="text-xs font-medium tracking-wider text-muted-foreground uppercase hover:text-foreground">{t('cards.accountAccess.forgotPassword')}</a>
            </div>
            <Input id="current-password" type="password" defaultValue="password123" />
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter className="flex-col gap-4">
        <Button className="w-full">{t('cards.accountAccess.updateSecuritySettings')}</Button>
        <Item variant="muted" asChild>
          <a href="#">
            <ItemMedia variant="icon">
              <CircleAlertIcon className="text-destructive" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{t('cards.accountAccess.dangerZone')}</ItemTitle>
              <ItemDescription className="line-clamp-1">{t('cards.accountAccess.dangerZoneDescription')}</ItemDescription>
            </ItemContent>
            <ArrowRightIcon className="size-4" />
          </a>
        </Item>
      </CardFooter>
    </Card>
  )
}
