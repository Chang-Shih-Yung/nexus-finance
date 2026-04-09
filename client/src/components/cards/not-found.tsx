"use client"

import { SearchIcon } from "@/lib/icons"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Kbd } from "@/components/ui/kbd"
import { useI18n } from "@/lib/i18n/context"

export function NotFound() {
  const { t } = useI18n()
  return (
    <Card>
      <CardContent>
        <Empty className="h-72">
          <EmptyHeader>
            <EmptyTitle>{t('cards.notFound.title')}</EmptyTitle>
            <EmptyDescription>
              {t('cards.notFound.description')}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <InputGroup className="w-3/4">
              <InputGroupInput placeholder={t('cards.notFound.searchPlaceholder')} />
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupAddon align="inline-end">
                <Kbd>/</Kbd>
              </InputGroupAddon>
            </InputGroup>
            <Button variant="link">{t('cards.notFound.backToDashboard')}</Button>
          </EmptyContent>
        </Empty>
      </CardContent>
    </Card>
  )
}
