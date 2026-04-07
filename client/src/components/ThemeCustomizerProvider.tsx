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

export type ThemeConfigKey = keyof ThemeConfig
export type Locks = Record<ThemeConfigKey, boolean>

const DEFAULTS: ThemeConfig = {
  style: 'vega',
  baseColor: 'zinc',
  themeColor: 'blue',
  chartColor: 'blue',
  radius: 2,         // Medium (0.625rem)
  font: 'geist',
  headingFont: 'inherit',
}

const DEFAULT_LOCKS: Locks = {
  style: false,
  baseColor: false,
  themeColor: false,
  chartColor: false,
  radius: false,
  font: false,
  headingFont: false,
}

const STORAGE_KEY = 'nexus-theme-config'
const LOCKS_KEY = 'nexus-theme-locks'

function loadConfig(): ThemeConfig {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
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

function loadLocks(): Locks {
  if (typeof window === 'undefined') return DEFAULT_LOCKS
  try {
    const stored = localStorage.getItem(LOCKS_KEY)
    if (stored) return { ...DEFAULT_LOCKS, ...JSON.parse(stored) }
  } catch { /* noop */ }
  return DEFAULT_LOCKS
}

function saveLocks(locks: Locks) {
  try {
    localStorage.setItem(LOCKS_KEY, JSON.stringify(locks))
  } catch { /* noop */ }
}

// ── Shuffle ──────────────────────────────────────────────────────────────────

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffleConfig(current: ThemeConfig, locks: Locks): ThemeConfig {
  const next = { ...current }
  if (!locks.style) next.style = pickRandom(stylePresets).name
  if (!locks.baseColor) next.baseColor = pickRandom(baseThemes).name
  if (!locks.themeColor) next.themeColor = pickRandom(colorThemes).name
  if (!locks.chartColor) next.chartColor = pickRandom(colorThemes).name
  if (!locks.radius) next.radius = Math.floor(Math.random() * radiusPresets.length)
  if (!locks.font) next.font = pickRandom(fontOptions).name
  if (!locks.headingFont) {
    const useInherit = Math.random() < 0.3
    next.headingFont = useInherit ? 'inherit' : pickRandom(fontOptions).name
  }
  return next
}

// ── URL encoding/decoding ────────────────────────────────────────────────────
// Compact format: ?theme=style.base.color.chart.radius.font.heading[.mode]

export function encodeThemeUrl(config: ThemeConfig, isDark: boolean): string {
  const parts = [
    config.style,
    config.baseColor,
    config.themeColor,
    config.chartColor,
    config.radius.toString(),
    config.font,
    config.headingFont,
    isDark ? 'dark' : 'light',
  ]
  return `?theme=${parts.join('.')}`
}

export function decodeThemeUrl(search: string): { config: Partial<ThemeConfig>; mode?: string } | null {
  const params = new URLSearchParams(search)
  const raw = params.get('theme')
  if (!raw) return null
  const parts = raw.split('.')
  if (parts.length < 7) return null

  const [style, baseColor, themeColor, chartColor, radiusStr, font, headingFont, mode] = parts
  const radius = parseInt(radiusStr, 10)

  // Validate each part exists in our data
  const config: Partial<ThemeConfig> = {}
  if (stylePresets.some(s => s.name === style)) config.style = style
  if (baseThemes.some(b => b.name === baseColor)) config.baseColor = baseColor
  if (colorThemes.some(c => c.name === themeColor)) config.themeColor = themeColor
  if (colorThemes.some(c => c.name === chartColor)) config.chartColor = chartColor
  if (!isNaN(radius) && radius >= 0 && radius < radiusPresets.length) config.radius = radius
  if (fontOptions.some(f => f.name === font)) config.font = font
  if (headingFont === 'inherit' || fontOptions.some(f => f.name === headingFont)) config.headingFont = headingFont

  return { config, mode: mode === 'dark' || mode === 'light' ? mode : undefined }
}

// ── Presets ──────────────────────────────────────────────────────────────────

export interface ThemePreset {
  name: string
  config: ThemeConfig
  mode: 'light' | 'dark'
}

const PRESETS_KEY = 'nexus-theme-presets'

function loadPresets(): ThemePreset[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(PRESETS_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* noop */ }
  return []
}

function savePresets(presets: ThemePreset[]) {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets))
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

  const base = baseThemes.find(b => b.name === config.baseColor) ?? baseThemes[2]
  const baseVars = isDark ? base.dark : base.light

  const color = colorThemes.find(c => c.name === config.themeColor)
  const colorVars = color ? (isDark ? color.dark : color.light) : {}

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

  const merged = { ...baseVars, ...colorVars, ...chartVars }

  const rp = radiusPresets[config.radius] ?? radiusPresets[2]
  merged.radius = rp.value

  for (const key of ALL_VARS) {
    const val = merged[key]
    if (val) {
      root.style.setProperty(`--${key}`, val)
    }
  }

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
  // P1: Shuffle + Lock
  locks: Locks
  toggleLock: (key: ThemeConfigKey) => void
  shuffle: () => void
  // P1: Presets
  presets: ThemePreset[]
  savePreset: (name: string) => void
  loadPreset: (preset: ThemePreset) => void
  deletePreset: (name: string) => void
  // P1: URL sharing
  getShareUrl: () => string
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
  const [locks, setLocks] = useState<Locks>(DEFAULT_LOCKS)
  const [presets, setPresets] = useState<ThemePreset[]>([])

  // Mount: load config, locks, presets, and check URL
  useEffect(() => {
    setMounted(true)
    setLocks(loadLocks())
    setPresets(loadPresets())

    // URL-based theme: apply if ?theme= param exists
    const urlTheme = decodeThemeUrl(window.location.search)
    if (urlTheme) {
      const base = loadConfig()
      setConfig({ ...base, ...urlTheme.config })
      if (urlTheme.mode) setTheme(urlTheme.mode)
      // Clean URL without reload
      window.history.replaceState({}, '', window.location.pathname)
    } else {
      setConfig(loadConfig())
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mounted) return
    applyThemeVars(config, theme === 'dark')
    saveConfig(config)
  }, [config, theme, mounted])

  const updateConfig = useCallback((patch: Partial<ThemeConfig>) => {
    setConfig(prev => ({ ...prev, ...patch }))
  }, [])

  const toggleLock = useCallback((key: ThemeConfigKey) => {
    setLocks(prev => {
      const next = { ...prev, [key]: !prev[key] }
      saveLocks(next)
      return next
    })
  }, [])

  const shuffle = useCallback(() => {
    setConfig(prev => shuffleConfig(prev, locks))
  }, [locks])

  const savePresetFn = useCallback((name: string) => {
    setPresets(prev => {
      const filtered = prev.filter(p => p.name !== name)
      const next = [...filtered, { name, config, mode: (theme === 'dark' ? 'dark' : 'light') as 'light' | 'dark' }]
      savePresets(next)
      return next
    })
  }, [config, theme])

  const loadPresetFn = useCallback((preset: ThemePreset) => {
    setConfig(preset.config)
    setTheme(preset.mode)
  }, [setTheme])

  const deletePresetFn = useCallback((name: string) => {
    setPresets(prev => {
      const next = prev.filter(p => p.name !== name)
      savePresets(next)
      return next
    })
  }, [])

  const getShareUrl = useCallback(() => {
    const base = window.location.origin + window.location.pathname
    return base + encodeThemeUrl(config, theme === 'dark')
  }, [config, theme])

  function resetToDefaults() {
    setConfig(DEFAULTS)
    setTheme('light')
    setLocks(DEFAULT_LOCKS)
    saveLocks(DEFAULT_LOCKS)
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
      locks,
      toggleLock,
      shuffle,
      presets,
      savePreset: savePresetFn,
      loadPreset: loadPresetFn,
      deletePreset: deletePresetFn,
      getShareUrl,
    }}>
      {children}
    </ThemeCustomizerContext.Provider>
  )
}
