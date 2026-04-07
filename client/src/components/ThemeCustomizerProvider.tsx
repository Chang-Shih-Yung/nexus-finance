'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useTheme } from 'next-themes'
import {
  baseThemes, colorThemes, fontOptions, stylePresets, radiusPresets,
  loadGoogleFont,
  type BaseTheme, type ColorTheme, type FontDef, type StyleDef,
} from '@/lib/theme-data'

// Re-export for consumers
export { baseThemes, colorThemes, fontOptions, stylePresets, radiusPresets }
export type { BaseTheme, ColorTheme, FontDef, StyleDef }

// ── Types & Defaults ──────────────────────────────────────────────────────────

export interface ThemeConfig {
  style: string       // 'vega' | 'nova' | ...
  baseColor: string   // 'neutral' | 'stone' | ...
  themeColor: string  // 'blue' | 'red' | ... (color overlay name)
  chartColor: string  // same pool as themeColor — overrides chart vars
  radius: number      // index into radiusPresets
  font: string        // font slug
  headingFont: string // font slug or 'inherit'
}

const DEFAULTS: ThemeConfig = {
  style: 'vega',
  baseColor: 'zinc',
  themeColor: 'blue',
  chartColor: 'blue',
  radius: 2,         // Medium (0.625rem)
  font: 'geist',
  headingFont: 'inherit',
}

const STORAGE_KEY = 'nexus-theme-config'

function loadConfig(): ThemeConfig {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Migration: if old format (primaryHue etc.), reset to defaults
      if ('primaryHue' in parsed) return DEFAULTS
      return { ...DEFAULTS, ...parsed }
    }
  } catch { /* noop */ }
  return DEFAULTS
}

function saveConfig(config: ThemeConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch { /* noop */ }
}

// ── CSS var application ───────────────────────────────────────────────────────

const ALL_VARS = [
  'background', 'foreground',
  'card', 'card-foreground',
  'popover', 'popover-foreground',
  'primary', 'primary-foreground',
  'secondary', 'secondary-foreground',
  'muted', 'muted-foreground',
  'accent', 'accent-foreground',
  'destructive',
  'border', 'input', 'ring',
  'chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5',
  'sidebar', 'sidebar-foreground',
  'sidebar-primary', 'sidebar-primary-foreground',
  'sidebar-accent', 'sidebar-accent-foreground',
  'sidebar-border', 'sidebar-ring',
  'radius',
]

function applyThemeVars(config: ThemeConfig, isDark: boolean) {
  const root = document.documentElement

  // 1. Find base theme
  const base = baseThemes.find(b => b.name === config.baseColor) ?? baseThemes[2] // zinc default
  const baseVars = isDark ? base.dark : base.light

  // 2. Find color theme overlay
  const color = colorThemes.find(c => c.name === config.themeColor)
  const colorVars = color ? (isDark ? color.dark : color.light) : {}

  // 3. Find chart color overlay (if different from theme color)
  let chartVars: Record<string, string> = {}
  if (config.chartColor !== config.themeColor) {
    const chartTheme = colorThemes.find(c => c.name === config.chartColor)
    if (chartTheme) {
      const cv = isDark ? chartTheme.dark : chartTheme.light
      chartVars = {
        'chart-1': cv['chart-1'],
        'chart-2': cv['chart-2'],
        'chart-3': cv['chart-3'],
        'chart-4': cv['chart-4'],
        'chart-5': cv['chart-5'],
      }
    }
  }

  // 4. Merge: base → color overlay → chart override
  const merged = { ...baseVars, ...colorVars, ...chartVars }

  // 5. Override radius from config
  const rp = radiusPresets[config.radius] ?? radiusPresets[2]
  merged.radius = rp.value

  // 6. Apply all vars
  for (const key of ALL_VARS) {
    const val = merged[key]
    if (val) {
      root.style.setProperty(`--${key}`, val)
    }
  }

  // 7. Fonts
  const bodyFont = fontOptions.find(f => f.name === config.font) ?? fontOptions[0]
  loadGoogleFont(bodyFont)
  root.style.setProperty('--font-sans', bodyFont.family)

  if (config.headingFont === 'inherit') {
    root.style.setProperty('--font-heading', bodyFont.family)
  } else {
    const hdFont = fontOptions.find(f => f.name === config.headingFont) ?? bodyFont
    loadGoogleFont(hdFont)
    root.style.setProperty('--font-heading', hdFont.family)
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface ThemeCustomizerContextValue {
  config: ThemeConfig
  updateConfig: (patch: Partial<ThemeConfig>) => void
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

  function resetToDefaults() {
    setConfig(DEFAULTS)
    setTheme('light')
    const root = document.documentElement
    ALL_VARS.forEach(v => root.style.removeProperty(`--${v}`))
    root.style.removeProperty('--font-sans')
    root.style.removeProperty('--font-heading')
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <ThemeCustomizerContext.Provider value={{
      config,
      updateConfig,
      resetToDefaults,
      isDark: theme === 'dark',
      setTheme,
      mounted,
    }}>
      {children}
    </ThemeCustomizerContext.Provider>
  )
}
