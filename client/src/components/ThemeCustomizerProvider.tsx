'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { useTheme } from 'next-themes'
import { useSearchParams, usePathname } from 'next/navigation'
import {
  baseThemes, colorThemes, fontOptions, stylePresets, radiusPresets,
  loadGoogleFont,
  type BaseTheme, type ColorTheme, type FontDef, type StyleDef,
} from '@/lib/theme-data'

// Re-export for consumers
export { baseThemes, colorThemes, fontOptions, stylePresets, radiusPresets }
export type { BaseTheme, ColorTheme, FontDef, StyleDef }

// Clipboard helper — always use textarea fallback (navigator.clipboard fails without HTTPS)
export function copyToClipboard(text: string): boolean {
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0'
  document.body.appendChild(ta)
  ta.focus()
  ta.select()
  try {
    document.execCommand('copy')
    return true
  } catch {
    return false
  } finally {
    document.body.removeChild(ta)
  }
}

// ── Types & Defaults ──────────────────────────────────────────────────────────

export const iconLibraries = [
  { name: 'lucide', label: 'Lucide' },
  { name: 'tabler', label: 'Tabler' },
  { name: 'hugeicons', label: 'Hugeicons' },
  { name: 'phosphor', label: 'Phosphor' },
  { name: 'remixicon', label: 'Remixicon' },
] as const

export interface ThemeConfig {
  style: string
  baseColor: string
  themeColor: string
  chartColor: string
  radius: number
  font: string
  headingFont: string
  iconLibrary: string
}

export type ThemeConfigKey = keyof ThemeConfig
export type Locks = Record<ThemeConfigKey, boolean>

const DEFAULTS: ThemeConfig = {
  style: 'vega',
  baseColor: 'neutral',
  themeColor: 'neutral',
  chartColor: 'neutral',
  radius: 2,
  font: 'geist',
  headingFont: 'inherit',
  iconLibrary: 'lucide',
}

const DEFAULT_LOCKS: Locks = {
  style: false, baseColor: false, themeColor: false,
  chartColor: false, radius: false, font: false, headingFont: false,
  iconLibrary: false,
}

const LOCKS_KEY = 'nexus-theme-locks'

function loadLocks(): Locks {
  if (typeof window === 'undefined') return DEFAULT_LOCKS
  try {
    const stored = localStorage.getItem(LOCKS_KEY)
    if (stored) return { ...DEFAULT_LOCKS, ...JSON.parse(stored) }
  } catch { /* noop */ }
  return DEFAULT_LOCKS
}

function saveLocks(locks: Locks) {
  try { localStorage.setItem(LOCKS_KEY, JSON.stringify(locks)) } catch { /* noop */ }
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
    next.headingFont = Math.random() < 0.3 ? 'inherit' : pickRandom(fontOptions).name
  }
  if (!locks.iconLibrary) next.iconLibrary = pickRandom(iconLibraries).name
  return next
}

// ── URL encoding/decoding ────────────────────────────────────────────────────
// Format: ?preset=<compact_base36_string>  (like official shadcn/ui)
//
// We encode each config field as its index in the respective array, then
// pack all indices + mode bit into a single BigInt and base-36 encode it.
// headingFont uses fontOptions index + 1 (0 = "inherit").

function indexOf<T extends { name: string }>(arr: readonly T[], name: string): number {
  const i = arr.findIndex(x => x.name === name)
  return i < 0 ? 0 : i
}

export function encodePreset(config: ThemeConfig, isDark: boolean): string {
  const headingIdx = config.headingFont === 'inherit'
    ? 0
    : indexOf(fontOptions, config.headingFont) + 1

  const iconIdx = iconLibraries.findIndex(i => i.name === config.iconLibrary)

  // Pack: style, baseColor, themeColor, chartColor, radius, font, headingFont, iconLibrary, mode
  // Each value is stored with enough bits for its range
  const fields = [
    indexOf(stylePresets, config.style),      // max 6  → 3 bits
    indexOf(baseThemes, config.baseColor),    // max 7  → 3 bits
    indexOf(colorThemes, config.themeColor),  // max 17 → 5 bits
    indexOf(colorThemes, config.chartColor),  // max 17 → 5 bits
    config.radius,                            // max 5  → 3 bits
    indexOf(fontOptions, config.font),        // max 24 → 5 bits
    headingIdx,                               // max 25 → 5 bits
    iconIdx < 0 ? 0 : iconIdx,               // max 5  → 3 bits
    isDark ? 1 : 0,                           // 1 bit
  ]
  const sizes = [3, 3, 5, 5, 3, 5, 5, 3, 1]

  let packed = BigInt(0)
  for (let i = 0; i < fields.length; i++) {
    packed = (packed << BigInt(sizes[i])) | BigInt(fields[i])
  }
  return packed.toString(36)
}

