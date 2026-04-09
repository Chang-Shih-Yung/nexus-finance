"use client"

import { CreditCard } from "@/lib/icons"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { useI18n } from "@/lib/i18n/context"

export function EmptyConnectBank() {
  const { t } = useI18n()
  return (
    <Card>
      <CardContent>
        <Empty className="p-4">
          <EmptyMedia variant="icon">
            <CreditCard />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>{t('cards.emptyConnectBank.title')}</EmptyTitle>
            <EmptyDescription>
              {t('cards.emptyConnectBank.description')}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button>{t('cards.emptyConnectBank.setupConnection')}</Button>
          </EmptyContent>
        </Empty>
      </CardContent>
    </Card>
  )
}
