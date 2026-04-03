'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useTheme } from 'next-themes'

// ── Constants ─────────────────────────────────────────────────────────────────

export const themeColors = [
  { name: '藍 (預設)', hue: 255, chroma: 0.19 },
  { name: '靛藍', hue: 270, chroma: 0.18 },
  { name: '紫', hue: 290, chroma: 0.18 },
  { name: '玫瑰', hue: 350, chroma: 0.20 },
  { name: '橙', hue: 50, chroma: 0.18 },
  { name: '綠', hue: 150, chroma: 0.17 },
  { name: '青', hue: 195, chroma: 0.15 },
] as const

export const baseColors = [
  { name: 'Neutral', hue: 0, chroma: 0 },
  { name: 'Slate', hue: 255, chroma: 0.015 },
  { name: 'Zinc', hue: 240, chroma: 0.008 },
  { name: 'Stone', hue: 75, chroma: 0.01 },
  { name: 'Warm', hue: 30, chroma: 0.015 },
] as const

export const chartPalettes = [
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

export const stylePresets = [
  { value: 'default', label: 'Default', defaultRadius: 0.625 },
  { value: 'new-york', label: 'New York', defaultRadius: 0.5 },
] as const

export type StylePreset = (typeof stylePresets)[number]['value']

export const fontOptions = [
  { value: 'geist', label: 'Geist Sans', variable: '--font-geist-sans' },
  { value: 'inter', label: 'Inter', variable: '--font-inter' },
  { value: 'jakarta', label: 'Plus Jakarta Sans', variable: '--font-plus-jakarta-sans' },
] as const

export type FontOption = (typeof fontOptions)[number]['value']

export const radiusPresets = [0, 0.3, 0.5, 0.75, 1.0] as const

// ── Types & Defaults ──────────────────────────────────────────────────────────

export interface ThemeConfig {
  primaryHue: number
  primaryChroma: number
  baseHue: number
  baseChroma: number
  radius: number
  chartPalette: number
  style: StylePreset
  font: FontOption
  headingFont: FontOption
}

const DEFAULTS: ThemeConfig = {
  primaryHue: 255,
  primaryChroma: 0.19,
  baseHue: 0,
  baseChroma: 0,
  radius: 0.625,
  chartPalette: 0,
  style: 'default',
  font: 'geist',
  headingFont: 'geist',
}

const STORAGE_KEY = 'nexus-theme-config'

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

  const headingFontOpt = fontOptions.find(f => f.value === config.headingFont) ?? fontOptions[0]
  root.style.setProperty('--font-heading', `var(${headingFontOpt.variable})`)
}

// ── Context ───────────────────────────────────────────────────────────────────

interface ThemeCustomizerContextValue {
  config: ThemeConfig
  updateConfig: (patch: Partial<ThemeConfig>) => void
  handleStyleChange: (style: StylePreset) => void
  resetToDefaults: () => void
  isDark: boolean
  setTheme: (theme: string) => void
  mounted: boolean
}

const ThemeCustomizerContext = createContext<ThemeCustomizerContextValue | null>(null)

export function useThemeCustomizer() {
  const ctx = useContext(ThemeCustomizerContext)
  if (!ctx) throw new Error('useThemeCustomizer must be used within ThemeCustomizerProvider')
  return ctx
}

export function ThemeCustomizerProvider({ children }: { children: ReactNode }) {
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

  function handleStyleChange(style: StylePreset) {
    const preset = stylePresets.find(s => s.value === style)
    updateConfig({ style, radius: preset?.defaultRadius ?? 0.625 })
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
      '--radius', '--font-sans', '--font-heading',
      '--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5',
    ]
    props.forEach(p => root.style.removeProperty(p))
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <ThemeCustomizerContext.Provider value={{
      config,
      updateConfig,
      handleStyleChange,
      resetToDefaults,
      isDark: theme === 'dark',
      setTheme,
      mounted,
    }}>
      {children}
    </ThemeCustomizerContext.Provider>
  )
}
