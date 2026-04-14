// ── Official shadcn v4 theme data ─────────────────────────────────────
// Source: https://github.com/shadcn-ui/ui  apps/v4/registry/themes.ts

export type ThemeVars = Record<string, string>

export interface BaseTheme {
  name: string
  label: string
  light: ThemeVars
  dark: ThemeVars
}

export interface ColorTheme {
  name: string
  label: string
  light: ThemeVars
  dark: ThemeVars
}

export interface FontDef {
  name: string
  label: string
  type: 'sans' | 'serif' | 'mono'
  family: string          // CSS font-family value
  googleFamily?: string   // Google Fonts family param (omit for locally-loaded)
}

export interface StyleDef {
  name: string
  label: string
  description: string
}

// ── 6 Styles ──────────────────────────────────────────────────────────

export const stylePresets: StyleDef[] = [
  { name: 'vega',  label: 'Vega',  description: 'Clean, neutral, familiar' },
  { name: 'nova',  label: 'Nova',  description: 'Reduced padding/margins' },
  { name: 'maia',  label: 'Maia',  description: 'Rounded, generous spacing' },
  { name: 'lyra',  label: 'Lyra',  description: 'Boxy and sharp, mono fonts' },
  { name: 'mira',  label: 'Mira',  description: 'Compact interfaces' },
  { name: 'luma',  label: 'Luma',  description: 'Fluid, luminous, glassy' },
]

// ── 5 Radius presets ──────────────────────────────────────────────────

export const radiusPresets = [
  { label: 'None',    value: '0rem' },
  { label: 'Small',   value: '0.45rem' },
  { label: 'Medium',  value: '0.625rem' },
  { label: 'Large',   value: '0.875rem' },
  { label: 'Full',    value: '1rem' },
]

// ── 5 Spacing presets (matches shadcn/ui official customizer) ─────────
// Tailwind v4 uses --spacing as the base unit for p-*, m-*, gap-*, etc.
// Default is 0.25rem; shuffle picks a nearby value to feel different.

export const spacingPresets = [
  { label: 'Compact', value: '0.2rem' },
  { label: 'Tight',   value: '0.222rem' },
  { label: 'Default', value: '0.25rem' },
  { label: 'Cozy',    value: '0.285rem' },
  { label: 'Relaxed', value: '0.32rem' },
]

// ── 24 Fonts ──────────────────────────────────────────────────────────

