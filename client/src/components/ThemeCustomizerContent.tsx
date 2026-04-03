'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { Check, ChevronDown, Moon, RotateCcw, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

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

const stylePresets = [
  { value: 'default', label: 'Default', defaultRadius: 0.625 },
  { value: 'new-york', label: 'New York', defaultRadius: 0.5 },
] as const

type StylePreset = (typeof stylePresets)[number]['value']

const fontOptions = [
  { value: 'geist', label: 'Geist Sans', variable: '--font-geist-sans' },
  { value: 'inter', label: 'Inter', variable: '--font-inter' },
  { value: 'jakarta', label: 'Plus Jakarta Sans', variable: '--font-plus-jakarta-sans' },
] as const

type FontOption = (typeof fontOptions)[number]['value']

const radiusPresets = [0, 0.3, 0.5, 0.75, 1.0] as const

const DEFAULTS = {
  primaryHue: 255,
  primaryChroma: 0.19,
  baseHue: 0,
  baseChroma: 0,
  radius: 0.625,
  chartPalette: 0,
  style: 'default' as StylePreset,
  font: 'geist' as FontOption,
}

const STORAGE_KEY = 'nexus-theme-config'

interface ThemeConfig {
  primaryHue: number
  primaryChroma: number
  baseHue: number
  baseChroma: number
  radius: number
  chartPalette: number
  style: StylePreset
  font: FontOption
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

  const fontOpt = fontOptions.find(f => f.value === config.font) ?? fontOptions[0]
  root.style.setProperty('--font-sans', `var(${fontOpt.variable})`)
}

// ── Accordion section component ────────────────────────────────
type SectionId = 'style' | 'color' | 'base' | 'radius' | 'font' | 'chart' | 'mode'