function decodePreset(preset: string): { config: ThemeConfig; mode?: string } | null {
  try {
    let packed = BigInt('0x0') // placeholder
    try { packed = BigInt(`0o0`) } catch { /* */ }
    // Parse base-36
    packed = [...preset].reduce((acc, ch) => {
      const v = parseInt(ch, 36)
      if (isNaN(v)) throw new Error('bad char')
      return acc * BigInt(36) + BigInt(v)
    }, BigInt(0))

    const sizes = [3, 3, 5, 5, 3, 5, 5, 3, 1]
    const values: number[] = []
    for (let i = sizes.length - 1; i >= 0; i--) {
      const mask = (BigInt(1) << BigInt(sizes[i])) - BigInt(1)
      values.unshift(Number(packed & mask))
      packed >>= BigInt(sizes[i])
    }

    const [styleIdx, baseIdx, themeIdx, chartIdx, radius, fontIdx, headingIdx, iconIdx, modeVal] = values

    const config: ThemeConfig = { ...DEFAULTS }
    if (styleIdx < stylePresets.length) config.style = stylePresets[styleIdx].name
    if (baseIdx < baseThemes.length) config.baseColor = baseThemes[baseIdx].name
    if (themeIdx < colorThemes.length) config.themeColor = colorThemes[themeIdx].name
    if (chartIdx < colorThemes.length) config.chartColor = colorThemes[chartIdx].name
    if (radius >= 0 && radius < radiusPresets.length) config.radius = radius
    if (fontIdx < fontOptions.length) config.font = fontOptions[fontIdx].name
    if (headingIdx === 0) {
      config.headingFont = 'inherit'
    } else if (headingIdx - 1 < fontOptions.length) {
      config.headingFont = fontOptions[headingIdx - 1].name
    }
    if (iconIdx < iconLibraries.length) config.iconLibrary = iconLibraries[iconIdx].name

    const mode = modeVal === 1 ? 'dark' : 'light'
    return { config, mode }
  } catch {
    return null
  }
}

// Also support full dotted format for backwards compat
function decodeThemeFromParams(searchParams: URLSearchParams): { config: ThemeConfig; mode?: string } | null {
  // Try compact ?preset= first
  const preset = searchParams.get('preset')
  if (preset) return decodePreset(preset)

  // Legacy: ?theme=style.base.color.chart.radius.font.heading&mode=dark
  const raw = searchParams.get('theme')
  if (!raw) return null
  const parts = raw.split('.')
  if (parts.length < 7) return null

  const [style, baseColor, themeColor, chartColor, radiusStr, font, headingFont] = parts
  const radius = parseInt(radiusStr, 10)
  const mode = searchParams.get('mode')

  const config: ThemeConfig = { ...DEFAULTS }
  if (stylePresets.some(s => s.name === style)) config.style = style
  if (baseThemes.some(b => b.name === baseColor)) config.baseColor = baseColor
  if (colorThemes.some(c => c.name === themeColor)) config.themeColor = themeColor
  if (colorThemes.some(c => c.name === chartColor)) config.chartColor = chartColor
  if (!isNaN(radius) && radius >= 0 && radius < radiusPresets.length) config.radius = radius
  if (fontOptions.some(f => f.name === font)) config.font = font
  if (headingFont === 'inherit' || fontOptions.some(f => f.name === headingFont)) config.headingFont = headingFont

  return { config, mode: mode === 'dark' || mode === 'light' ? mode : undefined }
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
      chartVars = { 'chart-1': cv['chart-1'], 'chart-2': cv['chart-2'], 'chart-3': cv['chart-3'], 'chart-4': cv['chart-4'], 'chart-5': cv['chart-5'] }
    }
  }

  const merged = { ...baseVars, ...colorVars, ...chartVars }
  const rp = radiusPresets[config.radius] ?? radiusPresets[2]
  merged.radius = rp.value

  for (const key of ALL_VARS) {
    const val = merged[key]
    if (val) root.style.setProperty(`--${key}`, val)
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
  locks: Locks
  toggleLock: (key: ThemeConfigKey) => void
  shuffle: () => void
  presetString: string
}

const ThemeCustomizerContext = createContext<ThemeCustomizerContextValue | null>(null)

export function useThemeCustomizer() {
  const ctx = useContext(ThemeCustomizerContext)
  if (!ctx) throw new Error('useThemeCustomizer must be used within ThemeCustomizerProvider')
  return ctx
}

export function ThemeCustomizerProvider({ children }: { children: ReactNode }) {
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  const [config, setConfig] = useState<ThemeConfig>(DEFAULTS)
  const [locks, setLocks] = useState<Locks>(DEFAULT_LOCKS)
  const isInitialLoad = useRef(true)

  // Mount: read config from URL params
  useEffect(() => {
    setMounted(true)
    setLocks(loadLocks())

    const fromUrl = decodeThemeFromParams(searchParams)
    if (fromUrl) {
      setConfig(fromUrl.config)
      if (fromUrl.mode) setTheme(fromUrl.mode)
    }
    isInitialLoad.current = false
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Apply CSS vars whenever config or theme changes
  useEffect(() => {
    if (!mounted) return
    applyThemeVars(config, theme === 'dark')
  }, [config, theme, mounted])

  // Sync config → URL (on every change after initial load)
  useEffect(() => {
    if (!mounted || isInitialLoad.current) return
    const preset = encodePreset(config, theme === 'dark')
    const url = new URL(window.location.href)
    url.searchParams.set('preset', preset)
    window.history.replaceState(null, '', url.toString())
  }, [config, theme, mounted, pathname])

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

  const presetString = `--preset ${encodePreset(config, theme === 'dark')}`

  function resetToDefaults() {
    setConfig(DEFAULTS)
    setTheme('light')
    setLocks(DEFAULT_LOCKS)
    saveLocks(DEFAULT_LOCKS)
    const root = document.documentElement
    ALL_VARS.forEach(v => root.style.removeProperty(`--${v}`))
    root.style.removeProperty('--font-sans')
    root.style.removeProperty('--font-heading')
    // Reset URL
    window.history.replaceState(null, '', pathname)
  }

  return (
    <ThemeCustomizerContext.Provider value={{
      config, updateConfig, resetToDefaults,
      isDark: theme === 'dark', setTheme, mounted,
      locks, toggleLock, shuffle, presetString,
    }}>
      {children}
    </ThemeCustomizerContext.Provider>
  )
}