export const fontOptions: FontDef[] = [
  // Sans-serif
  { name: 'geist',           label: 'Geist',           type: 'sans',  family: "'Geist Variable', var(--font-geist-sans), sans-serif" },
  { name: 'inter',           label: 'Inter',           type: 'sans',  family: "'Inter Variable', var(--font-inter), sans-serif",          googleFamily: 'Inter' },
  { name: 'noto-sans',       label: 'Noto Sans',       type: 'sans',  family: "'Noto Sans Variable', 'Noto Sans', sans-serif",            googleFamily: 'Noto+Sans' },
  { name: 'nunito-sans',     label: 'Nunito Sans',     type: 'sans',  family: "'Nunito Sans Variable', 'Nunito Sans', sans-serif",        googleFamily: 'Nunito+Sans' },
  { name: 'figtree',         label: 'Figtree',         type: 'sans',  family: "'Figtree Variable', 'Figtree', sans-serif",                googleFamily: 'Figtree' },
  { name: 'roboto',          label: 'Roboto',          type: 'sans',  family: "'Roboto Variable', 'Roboto', sans-serif",                  googleFamily: 'Roboto' },
  { name: 'raleway',         label: 'Raleway',         type: 'sans',  family: "'Raleway Variable', 'Raleway', sans-serif",                googleFamily: 'Raleway' },
  { name: 'dm-sans',         label: 'DM Sans',         type: 'sans',  family: "'DM Sans Variable', 'DM Sans', sans-serif",                googleFamily: 'DM+Sans' },
  { name: 'public-sans',     label: 'Public Sans',     type: 'sans',  family: "'Public Sans Variable', 'Public Sans', sans-serif",        googleFamily: 'Public+Sans' },
  { name: 'outfit',          label: 'Outfit',          type: 'sans',  family: "'Outfit Variable', 'Outfit', sans-serif",                  googleFamily: 'Outfit' },
  { name: 'oxanium',         label: 'Oxanium',         type: 'sans',  family: "'Oxanium Variable', 'Oxanium', sans-serif",                googleFamily: 'Oxanium' },
  { name: 'manrope',         label: 'Manrope',         type: 'sans',  family: "'Manrope Variable', 'Manrope', sans-serif",                googleFamily: 'Manrope' },
  { name: 'space-grotesk',   label: 'Space Grotesk',   type: 'sans',  family: "'Space Grotesk Variable', 'Space Grotesk', sans-serif",    googleFamily: 'Space+Grotesk' },
  { name: 'montserrat',      label: 'Montserrat',      type: 'sans',  family: "'Montserrat Variable', 'Montserrat', sans-serif",          googleFamily: 'Montserrat' },
  { name: 'ibm-plex-sans',   label: 'IBM Plex Sans',   type: 'sans',  family: "'IBM Plex Sans Variable', 'IBM Plex Sans', sans-serif",    googleFamily: 'IBM+Plex+Sans' },
  { name: 'source-sans-3',   label: 'Source Sans 3',   type: 'sans',  family: "'Source Sans 3 Variable', 'Source Sans 3', sans-serif",    googleFamily: 'Source+Sans+3' },
  { name: 'instrument-sans', label: 'Instrument Sans', type: 'sans',  family: "'Instrument Sans Variable', 'Instrument Sans', sans-serif", googleFamily: 'Instrument+Sans' },
  // Monospace
  { name: 'jetbrains-mono',  label: 'JetBrains Mono',  type: 'mono',  family: "'JetBrains Mono Variable', 'JetBrains Mono', monospace",   googleFamily: 'JetBrains+Mono' },
  { name: 'geist-mono',      label: 'Geist Mono',      type: 'mono',  family: "'Geist Mono Variable', var(--font-geist-mono), monospace" },
  // Serif
  { name: 'noto-serif',      label: 'Noto Serif',      type: 'serif', family: "'Noto Serif Variable', 'Noto Serif', serif",               googleFamily: 'Noto+Serif' },
  { name: 'roboto-slab',     label: 'Roboto Slab',     type: 'serif', family: "'Roboto Slab Variable', 'Roboto Slab', serif",             googleFamily: 'Roboto+Slab' },
  { name: 'merriweather',    label: 'Merriweather',    type: 'serif', family: "'Merriweather Variable', 'Merriweather', serif",            googleFamily: 'Merriweather' },
  { name: 'lora',            label: 'Lora',            type: 'serif', family: "'Lora Variable', 'Lora', serif",                           googleFamily: 'Lora' },
  { name: 'playfair-display',label: 'Playfair Display', type: 'serif', family: "'Playfair Display Variable', 'Playfair Display', serif",   googleFamily: 'Playfair+Display' },
]

// ── 7 Base themes (full light+dark CSS var sets) ──────────────────────
// Base themes define ALL CSS variables. Color themes overlay on top.

const shared = {
  lightBg:          'oklch(1 0 0)',
  destructiveLight: 'oklch(0.577 0.245 27.325)',
  destructiveDark:  'oklch(0.704 0.191 22.216)',
  borderDark:       'oklch(1 0 0 / 10%)',
  inputDark:        'oklch(1 0 0 / 15%)',
  sidebarPrimaryDk: 'oklch(0.488 0.243 264.376)',
}

function makeBase(
  name: string, label: string,
  fg: string, primary: string, primaryFg: string,
  secondary: string, muted: string, mutedFg: string,
  border: string, ring: string,
  chart: [string, string, string, string, string],
  sidebar: string, sidebarFg: string,
  sidebarAccent: string,
  // dark overrides
  dkCard: string, dkPrimary: string, dkPrimaryFg: string,
  dkSecondary: string, dkMutedFg: string,
  dkRing: string, dkSidebar: string, dkSidebarFg: string,
): BaseTheme {
  return {
    name, label,
    light: {
      background: shared.lightBg,
      foreground: fg,
      card: shared.lightBg, 'card-foreground': fg,
      popover: shared.lightBg, 'popover-foreground': fg,
      primary, 'primary-foreground': primaryFg,
      secondary, 'secondary-foreground': primary,
      muted, 'muted-foreground': mutedFg,
      accent: secondary, 'accent-foreground': primary,
      destructive: shared.destructiveLight,
      border, input: border, ring,
      'chart-1': chart[0], 'chart-2': chart[1], 'chart-3': chart[2], 'chart-4': chart[3], 'chart-5': chart[4],
      sidebar, 'sidebar-foreground': fg,
      'sidebar-primary': primary, 'sidebar-primary-foreground': primaryFg,
      'sidebar-accent': sidebarAccent, 'sidebar-accent-foreground': primary,
      'sidebar-border': border, 'sidebar-ring': ring,
      radius: '0.625rem',
    },
    dark: {
      background: fg,
      foreground: primaryFg,
      card: dkCard, 'card-foreground': primaryFg,
      popover: dkCard, 'popover-foreground': primaryFg,
      primary: dkPrimary, 'primary-foreground': dkPrimaryFg,
      secondary: dkSecondary, 'secondary-foreground': primaryFg,
      muted: dkSecondary, 'muted-foreground': dkMutedFg,
      accent: dkSecondary, 'accent-foreground': primaryFg,
      destructive: shared.destructiveDark,
      border: shared.borderDark, input: shared.inputDark, ring: dkRing,
      'chart-1': chart[0], 'chart-2': chart[1], 'chart-3': chart[2], 'chart-4': chart[3], 'chart-5': chart[4],
      sidebar: dkSidebar, 'sidebar-foreground': dkSidebarFg,
      'sidebar-primary': shared.sidebarPrimaryDk, 'sidebar-primary-foreground': dkSidebarFg,
      'sidebar-accent': dkSecondary, 'sidebar-accent-foreground': dkSidebarFg,
      'sidebar-border': shared.borderDark, 'sidebar-ring': dkRing,
      radius: '0.625rem',
    },
  }
}

