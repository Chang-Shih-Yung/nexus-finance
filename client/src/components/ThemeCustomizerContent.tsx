'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { RotateCcw, Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'

// ── Theme presets ──────────────────────────────────────────────
const themeColors = [
  { name: '藍 (預設)', hue: 255, chroma: 0.19 },
  { name: '靛藍', hue: 270, chroma: 0.18 },
  { name: '紫', hue: 290, chroma: 0.18 },
  { name: '玫瑰', hue: 350, chroma: 0.20 },
  { name: '橙', hue: 50, chroma: 0.18 },
  { name: '綠', hue: 150, chroma: 0.17 },
  { name: '青', hue: 195, chroma: 0.15 },
] as const

const baseColors = [
  { name: 'Neutral', hue: 0, chroma: 0 },
  { name: 'Slate', hue: 255, chroma: 0.015 },
  { name: 'Zinc', hue: 240, chroma: 0.008 },
  { name: 'Stone', hue: 75, chroma: 0.01 },
  { name: 'Warm', hue: 30, chroma: 0.015 },
] as const

const chartPalettes = [
  {
    name: '經典',
    colors: [
      { l: 0.48, c: 0.19, h: 255 },
      { l: 0.62, c: 0.15, h: 150 },
      { l: 0.72, c: 0.17, h: 70 },
      { l: 0.62, c: 0.22, h: 25 },
      { l: 0.58, c: 0.18, h: 290 },
    ],
  },
  {
    name: '翡翠',
    colors: [
      { l: 0.55, c: 0.17, h: 160 },
      { l: 0.62, c: 0.15, h: 140 },
      { l: 0.68, c: 0.13, h: 180 },
      { l: 0.50, c: 0.19, h: 200 },
      { l: 0.72, c: 0.10, h: 120 },
    ],
  },
  {
    name: '暖色',
    colors: [
      { l: 0.62, c: 0.22, h: 25 },
      { l: 0.72, c: 0.17, h: 50 },
      { l: 0.58, c: 0.20, h: 350 },
      { l: 0.65, c: 0.15, h: 75 },
      { l: 0.55, c: 0.18, h: 10 },
    ],
  },
] as const

const DEFAULTS = {
  primaryHue: 255,
  primaryChroma: 0.19,
  baseHue: 0,
  baseChroma: 0,
  radius: 0.625,
  chartPalette: 0,
}

const STORAGE_KEY = 'nexus-theme-config'

interface ThemeConfig {
  primaryHue: number
  primaryChroma: number
  baseHue: number
  baseChroma: number
  radius: number
  chartPalette: number
}

function loadConfig(): ThemeConfig {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return { ...DEFAULTS, ...JSON.parse(stored) }
  } catch { /* noop */ }
  return DEFAULTS
}

function saveConfig(config: ThemeConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch { /* noop */ }
}

