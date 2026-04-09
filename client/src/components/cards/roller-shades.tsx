"use client"

import * as React from "react"
import { useI18n } from "@/lib/i18n/context"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export function RollerShades() {
  const { t } = useI18n()
  const [position, setPosition] = React.useState([50])

  const preset = position[0] <= 30 ? "conservative" : position[0] >= 70 ? "aggressive" : "balanced"

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cards.rollerShades.title')}</CardTitle>
        <CardDescription>{t('cards.rollerShades.description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex h-32 flex-col overflow-hidden rounded-lg border">
          <div
            className="bg-primary transition-all duration-300"
            style={{ height: `${position[0]}%`, opacity: 0.3 + (position[0] / 100) * 0.7 }}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium tracking-wider text-muted-foreground">{t('cards.rollerShades.conservative')}</span>
          <Slider value={position} onValueChange={(value) => setPosition(Array.isArray(value) ? [...value] : [value])} max={100} className="flex-1" />
          <span className="text-xs font-medium tracking-wider text-muted-foreground">{t('cards.rollerShades.aggressive')}</span>
        </div>
      </CardContent>
      <CardFooter>
        <ToggleGroup
          type="single"
          value={preset}
          onValueChange={(v) => {
            if (v === "conservative") setPosition([20])
            else if (v === "balanced") setPosition([50])
            else if (v === "aggressive") setPosition([80])
          }}
          variant="outline"
          className="w-full"
        >
          <ToggleGroupItem value="conservative" className="flex-1">{t('cards.rollerShades.conservative')}</ToggleGroupItem>
          <ToggleGroupItem value="balanced" className="flex-1">{t('cards.rollerShades.balanced')}</ToggleGroupItem>
          <ToggleGroupItem value="aggressive" className="flex-1">{t('cards.rollerShades.aggressive')}</ToggleGroupItem>
        </ToggleGroup>
      </CardFooter>
    </Card>
  )
}
