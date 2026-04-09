"use client"

import { DownloadIcon } from "@/lib/icons"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { useI18n } from "@/lib/i18n/context"

export function FileUpload() {
  const { t } = useI18n()
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cards.fileUpload.title')}</CardTitle>
        <CardDescription>{t('cards.fileUpload.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <DownloadIcon />
            </EmptyMedia>
            <EmptyTitle>{t('cards.fileUpload.selectFormat')}</EmptyTitle>
            <EmptyDescription>{t('cards.fileUpload.supportedFormats')}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button>{t('cards.fileUpload.exportReport')}</Button>
          </EmptyContent>
        </Empty>
      </CardContent>
    </Card>
  )
}