function Section({
  id,
  label,
  open,
  onToggle,
  children,
}: {
  id: SectionId
  label: string
  open: boolean
  onToggle: (id: SectionId) => void
  children: React.ReactNode
}) {
  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="flex w-full items-center justify-between py-3 text-left text-sm font-medium text-sidebar-foreground/80 hover:text-sidebar-foreground transition-colors"
      >
        {label}
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-sidebar-foreground/40 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>
      <div
        className={cn(
          'grid transition-all duration-200 ease-in-out',
          open ? 'grid-rows-[1fr] pb-3' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          {children}
        </div>
      </div>
      <Separator className="opacity-20" />
    </div>
  )
}

export default function ThemeCustomizerContent() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [config, setConfig] = useState<ThemeConfig>(DEFAULTS)
  const [openSections, setOpenSections] = useState<Set<SectionId>>(new Set(['color']))

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

  function handleStyleChange(style: StylePreset) {
    const preset = stylePresets.find(s => s.value === style)
    updateConfig({ style, radius: preset?.defaultRadius ?? 0.625 })
  }

  function toggleSection(id: SectionId) {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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
      '--radius', '--font-sans',
      '--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5',
    ]
    props.forEach(p => root.style.removeProperty(p))
    localStorage.removeItem(STORAGE_KEY)
  }

  if (!mounted) return <div className="h-8" />

  const isDark = theme === 'dark'

  return (
    <div className="px-4 pb-6">

      {/* ── 樣式預設 ─────────────────────── */}
      <Section id="style" label="樣式" open={openSections.has('style')} onToggle={toggleSection}>
        <div className="grid grid-cols-2 gap-2">
          {stylePresets.map(preset => {
            const isActive = config.style === preset.value
            return (
              <button
                key={preset.value}
                onClick={() => handleStyleChange(preset.value)}
                className={cn(
                  'relative flex flex-col items-center gap-2 rounded-md border-2 p-3 text-xs transition-colors hover:bg-sidebar-accent',
                  isActive ? 'border-sidebar-primary' : 'border-sidebar-border',
                )}
              >
                <div
                  className="h-10 w-full overflow-hidden bg-background/20"
                  style={{ borderRadius: `${preset.defaultRadius * 0.6}rem` }}
                >
                  <div className="flex gap-1 p-1.5">
                    <div className="h-4 flex-1 bg-background/40" style={{ borderRadius: `${preset.defaultRadius * 0.4}rem` }} />
                    <div className="h-4 w-4 shrink-0 bg-sidebar-primary" style={{ borderRadius: `${preset.defaultRadius * 0.4}rem` }} />
                  </div>
                </div>
                <span className="font-medium text-sidebar-foreground">{preset.label}</span>
                {isActive && (
                  <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
                    <Check className="h-2.5 w-2.5" />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </Section>

      {/* ── 主題色 ────────────────────────── */}
      <Section id="color" label="顏色" open={openSections.has('color')} onToggle={toggleSection}>
        <div className="flex flex-wrap gap-2">
          {themeColors.map(color => {
            const isActive = config.primaryHue === color.hue && config.primaryChroma === color.chroma
            return (
              <button
                key={color.name}
                title={color.name}
                onClick={() => updateConfig({ primaryHue: color.hue, primaryChroma: color.chroma })}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-transform hover:scale-110',
                  isActive ? 'border-sidebar-foreground' : 'border-transparent',
                )}
                style={{ backgroundColor: `oklch(0.55 ${color.chroma} ${color.hue})` }}
              >
                {isActive && <Check className="h-3.5 w-3.5 text-white drop-shadow" />}
                <span className="sr-only">{color.name}</span>
              </button>
            )
          })}
        </div>
      </Section>

      {/* ── 基底灰調 ────────────────────────── */}
      <Section id="base" label="基底灰調" open={openSections.has('base')} onToggle={toggleSection}>
        <div className="grid grid-cols-5 gap-1.5">
          {baseColors.map(base => {
            const isActive = config.baseHue === base.hue && config.baseChroma === base.chroma
            return (
              <button
                key={base.name}
                onClick={() => updateConfig({ baseHue: base.hue, baseChroma: base.chroma })}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-md border p-1.5 text-[10px] transition-colors',
                  isActive
                    ? 'border-sidebar-primary bg-sidebar-accent text-sidebar-foreground'
                    : 'border-sidebar-border text-sidebar-foreground/50 hover:border-sidebar-primary/50',
                )}
              >
                <div
                  className="h-5 w-5 rounded-full"
                  style={{ backgroundColor: `oklch(0.5 ${base.chroma} ${base.hue})` }}
                />
                <span className="leading-none">{base.name}</span>
              </button>
            )
          })}
        </div>
      </Section>

      {/* ── 圓角 ─────────────────────────── */}
      <Section id="radius" label="圓角" open={openSections.has('radius')} onToggle={toggleSection}>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-1">
            {radiusPresets.map(r => (
              <button
                key={r}
                onClick={() => updateConfig({ radius: r })}
                title={`${r}rem`}
                className={cn(
                  'flex h-9 flex-1 items-center justify-center border text-xs text-sidebar-foreground/60 transition-colors',
                  Math.abs(config.radius - r) < 0.01
                    ? 'border-sidebar-primary bg-sidebar-accent text-sidebar-foreground'
                    : 'border-sidebar-border hover:border-sidebar-primary/50',
                )}
                style={{ borderRadius: `${r}rem` }}
              >
                {r}
              </button>
            ))}
          </div>
          <Slider
            value={[config.radius]}
            onValueChange={([v]) => updateConfig({ radius: v })}
            min={0}
            max={1.5}
            step={0.05}
          />
          <p className="text-right font-mono text-[10px] text-sidebar-foreground/40">{config.radius.toFixed(2)}rem</p>
        </div>
      </Section>

      {/* ── 字型 ─────────────────────────── */}
      <Section id="font" label="字型" open={openSections.has('font')} onToggle={toggleSection}>
        <Select
          value={config.font}
          onValueChange={(v) => updateConfig({ font: v as FontOption })}
        >
          <SelectTrigger
            size="sm"
            className="w-full border-sidebar-border bg-sidebar-accent text-sidebar-foreground [&_svg]:text-sidebar-foreground/50"
          >
            <SelectValue placeholder="選擇字型" />
          </SelectTrigger>
          <SelectContent>
            {fontOptions.map(f => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Section>

      {/* ── 圖表配色 ─────────────────────── */}
      <Section id="chart" label="圖表配色" open={openSections.has('chart')} onToggle={toggleSection}>
        <div className="grid grid-cols-3 gap-2">
          {chartPalettes.map((palette, idx) => {
            const isActive = config.chartPalette === idx
            return (
              <button
                key={palette.name}
                onClick={() => updateConfig({ chartPalette: idx })}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-md border p-2 text-xs transition-colors',
                  isActive
                    ? 'border-sidebar-primary bg-sidebar-accent text-sidebar-foreground'
                    : 'border-sidebar-border text-sidebar-foreground/50 hover:border-sidebar-primary/50',
                )}
              >
                <div className="flex gap-0.5 overflow-hidden rounded-sm">
                  {palette.colors.map((c, i) => (
                    <div
                      key={i}
                      className="h-4 w-3"
                      style={{ backgroundColor: `oklch(${c.l} ${c.c} ${c.h})` }}
                    />
                  ))}
                </div>
                <span>{palette.name}</span>
              </button>
            )
          })}
        </div>
      </Section>

      {/* ── 外觀模式 ─────────────────────── */}
      <Section id="mode" label="外觀模式" open={openSections.has('mode')} onToggle={toggleSection}>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setTheme('light')}
            className={cn(
              'flex items-center justify-center gap-2 rounded-md border py-2 text-xs transition-colors',
              !isDark
                ? 'border-sidebar-primary bg-sidebar-accent text-sidebar-foreground'
                : 'border-sidebar-border text-sidebar-foreground/50 hover:border-sidebar-primary/50',
            )}
          >
            <Sun className="h-3.5 w-3.5" /> 淺色
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={cn(
              'flex items-center justify-center gap-2 rounded-md border py-2 text-xs transition-colors',
              isDark
                ? 'border-sidebar-primary bg-sidebar-accent text-sidebar-foreground'
                : 'border-sidebar-border text-sidebar-foreground/50 hover:border-sidebar-primary/50',
            )}
          >
            <Moon className="h-3.5 w-3.5" /> 深色
          </button>
        </div>
      </Section>

      {/* ── 重置 ─────────────────────────── */}
      <div className="pt-4">
        <Button
          variant="ghost"
          onClick={resetToDefaults}
          className="w-full text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          size="sm"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          重置為預設值
        </Button>
      </div>
    </div>
  )
}