export const baseThemes: BaseTheme[] = [
  makeBase('neutral', 'Neutral',
    'oklch(0.145 0 0)', 'oklch(0.205 0 0)', 'oklch(0.985 0 0)',
    'oklch(0.97 0 0)', 'oklch(0.97 0 0)', 'oklch(0.556 0 0)',
    'oklch(0.922 0 0)', 'oklch(0.708 0 0)',
    ['oklch(0.87 0 0)','oklch(0.556 0 0)','oklch(0.439 0 0)','oklch(0.371 0 0)','oklch(0.269 0 0)'],
    'oklch(0.985 0 0)', 'oklch(0.145 0 0)', 'oklch(0.97 0 0)',
    'oklch(0.205 0 0)', 'oklch(0.922 0 0)', 'oklch(0.205 0 0)',
    'oklch(0.269 0 0)', 'oklch(0.708 0 0)',
    'oklch(0.556 0 0)', 'oklch(0.205 0 0)', 'oklch(0.985 0 0)',
  ),
  makeBase('stone', 'Stone',
    'oklch(0.147 0.004 49.25)', 'oklch(0.216 0.006 56.043)', 'oklch(0.985 0.001 106.423)',
    'oklch(0.97 0.001 106.424)', 'oklch(0.97 0.001 106.424)', 'oklch(0.553 0.013 58.071)',
    'oklch(0.923 0.003 48.717)', 'oklch(0.709 0.01 56.259)',
    ['oklch(0.869 0.005 56.366)','oklch(0.553 0.013 58.071)','oklch(0.444 0.011 73.639)','oklch(0.374 0.01 67.558)','oklch(0.268 0.007 34.298)'],
    'oklch(0.985 0.001 106.423)', 'oklch(0.147 0.004 49.25)', 'oklch(0.97 0.001 106.424)',
    'oklch(0.216 0.006 56.043)', 'oklch(0.923 0.003 48.717)', 'oklch(0.216 0.006 56.043)',
    'oklch(0.268 0.007 34.298)', 'oklch(0.709 0.01 56.259)',
    'oklch(0.553 0.013 58.071)', 'oklch(0.216 0.006 56.043)', 'oklch(0.985 0.001 106.423)',
  ),
  makeBase('zinc', 'Zinc',
    'oklch(0.141 0.005 285.823)', 'oklch(0.21 0.006 285.885)', 'oklch(0.985 0 0)',
    'oklch(0.967 0.001 286.375)', 'oklch(0.967 0.001 286.375)', 'oklch(0.552 0.016 285.938)',
    'oklch(0.92 0.004 286.32)', 'oklch(0.705 0.015 286.067)',
    ['oklch(0.871 0.006 286.286)','oklch(0.552 0.016 285.938)','oklch(0.442 0.017 285.786)','oklch(0.37 0.013 285.805)','oklch(0.274 0.006 286.033)'],
    'oklch(0.985 0 0)', 'oklch(0.141 0.005 285.823)', 'oklch(0.967 0.001 286.375)',
    'oklch(0.21 0.006 285.885)', 'oklch(0.92 0.004 286.32)', 'oklch(0.21 0.006 285.885)',
    'oklch(0.274 0.006 286.033)', 'oklch(0.705 0.015 286.067)',
    'oklch(0.552 0.016 285.938)', 'oklch(0.21 0.006 285.885)', 'oklch(0.985 0 0)',
  ),
  makeBase('mauve', 'Mauve',
    'oklch(0.145 0.008 326)', 'oklch(0.212 0.019 322.12)', 'oklch(0.985 0 0)',
    'oklch(0.96 0.003 325.6)', 'oklch(0.96 0.003 325.6)', 'oklch(0.542 0.034 322.5)',
    'oklch(0.922 0.005 325.62)', 'oklch(0.711 0.019 323.02)',
    ['oklch(0.865 0.012 325.68)','oklch(0.542 0.034 322.5)','oklch(0.435 0.029 321.78)','oklch(0.364 0.029 323.89)','oklch(0.263 0.024 320.12)'],
    'oklch(0.985 0 0)', 'oklch(0.145 0.008 326)', 'oklch(0.96 0.003 325.6)',
    'oklch(0.212 0.019 322.12)', 'oklch(0.922 0.005 325.62)', 'oklch(0.212 0.019 322.12)',
    'oklch(0.263 0.024 320.12)', 'oklch(0.711 0.019 323.02)',
    'oklch(0.542 0.034 322.5)', 'oklch(0.212 0.019 322.12)', 'oklch(0.985 0 0)',
  ),
  makeBase('olive', 'Olive',
    'oklch(0.153 0.006 107.1)', 'oklch(0.228 0.013 107.4)', 'oklch(0.988 0.003 106.5)',
    'oklch(0.966 0.005 106.5)', 'oklch(0.966 0.005 106.5)', 'oklch(0.58 0.031 107.3)',
    'oklch(0.93 0.007 106.5)', 'oklch(0.737 0.021 106.9)',
    ['oklch(0.88 0.011 106.6)','oklch(0.58 0.031 107.3)','oklch(0.466 0.025 107.3)','oklch(0.394 0.023 107.4)','oklch(0.286 0.016 107.4)'],
    'oklch(0.988 0.003 106.5)', 'oklch(0.153 0.006 107.1)', 'oklch(0.966 0.005 106.5)',
    'oklch(0.228 0.013 107.4)', 'oklch(0.93 0.007 106.5)', 'oklch(0.228 0.013 107.4)',
    'oklch(0.286 0.016 107.4)', 'oklch(0.737 0.021 106.9)',
    'oklch(0.58 0.031 107.3)', 'oklch(0.228 0.013 107.4)', 'oklch(0.988 0.003 106.5)',
  ),
  makeBase('mist', 'Mist',
    'oklch(0.148 0.004 228.8)', 'oklch(0.218 0.008 223.9)', 'oklch(0.987 0.002 197.1)',
    'oklch(0.963 0.002 197.1)', 'oklch(0.963 0.002 197.1)', 'oklch(0.56 0.021 213.5)',
    'oklch(0.925 0.005 214.3)', 'oklch(0.723 0.014 214.4)',
    ['oklch(0.872 0.007 219.6)','oklch(0.56 0.021 213.5)','oklch(0.45 0.017 213.2)','oklch(0.378 0.015 216)','oklch(0.275 0.011 216.9)'],
    'oklch(0.987 0.002 197.1)', 'oklch(0.148 0.004 228.8)', 'oklch(0.963 0.002 197.1)',
    'oklch(0.218 0.008 223.9)', 'oklch(0.925 0.005 214.3)', 'oklch(0.218 0.008 223.9)',
    'oklch(0.275 0.011 216.9)', 'oklch(0.723 0.014 214.4)',
    'oklch(0.56 0.021 213.5)', 'oklch(0.218 0.008 223.9)', 'oklch(0.987 0.002 197.1)',
  ),
  makeBase('taupe', 'Taupe',
    'oklch(0.147 0.004 49.3)', 'oklch(0.214 0.009 43.1)', 'oklch(0.986 0.002 67.8)',
    'oklch(0.96 0.002 17.2)', 'oklch(0.96 0.002 17.2)', 'oklch(0.547 0.021 43.1)',
    'oklch(0.922 0.005 34.3)', 'oklch(0.714 0.014 41.2)',
    ['oklch(0.868 0.007 39.5)','oklch(0.547 0.021 43.1)','oklch(0.438 0.017 39.3)','oklch(0.367 0.016 35.7)','oklch(0.268 0.011 36.5)'],
    'oklch(0.986 0.002 67.8)', 'oklch(0.147 0.004 49.3)', 'oklch(0.96 0.002 17.2)',
    'oklch(0.214 0.009 43.1)', 'oklch(0.922 0.005 34.3)', 'oklch(0.214 0.009 43.1)',
    'oklch(0.268 0.011 36.5)', 'oklch(0.714 0.014 41.2)',
    'oklch(0.547 0.021 43.1)', 'oklch(0.214 0.009 43.1)', 'oklch(0.986 0.002 67.8)',
  ),
]

