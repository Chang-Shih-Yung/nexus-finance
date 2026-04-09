"use client"

import * as React from "react"
import { useI18n } from "@/lib/i18n/context"
import { ZapIcon, SettingsIcon, ServerIcon, MonitorIcon } from "@/lib/icons"

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Item, ItemContent, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const MODES = {
  normal: { counter: [80], automation: [40], notify: [50], response: [30] },
  lunch: { counter: [30], automation: [70], notify: [20], response: [50] },
  night: { counter: [10], automation: [90], notify: [10], response: [80] },
  emergency: { counter: [100], automation: [100], notify: [100], response: [10] },
} as const

export function KitchenIsland() {
  const { t } = useI18n()
  const [enabled, setEnabled] = React.useState(true)
  const [mode, setMode] = React.useState("normal")
  const [counter, setCounter] = React.useState([80])
  const [automation, setAutomation] = React.useState([40])
  const [notify, setNotify] = React.useState([50])
  const [response, setResponse] = React.useState([30])

  const handleModeChange = (value: string) => {
    if (!value) return
    setMode(value)
    const preset = MODES[value as keyof typeof MODES]
    setCounter([...preset.counter])
    setAutomation([...preset.automation])
    setNotify([...preset.notify])
    setResponse([...preset.response])
  }

  const sliders = [
    { icon: ServerIcon, labelKey: "counterServiceVolume", value: counter, onChange: setCounter },
    { icon: ZapIcon, labelKey: "automationLevel", value: automation, onChange: setAutomation },
    { icon: MonitorIcon, labelKey: "notificationFrequency", value: notify, onChange: setNotify },
    { icon: SettingsIcon, labelKey: "responseTimeTarget", value: response, onChange: setResponse },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cards.kitchenIsland.title')}</CardTitle>
        <CardDescription>{t('cards.kitchenIsland.description')}</CardDescription>
        <CardAction><Switch checked={enabled} onCheckedChange={setEnabled} /></CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(v) => handleModeChange(v || "normal")}
          variant="outline"
          className="flex-wrap"
        >
          <ToggleGroupItem value="normal" disabled={!enabled}>{t('cards.kitchenIsland.normalBusiness')}</ToggleGroupItem>
          <ToggleGroupItem value="lunch" disabled={!enabled}>{t('cards.kitchenIsland.lunchMode')}</ToggleGroupItem>
          <ToggleGroupItem value="night" disabled={!enabled}>{t('cards.kitchenIsland.nightMode')}</ToggleGroupItem>
          <ToggleGroupItem value="emergency" disabled={!enabled}>{t('cards.kitchenIsland.emergencyMode')}</ToggleGroupItem>
        </ToggleGroup>
        <ItemGroup>
          {sliders.map((s) => (
            <Item key={s.labelKey} size="sm" variant="outline">
              <ItemMedia variant="icon"><s.icon /></ItemMedia>
              <ItemContent className="flex-row items-center gap-3">
                <ItemTitle className="shrink-0">{t(`cards.kitchenIsland.${s.labelKey}`)}</ItemTitle>
              </ItemContent>
              <div className="flex-1">
                <Slider value={s.value} onValueChange={(v) => s.onChange(Array.isArray(v) ? [...v] : [v])} max={100} disabled={!enabled} className="w-full" />
              </div>
            </Item>
          ))}
        </ItemGroup>
      </CardContent>
    </Card>
  )
}