function applyThemeVars(config: ThemeConfig, isDark: boolean) {
  const root = document.documentElement
  const { primaryHue, primaryChroma, baseHue, baseChroma, radius, chartPalette } = config

  const primaryL = isDark ? 0.58 : 0.38
  root.style.setProperty('--primary', `oklch(${primaryL} ${primaryChroma} ${primaryHue})`)
  root.style.setProperty('--primary-foreground', `oklch(0.985 0 0)`)
  root.style.setProperty('--ring', `oklch(${primaryL} ${primaryChroma} ${primaryHue})`)

  if (isDark) {
    root.style.setProperty('--accent', `oklch(0.269 0 0)`)
    root.style.setProperty('--accent-foreground', `oklch(0.985 0 0)`)
  } else {
    root.style.setProperty('--accent', `oklch(0.94 0.04 ${primaryHue})`)
    root.style.setProperty('--accent-foreground', `oklch(${primaryL} ${primaryChroma} ${primaryHue})`)
  }

  const bgL = isDark ? 0.145 : 1
  const fgL = isDark ? 0.985 : 0.145
  const cardL = isDark ? 0.205 : 1
  const mutedL = isDark ? 0.269 : 0.97
  const mutedFgL = isDark ? 0.708 : 0.556
  const borderL = isDark ? undefined : 0.922
  const secondaryL = isDark ? 0.269 : 0.97
  const secondaryFgL = isDark ? 0.985 : 0.205

  root.style.setProperty('--background', `oklch(${bgL} ${baseChroma} ${baseHue})`)
  root.style.setProperty('--foreground', `oklch(${fgL} 0 0)`)
  root.style.setProperty('--card', `oklch(${cardL} ${baseChroma} ${baseHue})`)
  root.style.setProperty('--card-foreground', `oklch(${fgL} 0 0)`)
  root.style.setProperty('--popover', `oklch(${cardL} ${baseChroma} ${baseHue})`)
  root.style.setProperty('--popover-foreground', `oklch(${fgL} 0 0)`)
  root.style.setProperty('--muted', `oklch(${mutedL} ${baseChroma} ${baseHue})`)
  root.style.setProperty('--muted-foreground', `oklch(${mutedFgL} ${baseChroma} ${baseHue})`)
  root.style.setProperty('--secondary', `oklch(${secondaryL} ${baseChroma} ${baseHue})`)
  root.style.setProperty('--secondary-foreground', `oklch(${secondaryFgL} 0 0)`)

  if (isDark) {
    root.style.setProperty('--border', `oklch(1 0 0 / 10%)`)
    root.style.setProperty('--input', `oklch(1 0 0 / 15%)`)
  } else {
    root.style.setProperty('--border', `oklch(${borderL} ${baseChroma} ${baseHue})`)
    root.style.setProperty('--input', `oklch(${borderL} ${baseChroma} ${baseHue})`)
  }

  root.style.setProperty('--sidebar', `oklch(0.13 0.02 ${primaryHue})`)
  root.style.setProperty('--sidebar-primary', `oklch(0.55 ${primaryChroma} ${primaryHue})`)
  root.style.setProperty('--sidebar-primary-foreground', `oklch(0.985 0 0)`)
  root.style.setProperty('--sidebar-accent', `oklch(0.55 ${primaryChroma} ${primaryHue} / 18%)`)
  root.style.setProperty('--sidebar-accent-foreground', `oklch(0.78 0.12 ${primaryHue})`)
  root.style.setProperty('--sidebar-ring', `oklch(0.55 ${primaryChroma} ${primaryHue})`)

  root.style.setProperty('--radius', `${radius}rem`)

  const palette = chartPalettes[chartPalette] ?? chartPalettes[0]
  const lightnessBump = isDark ? 0.17 : 0
  palette.colors.forEach((color, i) => {
    root.style.setProperty(
      `--chart-${i + 1}`,
      `oklch(${color.l + lightnessBump} ${color.c} ${color.h})`
    )
  })
}

