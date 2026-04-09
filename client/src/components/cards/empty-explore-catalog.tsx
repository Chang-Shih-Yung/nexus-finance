"use client"

import { SearchIcon } from "@/lib/icons"

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

export function EmptyExploreCatalog() {
  const { t } = useI18n()
  return (
    <Card>
      <CardContent>
        <Empty className="p-4">
          <EmptyMedia variant="icon">
            <SearchIcon />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>{t('cards.emptyExploreCatalog.title')}</EmptyTitle>
            <EmptyDescription>
              {t('cards.emptyExploreCatalog.description')}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button>{t('cards.emptyExploreCatalog.browseProducts')}</Button>
          </EmptyContent>
        </Empty>
      </CardContent>
    </Card>
  )
}
