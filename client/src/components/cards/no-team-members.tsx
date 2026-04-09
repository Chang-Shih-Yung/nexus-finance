"use client"

import { CheckCircle2Icon } from "@/lib/icons"
import { useI18n } from "@/lib/i18n/context"

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

export function NoTeamMembers() {
  const { t } = useI18n()
  return (
    <Card>
      <CardContent>
        <Empty className="h-56 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CheckCircle2Icon />
            </EmptyMedia>
            <EmptyTitle>{t('cards.noTeamMembers.title')}</EmptyTitle>
            <EmptyDescription>
              {t('cards.noTeamMembers.description')}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" variant="outline">{t('cards.noTeamMembers.viewAlertHistory')}</Button>
          </EmptyContent>
        </Empty>
      </CardContent>
    </Card>
  )
}
