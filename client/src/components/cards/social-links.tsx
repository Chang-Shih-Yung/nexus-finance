"use client"

import { useI18n } from "@/lib/i18n/context"
import { ServerIcon, ZapIcon, SearchIcon, MonitorIcon } from "@/lib/icons"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"

const LINK_ITEMS: { icon: typeof ServerIcon; labelKey: string; id: string; value?: string; placeholder?: string }[] = [
  { icon: ServerIcon, labelKey: "coreBankingApi", id: "core-api", value: "https://core.nexusfinance.tw/api/v2" },
  { icon: ZapIcon, labelKey: "paymentGateway", id: "payment-gw", value: "https://pay.nexusfinance.tw" },
  { icon: SearchIcon, labelKey: "riskControlSystem", id: "risk-api", placeholder: "https://risk.nexusfinance.tw/api" },
  { icon: MonitorIcon, labelKey: "externalDataSource", id: "ext-data", placeholder: "https://data.provider.com/feed" },
]

export function SocialLinks() {
  const { t } = useI18n()

  return (
    <Card>
      <CardHeader><CardTitle>{t('cards.socialLinks.title')}</CardTitle></CardHeader>
      <CardContent>
        <FieldGroup>
          {LINK_ITEMS.map((link) => (
            <Field key={link.id}>
              <FieldLabel htmlFor={link.id}>{t(`cards.socialLinks.${link.labelKey}`)}</FieldLabel>
              <InputGroup>
                <InputGroupAddon><link.icon /></InputGroupAddon>
                <InputGroupInput id={link.id} defaultValue={link.value} placeholder={link.placeholder} />
              </InputGroup>
            </Field>
          ))}
        </FieldGroup>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="secondary">{t('cards.socialLinks.discard')}</Button>
        <Button>{t('cards.socialLinks.saveChanges')}</Button>
      </CardFooter>
    </Card>
  )
}
