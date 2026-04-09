"use client"

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
import { Spinner } from "@/components/ui/spinner"
import { useI18n } from "@/lib/i18n/context"

export function SyncingState() {
  const { t } = useI18n()
  return (
    <Card>
      <CardContent className="p-0">
        <Empty className="p-4">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Spinner />
            </EmptyMedia>
            <EmptyTitle>{t('cards.syncingState.title')}</EmptyTitle>
            <EmptyDescription>
              {t('cards.syncingState.description')}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline">{t('common.cancel')}</Button>
          </EmptyContent>
        </Empty>
      </CardContent>
    </Card>
  )
}
