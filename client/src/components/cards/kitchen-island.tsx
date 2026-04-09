"use client"

import * as React from "react"
import { Sun, Thermometer, Volume2, Timer } from "@/lib/icons"

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Item, ItemContent, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const SCENES = {
  cooking: { brightness: [90], colorTemp: [70], volume: [30], fade: [0] },
  dining: { brightness: [50], colorTemp: [40], volume: [20], fade: [60] },
  nightlight: { brightness: [15], colorTemp: [20], volume: [0], fade: [80] },
  focus: { brightness: [100], colorTemp: [85], volume: [0], fade: [0] },
} as const

export function KitchenIsland() {
  const [enabled, setEnabled] = React.useState(true)
  const [scene, setScene] = React.useState("cooking")
  const [brightness, setBrightness] = React.useState([90])
  const [colorTemp, setColorTemp] = React.useState([70])
  const [volume, setVolume] = React.useState([30])
  const [fade, setFade] = React.useState([0])

  const handleSceneChange = (value: string) => {
    if (!value) return
    setScene(value)
    const preset = SCENES[value as keyof typeof SCENES]
    setBrightness([...preset.brightness])
    setColorTemp([...preset.colorTemp])
    setVolume([...preset.volume])
    setFade([...preset.fade])
  }

  const sliders = [
    { icon: Sun, label: "Brightness", value: brightness, onChange: setBrightness },
    { icon: Thermometer, label: "Color Temp", value: colorTemp, onChange: setColorTemp },
    { icon: Volume2, label: "Volume", value: volume, onChange: setVolume },
    { icon: Timer, label: "Fade", value: fade, onChange: setFade },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kitchen Island</CardTitle>
        <CardDescription>Hue Color Ambient</CardDescription>
        <CardAction><Switch checked={enabled} onCheckedChange={setEnabled} /></CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ToggleGroup
          type="single"
          value={scene}
          onValueChange={(v) => handleSceneChange(v || "cooking")}
          variant="outline"
          className="flex-wrap"
        >
          {Object.keys(SCENES).map((s) => (
            <ToggleGroupItem key={s} value={s} disabled={!enabled} className="capitalize">{s}</ToggleGroupItem>
          ))}
        </ToggleGroup>
        <ItemGroup>
          {sliders.map((s) => (
            <Item key={s.label} size="sm" variant="outline">
              <ItemMedia variant="icon"><s.icon /></ItemMedia>
              <ItemContent className="flex-row items-center gap-3">
                <ItemTitle className="shrink-0">{s.label}</ItemTitle>
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