// ── 17 Color themes (overlay — only primary, secondary, charts, sidebar-primary)

function makeColor(
  name: string, label: string,
  lPri: string, lPriFg: string, lCharts: [string,string,string,string,string],
  lSbPri: string, lSbPriFg: string,
  dPri: string, dPriFg: string, dCharts: [string,string,string,string,string],
  dSbPri: string, dSbPriFg: string,
): ColorTheme {
  // Color themes use zinc secondary as default
  const lSec = 'oklch(0.967 0.001 286.375)'
  const lSecFg = 'oklch(0.21 0.006 285.885)'
  const dSec = 'oklch(0.274 0.006 286.033)'
  const dSecFg = 'oklch(0.985 0 0)'
  return {
    name, label,
    light: {
      primary: lPri, 'primary-foreground': lPriFg,
      secondary: lSec, 'secondary-foreground': lSecFg,
      'chart-1': lCharts[0], 'chart-2': lCharts[1], 'chart-3': lCharts[2], 'chart-4': lCharts[3], 'chart-5': lCharts[4],
      'sidebar-primary': lSbPri, 'sidebar-primary-foreground': lSbPriFg,
    },
    dark: {
      primary: dPri, 'primary-foreground': dPriFg,
      secondary: dSec, 'secondary-foreground': dSecFg,
      'chart-1': dCharts[0], 'chart-2': dCharts[1], 'chart-3': dCharts[2], 'chart-4': dCharts[3], 'chart-5': dCharts[4],
      'sidebar-primary': dSbPri, 'sidebar-primary-foreground': dSbPriFg,
    },
  }
}

