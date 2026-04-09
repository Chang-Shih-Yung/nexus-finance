"use client"

import { useI18n } from "@/lib/i18n/context"
import { ImageIcon } from "@/lib/icons"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Item } from "@/components/ui/item"
import { Label } from "@/components/ui/label"

export function CoverArt() {
  const { t } = useI18n()

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <Label htmlFor="cover-art" className="text-center text-xs font-normal tracking-wider text-muted-foreground uppercase">{t('cards.coverArt.reportTemplate')}</Label>
        <Item className="aspect-square" variant="outline">
          <label htmlFor="cover-art" className="flex size-full cursor-pointer items-center justify-center">
            <ImageIcon className="size-10 text-muted-foreground/50" />
          </label>
        </Item>
        <input id="cover-art" type="file" accept="image/jpeg,image/png" className="sr-only" />
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <Button variant="secondary" className="w-full" asChild>
          <label htmlFor="cover-art" className="cursor-pointer">{t('cards.coverArt.uploadTemplate')}</label>
        </Button>
        <CardDescription className="text-center text-xs">
          {t('cards.coverArt.recommendedSize')}<br />{t('cards.coverArt.supportedFormats')}
        </CardDescription>
      </CardFooter>
    </Card>
  )
}