export default function ThemeCustomizerContent() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [config, setConfig] = useState<ThemeConfig>(DEFAULTS)

  useEffect(() => {
    setMounted(true)
    setConfig(loadConfig())
  }, [])

  useEffect(() => {
    if (!mounted) return
    applyThemeVars(config, theme === 'dark')
    saveConfig(config)
  }, [config, theme, mounted])

  const updateConfig = useCallback((patch: Partial<ThemeConfig>) => {
    setConfig(prev => ({ ...prev, ...patch }))
  }, [])

  function resetToDefaults() {
    setConfig(DEFAULTS)
    setTheme('light')
    const root = document.documentElement
    const props = [
      '--primary', '--primary-foreground', '--ring',
      '--accent', '--accent-foreground',
      '--background', '--foreground',
      '--card', '--card-foreground',
      '--popover', '--popover-foreground',
      '--muted', '--muted-foreground',
      '--secondary', '--secondary-foreground',
      '--border', '--input',
      '--sidebar', '--sidebar-primary', '--sidebar-primary-foreground',
      '--sidebar-accent', '--sidebar-accent-foreground', '--sidebar-ring',
      '--radius',
      '--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5',
    ]
    props.forEach(p => root.style.removeProperty(p))
    localStorage.removeItem(STORAGE_KEY)
  }

  if (!mounted) return <div className="h-8" />

  const isDark = theme === 'dark'

  return (
    <div className="space-y-6 p-4">
      {/* 模式 */}
      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">模式</Label>
        <div className="flex gap-2">
          <Button
            variant={!isDark ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTheme('light')}
            className="flex-1"
          >
            <Sun className="h-4 w-4 mr-1" /> 淺色
          </Button>
          <Button
            variant={isDark ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTheme('dark')}
            className="flex-1"
          >
            <Moon className="h-4 w-4 mr-1" /> 深色
          </Button>
        </div>
      </div>

      {/* 主題色 */}
      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">主題色</Label>
        <div className="grid grid-cols-4 gap-2">
          {themeColors.map(color => {
            const isActive = config.primaryHue === color.hue && config.primaryChroma === color.chroma
            return (
              <button
                key={color.name}
                onClick={() => updateConfig({ primaryHue: color.hue, primaryChroma: color.chroma })}
                className={`flex flex-col items-center gap-1.5 rounded-lg border p-2 text-xs transition-colors ${
                  isActive ? 'border-primary bg-accent' : 'border-border hover:border-primary/50'
                }`}
              >
                <div
                  className="h-6 w-6 rounded-full ring-1 ring-border"
                  style={{ backgroundColor: `oklch(0.55 ${color.chroma} ${color.hue})` }}
                />
                <span className="text-muted-foreground leading-none">{color.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 基底灰調 */}
      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">基底灰調</Label>
        <div className="grid grid-cols-5 gap-1.5">
          {baseColors.map(base => {
            const isActive = config.baseHue === base.hue && config.baseChroma === base.chroma
            return (
              <button
                key={base.name}
                onClick={() => updateConfig({ baseHue: base.hue, baseChroma: base.chroma })}
                className={`flex flex-col items-center gap-1.5 rounded-lg border p-1.5 text-xs transition-colors ${
                  isActive ? 'border-primary bg-accent' : 'border-border hover:border-primary/50'
                }`}
              >
                <div
                  className="h-5 w-5 rounded-full ring-1 ring-border"
                  style={{ backgroundColor: `oklch(0.5 ${base.chroma} ${base.hue})` }}
                />
                <span className="text-muted-foreground leading-none">{base.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 圓角 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">圓角</Label>
          <span className="text-xs text-muted-foreground font-mono">{config.radius.toFixed(2)}rem</span>
        </div>
        <Slider
          value={[config.radius]}
          onValueChange={([v]) => updateConfig({ radius: v })}
          min={0}
          max={1.5}
          step={0.05}
        />
        <div className="flex gap-2 justify-center">
          {[0, 0.3, 0.625, 1.0, 1.5].map(r => (
            <button
              key={r}
              onClick={() => updateConfig({ radius: r })}
              className={`h-10 w-10 border transition-colors ${
                Math.abs(config.radius - r) < 0.01 ? 'border-primary bg-accent' : 'border-border hover:border-primary/50'
              }`}
              style={{ borderRadius: `${r}rem` }}
            >
              <span className="sr-only">{r}rem</span>
            </button>
          ))}
        </div>
      </div>

      {/* 圖表配色 */}
      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">圖表配色</Label>
        <div className="grid grid-cols-3 gap-2">
          {chartPalettes.map((palette, idx) => {
            const isActive = config.chartPalette === idx
            return (
              <button
                key={palette.name}
                onClick={() => updateConfig({ chartPalette: idx })}
                className={`flex flex-col items-center gap-1.5 rounded-lg border p-2 text-xs transition-colors ${
                  isActive ? 'border-primary bg-accent' : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex gap-0.5">
                  {palette.colors.map((c, i) => (
                    <div
                      key={i}
                      className="h-4 w-3 first:rounded-l-sm last:rounded-r-sm"
                      style={{ backgroundColor: `oklch(${c.l} ${c.c} ${c.h})` }}
                    />
                  ))}
                </div>
                <span className="text-muted-foreground">{palette.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 重置 */}
      <Button variant="outline" onClick={resetToDefaults} className="w-full" size="sm">
        <RotateCcw className="h-3.5 w-3.5 mr-2" />
        重置為預設值
      </Button>
    </div>
  )
}