export const colorThemes: ColorTheme[] = [
  makeColor('neutral', 'Neutral',
    'oklch(0.205 0 0)','oklch(0.985 0 0)',
    ['oklch(0.87 0 0)','oklch(0.708 0 0)','oklch(0.556 0 0)','oklch(0.439 0 0)','oklch(0.371 0 0)'],
    'oklch(0.205 0 0)','oklch(0.985 0 0)',
    'oklch(0.922 0 0)','oklch(0.205 0 0)',
    ['oklch(0.87 0 0)','oklch(0.708 0 0)','oklch(0.556 0 0)','oklch(0.439 0 0)','oklch(0.371 0 0)'],
    'oklch(0.922 0 0)','oklch(0.205 0 0)',
  ),
  makeColor('blue', 'Blue',
    'oklch(0.488 0.243 264.376)','oklch(0.97 0.014 254.604)',
    ['oklch(0.809 0.105 251.813)','oklch(0.623 0.214 259.815)','oklch(0.546 0.245 262.881)','oklch(0.488 0.243 264.376)','oklch(0.424 0.199 265.638)'],
    'oklch(0.546 0.245 262.881)','oklch(0.97 0.014 254.604)',
    'oklch(0.424 0.199 265.638)','oklch(0.97 0.014 254.604)',
    ['oklch(0.809 0.105 251.813)','oklch(0.623 0.214 259.815)','oklch(0.546 0.245 262.881)','oklch(0.488 0.243 264.376)','oklch(0.424 0.199 265.638)'],
    'oklch(0.623 0.214 259.815)','oklch(0.97 0.014 254.604)',
  ),
  makeColor('indigo', 'Indigo',
    'oklch(0.457 0.24 277.023)','oklch(0.962 0.018 272.314)',
    ['oklch(0.785 0.115 274.713)','oklch(0.585 0.233 277.117)','oklch(0.511 0.262 276.966)','oklch(0.457 0.24 277.023)','oklch(0.398 0.195 277.369)'],
    'oklch(0.511 0.262 276.966)','oklch(0.962 0.018 272.314)',
    'oklch(0.398 0.195 277.369)','oklch(0.962 0.018 272.314)',
    ['oklch(0.785 0.115 274.713)','oklch(0.585 0.233 277.117)','oklch(0.511 0.262 276.966)','oklch(0.457 0.24 277.023)','oklch(0.398 0.195 277.369)'],
    'oklch(0.585 0.233 277.117)','oklch(0.962 0.018 272.314)',
  ),
  makeColor('violet', 'Violet',
    'oklch(0.491 0.27 292.581)','oklch(0.969 0.016 293.756)',
    ['oklch(0.811 0.111 293.571)','oklch(0.606 0.25 292.717)','oklch(0.541 0.281 293.009)','oklch(0.491 0.27 292.581)','oklch(0.432 0.232 292.759)'],
    'oklch(0.541 0.281 293.009)','oklch(0.969 0.016 293.756)',
    'oklch(0.432 0.232 292.759)','oklch(0.969 0.016 293.756)',
    ['oklch(0.811 0.111 293.571)','oklch(0.606 0.25 292.717)','oklch(0.541 0.281 293.009)','oklch(0.491 0.27 292.581)','oklch(0.432 0.232 292.759)'],
    'oklch(0.606 0.25 292.717)','oklch(0.969 0.016 293.756)',
  ),
  makeColor('purple', 'Purple',
    'oklch(0.496 0.265 301.924)','oklch(0.977 0.014 308.299)',
    ['oklch(0.827 0.119 306.383)','oklch(0.627 0.265 303.9)','oklch(0.558 0.288 302.321)','oklch(0.496 0.265 301.924)','oklch(0.438 0.218 303.724)'],
    'oklch(0.558 0.288 302.321)','oklch(0.977 0.014 308.299)',
    'oklch(0.438 0.218 303.724)','oklch(0.977 0.014 308.299)',
    ['oklch(0.827 0.119 306.383)','oklch(0.627 0.265 303.9)','oklch(0.558 0.288 302.321)','oklch(0.496 0.265 301.924)','oklch(0.438 0.218 303.724)'],
    'oklch(0.627 0.265 303.9)','oklch(0.977 0.014 308.299)',
  ),
  makeColor('fuchsia', 'Fuchsia',
    'oklch(0.518 0.253 323.949)','oklch(0.977 0.017 320.058)',
    ['oklch(0.833 0.145 321.434)','oklch(0.667 0.295 322.15)','oklch(0.591 0.293 322.896)','oklch(0.518 0.253 323.949)','oklch(0.452 0.211 324.591)'],
    'oklch(0.591 0.293 322.896)','oklch(0.977 0.017 320.058)',
    'oklch(0.452 0.211 324.591)','oklch(0.977 0.017 320.058)',
    ['oklch(0.833 0.145 321.434)','oklch(0.667 0.295 322.15)','oklch(0.591 0.293 322.896)','oklch(0.518 0.253 323.949)','oklch(0.452 0.211 324.591)'],
    'oklch(0.667 0.295 322.15)','oklch(0.977 0.017 320.058)',
  ),
  makeColor('pink', 'Pink',
    'oklch(0.525 0.223 3.958)','oklch(0.971 0.014 343.198)',
    ['oklch(0.823 0.12 346.018)','oklch(0.656 0.241 354.308)','oklch(0.592 0.249 0.584)','oklch(0.525 0.223 3.958)','oklch(0.459 0.187 3.815)'],
    'oklch(0.592 0.249 0.584)','oklch(0.971 0.014 343.198)',
    'oklch(0.459 0.187 3.815)','oklch(0.971 0.014 343.198)',
    ['oklch(0.823 0.12 346.018)','oklch(0.656 0.241 354.308)','oklch(0.592 0.249 0.584)','oklch(0.525 0.223 3.958)','oklch(0.459 0.187 3.815)'],
    'oklch(0.656 0.241 354.308)','oklch(0.971 0.014 343.198)',
  ),
  makeColor('rose', 'Rose',
    'oklch(0.514 0.222 16.935)','oklch(0.969 0.015 12.422)',
    ['oklch(0.81 0.117 11.638)','oklch(0.645 0.246 16.439)','oklch(0.586 0.253 17.585)','oklch(0.514 0.222 16.935)','oklch(0.455 0.188 13.697)'],
    'oklch(0.586 0.253 17.585)','oklch(0.969 0.015 12.422)',
    'oklch(0.455 0.188 13.697)','oklch(0.969 0.015 12.422)',
    ['oklch(0.81 0.117 11.638)','oklch(0.645 0.246 16.439)','oklch(0.586 0.253 17.585)','oklch(0.514 0.222 16.935)','oklch(0.455 0.188 13.697)'],
    'oklch(0.645 0.246 16.439)','oklch(0.969 0.015 12.422)',
  ),
  makeColor('red', 'Red',
    'oklch(0.505 0.213 27.518)','oklch(0.971 0.013 17.38)',
    ['oklch(0.808 0.114 19.571)','oklch(0.637 0.237 25.331)','oklch(0.577 0.245 27.325)','oklch(0.505 0.213 27.518)','oklch(0.444 0.177 26.899)'],
    'oklch(0.577 0.245 27.325)','oklch(0.971 0.013 17.38)',
    'oklch(0.444 0.177 26.899)','oklch(0.971 0.013 17.38)',
    ['oklch(0.808 0.114 19.571)','oklch(0.637 0.237 25.331)','oklch(0.577 0.245 27.325)','oklch(0.505 0.213 27.518)','oklch(0.444 0.177 26.899)'],
    'oklch(0.637 0.237 25.331)','oklch(0.971 0.013 17.38)',
  ),
  makeColor('orange', 'Orange',
    'oklch(0.553 0.195 38.402)','oklch(0.98 0.016 73.684)',
    ['oklch(0.837 0.128 66.29)','oklch(0.705 0.213 47.604)','oklch(0.646 0.222 41.116)','oklch(0.553 0.195 38.402)','oklch(0.47 0.157 37.304)'],
    'oklch(0.646 0.222 41.116)','oklch(0.98 0.016 73.684)',
    'oklch(0.47 0.157 37.304)','oklch(0.98 0.016 73.684)',
    ['oklch(0.837 0.128 66.29)','oklch(0.705 0.213 47.604)','oklch(0.646 0.222 41.116)','oklch(0.553 0.195 38.402)','oklch(0.47 0.157 37.304)'],
    'oklch(0.705 0.213 47.604)','oklch(0.98 0.016 73.684)',
  ),
  makeColor('amber', 'Amber',
    'oklch(0.555 0.163 48.998)','oklch(0.987 0.022 95.277)',
    ['oklch(0.879 0.169 91.605)','oklch(0.769 0.188 70.08)','oklch(0.666 0.179 58.318)','oklch(0.555 0.163 48.998)','oklch(0.473 0.137 46.201)'],
    'oklch(0.666 0.179 58.318)','oklch(0.987 0.022 95.277)',
    'oklch(0.473 0.137 46.201)','oklch(0.987 0.022 95.277)',
    ['oklch(0.879 0.169 91.605)','oklch(0.769 0.188 70.08)','oklch(0.666 0.179 58.318)','oklch(0.555 0.163 48.998)','oklch(0.473 0.137 46.201)'],
    'oklch(0.769 0.188 70.08)','oklch(0.279 0.077 45.635)',
  ),
  makeColor('yellow', 'Yellow',
    'oklch(0.852 0.199 91.936)','oklch(0.421 0.095 57.708)',
    ['oklch(0.905 0.182 98.111)','oklch(0.795 0.184 86.047)','oklch(0.681 0.162 75.834)','oklch(0.554 0.135 66.442)','oklch(0.476 0.114 61.907)'],
    'oklch(0.681 0.162 75.834)','oklch(0.987 0.026 102.212)',
    'oklch(0.795 0.184 86.047)','oklch(0.421 0.095 57.708)',
    ['oklch(0.905 0.182 98.111)','oklch(0.795 0.184 86.047)','oklch(0.681 0.162 75.834)','oklch(0.554 0.135 66.442)','oklch(0.476 0.114 61.907)'],
    'oklch(0.795 0.184 86.047)','oklch(0.987 0.026 102.212)',
  ),
  makeColor('lime', 'Lime',
    'oklch(0.841 0.238 128.85)','oklch(0.405 0.101 131.063)',
    ['oklch(0.897 0.196 126.665)','oklch(0.768 0.233 130.85)','oklch(0.648 0.2 131.684)','oklch(0.532 0.157 131.589)','oklch(0.453 0.124 130.933)'],
    'oklch(0.648 0.2 131.684)','oklch(0.986 0.031 120.757)',
    'oklch(0.768 0.233 130.85)','oklch(0.405 0.101 131.063)',
    ['oklch(0.897 0.196 126.665)','oklch(0.768 0.233 130.85)','oklch(0.648 0.2 131.684)','oklch(0.532 0.157 131.589)','oklch(0.453 0.124 130.933)'],
    'oklch(0.768 0.233 130.85)','oklch(0.274 0.072 132.109)',
  ),
  makeColor('green', 'Green',
    'oklch(0.527 0.154 150.069)','oklch(0.982 0.018 155.826)',
    ['oklch(0.871 0.15 154.449)','oklch(0.723 0.219 149.579)','oklch(0.627 0.194 149.214)','oklch(0.527 0.154 150.069)','oklch(0.448 0.119 151.328)'],
    'oklch(0.627 0.194 149.214)','oklch(0.982 0.018 155.826)',
    'oklch(0.448 0.119 151.328)','oklch(0.982 0.018 155.826)',
    ['oklch(0.871 0.15 154.449)','oklch(0.723 0.219 149.579)','oklch(0.627 0.194 149.214)','oklch(0.527 0.154 150.069)','oklch(0.448 0.119 151.328)'],
    'oklch(0.723 0.219 149.579)','oklch(0.982 0.018 155.826)',
  ),
  makeColor('emerald', 'Emerald',
    'oklch(0.508 0.118 165.612)','oklch(0.979 0.021 166.113)',
    ['oklch(0.845 0.143 164.978)','oklch(0.696 0.17 162.48)','oklch(0.596 0.145 163.225)','oklch(0.508 0.118 165.612)','oklch(0.432 0.095 166.913)'],
    'oklch(0.596 0.145 163.225)','oklch(0.979 0.021 166.113)',
    'oklch(0.432 0.095 166.913)','oklch(0.979 0.021 166.113)',
    ['oklch(0.845 0.143 164.978)','oklch(0.696 0.17 162.48)','oklch(0.596 0.145 163.225)','oklch(0.508 0.118 165.612)','oklch(0.432 0.095 166.913)'],
    'oklch(0.696 0.17 162.48)','oklch(0.262 0.051 172.552)',
  ),
  makeColor('teal', 'Teal',
    'oklch(0.511 0.096 186.391)','oklch(0.984 0.014 180.72)',
    ['oklch(0.855 0.138 181.071)','oklch(0.704 0.14 182.503)','oklch(0.6 0.118 184.704)','oklch(0.511 0.096 186.391)','oklch(0.437 0.078 188.216)'],
    'oklch(0.6 0.118 184.704)','oklch(0.984 0.014 180.72)',
    'oklch(0.437 0.078 188.216)','oklch(0.984 0.014 180.72)',
    ['oklch(0.855 0.138 181.071)','oklch(0.704 0.14 182.503)','oklch(0.6 0.118 184.704)','oklch(0.511 0.096 186.391)','oklch(0.437 0.078 188.216)'],
    'oklch(0.704 0.14 182.503)','oklch(0.277 0.046 192.524)',
  ),
  makeColor('cyan', 'Cyan',
    'oklch(0.52 0.105 223.128)','oklch(0.984 0.019 200.873)',
    ['oklch(0.865 0.127 207.078)','oklch(0.715 0.143 215.221)','oklch(0.609 0.126 221.723)','oklch(0.52 0.105 223.128)','oklch(0.45 0.085 224.283)'],
    'oklch(0.609 0.126 221.723)','oklch(0.984 0.019 200.873)',
    'oklch(0.45 0.085 224.283)','oklch(0.984 0.019 200.873)',
    ['oklch(0.865 0.127 207.078)','oklch(0.715 0.143 215.221)','oklch(0.609 0.126 221.723)','oklch(0.52 0.105 223.128)','oklch(0.45 0.085 224.283)'],
    'oklch(0.715 0.143 215.221)','oklch(0.302 0.056 229.695)',
  ),
  makeColor('sky', 'Sky',
    'oklch(0.5 0.134 242.749)','oklch(0.977 0.013 236.62)',
    ['oklch(0.828 0.111 230.318)','oklch(0.685 0.169 237.323)','oklch(0.588 0.158 241.966)','oklch(0.5 0.134 242.749)','oklch(0.443 0.11 240.79)'],
    'oklch(0.588 0.158 241.966)','oklch(0.977 0.013 236.62)',
    'oklch(0.443 0.11 240.79)','oklch(0.977 0.013 236.62)',
    ['oklch(0.828 0.111 230.318)','oklch(0.685 0.169 237.323)','oklch(0.588 0.158 241.966)','oklch(0.5 0.134 242.749)','oklch(0.443 0.11 240.79)'],
    'oklch(0.685 0.169 237.323)','oklch(0.293 0.066 243.15)',
  ),
]

// ── Dynamic font loader ───────────────────────────────────────────────

const loadedFonts = new Set<string>()

export function loadGoogleFont(font: FontDef) {
  if (!font.googleFamily || loadedFonts.has(font.name)) return
  loadedFonts.add(font.name)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${font.googleFamily}:wght@300..900&display=swap`
  document.head.appendChild(link)
}
