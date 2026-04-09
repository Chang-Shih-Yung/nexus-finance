"use client"

import { Plus } from "@/lib/icons"

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

export function EmptyDistributeTrack() {
  const { t } = useI18n()
  return (
    <Card>
      <CardContent>
        <Empty className="p-4">
          <EmptyMedia variant="icon">
            <Plus />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>{t('cards.emptyDistributeTrack.title')}</EmptyTitle>
            <EmptyDescription>
              {t('cards.emptyDistributeTrack.description')}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button>{t('cards.emptyDistributeTrack.createReport')}</Button>
          </EmptyContent>
        </Empty>
      </CardContent>
    </Card>
  )
}
