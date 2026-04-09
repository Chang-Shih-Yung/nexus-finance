'use client'

import { useState } from 'react'
import { Check, Globe, Link, Moon, Sun } from '@/lib/icons'
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useI18n, type Locale } from '@/lib/i18n/context'

const localeOptions: { value: Locale; label: string }[] = [
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'en', label: 'English' },
]

// ── Icon library brand logos ─────────────────────────────────────────────────

const iconLibraryLogos: Record<string, React.ReactNode> = {
  lucide: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="text-white/60 shrink-0">
      <path d="M14 12a4 4 0 0 0-8 0 8 8 0 1 0 16 0 11.97 11.97 0 0 0-4-8.944" />
      <path d="M10 12a4 4 0 0 0 8 0 8 8 0 1 0-16 0 11.97 11.97 0 0 0 4.063 9" />
    </svg>
  ),
  tabler: (
    <svg width="16" height="16" viewBox="0 0 32 32" fill="none" className="text-white/60 shrink-0">
      <path fill="currentColor" d="M31.288 7.107A8.83 8.83 0 0 0 24.893.712a55.9 55.9 0 0 0-17.786 0A8.83 8.83 0 0 0 .712 7.107a55.9 55.9 0 0 0 0 17.786 8.83 8.83 0 0 0 6.395 6.395c5.895.95 11.89.95 17.786 0a8.83 8.83 0 0 0 6.395-6.395c.95-5.895.95-11.89 0-17.786" />
      <path fill="#fff" d="m17.884 9.076 1.5-2.488 6.97 6.977-2.492 1.494zm-7.96 3.127 7.814-.909 3.91 3.66-.974 7.287-9.582 2.159a3.06 3.06 0 0 1-2.17-.329l5.244-4.897c.91.407 2.003.142 2.587-.626.584-.77.488-1.818-.226-2.484s-1.84-.755-2.664-.21c-.823.543-1.107 1.562-.67 2.412l-5.245 4.89a2.53 2.53 0 0 1-.339-2.017z" />
    </svg>
  ),
  hugeicons: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="text-white/60 shrink-0">
      <path d="M2 9.5H22" /><path d="M20.5 9.5H3.5L4.23353 15.3682C4.59849 18.2879 4.78097 19.7477 5.77343 20.6239C6.76589 21.5 8.23708 21.5 11.1795 21.5H12.8205C15.7629 21.5 17.2341 21.5 18.2266 20.6239C19.219 19.7477 19.4015 18.2879 19.7665 15.3682L20.5 9.5Z" /><path d="M5 9C5 5.41015 8.13401 2.5 12 2.5C15.866 2.5 19 5.41015 19 9" />
    </svg>
  ),
  phosphor: (
    <svg width="16" height="16" viewBox="0 0 32 32" className="text-white/60 shrink-0">
      <path fill="none" d="M0 0h32v32H0z" /><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5h9v16H9zm9 16v9a9 9 0 0 1-9-9M9 5l9 16m0 0h1a8 8 0 0 0 0-16h-1" />
    </svg>
  ),
  remixicon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-white/60 shrink-0">
      <path d="M12 2C17.5228 2 22 6.47715 22 12C22 15.3137 19.3137 18 16 18C12.6863 18 10 15.3137 10 12C10 11.4477 9.55228 11 9 11C8.44772 11 8 11.4477 8 12C8 16.4183 11.5817 20 16 20C16.8708 20 17.7084 19.8588 18.4932 19.6016C16.7458 21.0956 14.4792 22 12 22C6.6689 22 2.3127 17.8283 2.0166 12.5713C2.23647 9.45772 4.83048 7 8 7C11.3137 7 14 9.68629 14 13C14 13.5523 14.4477 14 15 14C15.5523 14 16 13.5523 16 13C16 8.58172 12.4183 5 8 5C6.50513 5 5.1062 5.41032 3.90918 6.12402C5.72712 3.62515 8.67334 2 12 2Z" />
    </svg>
  ),
}
import {
  useThemeCustomizer,
  copyToClipboard,
  colorThemes,
  baseThemes,
  stylePresets,
  fontOptions,
  radiusPresets,
  iconLibraries,
} from '@/components/ThemeCustomizerProvider'

type TileId =
  | 'style'
  | 'theme'
  | 'base'
  | 'radius'
  | 'heading'
  | 'font'
  | 'iconLibrary'
  | 'chart'
  | 'mode'
  | 'language'

// ── Tile ──────────────────────────────────────────────────────────────────────

function Tile({
  id,
  openId,
  onOpenChange,
  label,
  displayValue,
  icon,
  children,
}: {
  id: TileId
  openId: TileId | null
  onOpenChange: (open: boolean) => void
  label: string
  displayValue: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Popover open={openId === id} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="shrink-0 flex items-center gap-2.5 px-3 py-2.5 rounded-xl ring-1 ring-white/10 hover:bg-white/5 transition-colors text-left min-w-[118px]"
        >
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium text-white/50 uppercase tracking-wider leading-none mb-0.5">
              {label}
            </p>
            <p className="text-sm font-semibold text-white leading-none truncate">
              {displayValue}
            </p>
          </div>
          <div className="shrink-0">{icon}</div>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={10}
        className="p-1 bg-neutral-900/90 backdrop-blur-xl ring-1 ring-neutral-800/50 border-0 min-w-[200px] w-auto shadow-2xl rounded-xl"
      >
        {children}
      </PopoverContent>
    </Popover>
  )
}

function TileItem({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <PopoverClose asChild>
      <button
        type="button"
        onClick={onClick}
        className="w-full flex items-center justify-between px-4 py-3 rounded-md text-[15px] text-white/90 hover:bg-white/10 transition-colors"
      >
        <span>{label}</span>
        {active && <Check className="h-4 w-4 text-white shrink-0" />}
      </button>
    </PopoverClose>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ThemeCustomizerBar() {
  const { config, updateConfig, isDark, setTheme, mounted, shuffle, resetToDefaults, presetString } =
    useThemeCustomizer()
  const { locale, setLocale } = useI18n()
  const [openId, setOpenId] = useState<TileId | null>(null)
  const [copied, setCopied] = useState(false)

  function handleOpen(id: TileId, open: boolean) {
    setOpenId(open ? id : null)
  }

  if (!mounted) return null

  const currentStyle = stylePresets.find(s => s.name === config.style) ?? stylePresets[0]
  const currentThemeColor = colorThemes.find(c => c.name === config.themeColor) ?? colorThemes[0]
  const currentBaseColor = baseThemes.find(b => b.name === config.baseColor) ?? baseThemes[2]
  const currentFont = fontOptions.find(f => f.name === config.font) ?? fontOptions[0]
  const currentHeadingFont = config.headingFont === 'inherit'
    ? { label: '繼承內文' }
    : (fontOptions.find(f => f.name === config.headingFont) ?? fontOptions[0])
  const currentChartColor = colorThemes.find(c => c.name === config.chartColor) ?? colorThemes[0]
  const currentIconLib = iconLibraries.find(i => i.name === config.iconLibrary) ?? iconLibraries[0]
  const currentRadius = radiusPresets[config.radius] ?? radiusPresets[2]

  return (
    <>
      {/* Backdrop — locks background interaction when any tile is open */}
      {openId !== null && (
        <div
          className="fixed inset-0 z-[29] touch-none lg:hidden"
          onClick={() => setOpenId(null)}
        />
      )}

      {/* Bar — mobile only (sidebar handles desktop) */}
      <div className="relative z-[30] lg:hidden bg-neutral-950/90 backdrop-blur-xl ring-1 ring-neutral-800/50 rounded-2xl shrink-0 overflow-hidden shadow-xl">

        {/* Row 1: Scrollable tiles */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none px-3 py-2.5">

            {/* Style */}
            <Tile
              id="style"
              openId={openId}
              onOpenChange={(o) => handleOpen('style', o)}
              label="樣式"
              displayValue={currentStyle.label}
              icon={
                <div className="h-4 w-6 border border-white/30 bg-white/20 shrink-0 rounded" />
              }
            >
              {stylePresets.map(s => (
                <TileItem
                  key={s.name}
                  label={s.label}
                  active={config.style === s.name}
                  onClick={() => updateConfig({ style: s.name })}
                />
              ))}
            </Tile>

            {/* Theme color */}
            <Tile
              id="theme"
              openId={openId}
              onOpenChange={(o) => handleOpen('theme', o)}
              label="主題色"
              displayValue={currentThemeColor.label}
              icon={
                <div
                  className="h-5 w-5 rounded-full shrink-0"
                  style={{ backgroundColor: currentThemeColor.light['chart-3'] ?? currentThemeColor.light.primary }}
                />
              }
            >
              <TileItem label="Neutral" active={config.themeColor === 'neutral'} onClick={() => updateConfig({ themeColor: 'neutral' })} />
              <div className="mx-2 my-1 h-px bg-white/10" />
              {colorThemes.filter(c => c.name !== 'neutral').map(color => (
                <TileItem
                  key={color.name}
                  label={color.label}
                  active={config.themeColor === color.name}
                  onClick={() => updateConfig({ themeColor: color.name })}
                />
              ))}
            </Tile>

            {/* Base color */}
            <Tile
              id="base"
              openId={openId}
              onOpenChange={(o) => handleOpen('base', o)}
              label="基底灰調"
              displayValue={currentBaseColor.label}
              icon={
                <div
                  className="h-5 w-5 rounded-full shrink-0"
                  style={{ backgroundColor: currentBaseColor.light.muted }}
                />
              }
            >
              {baseThemes.map(base => (
                <TileItem
                  key={base.name}
                  label={base.label}
                  active={config.baseColor === base.name}
                  onClick={() => updateConfig({ baseColor: base.name })}
                />
              ))}
            </Tile>

            {/* Radius */}
            <Tile
              id="radius"
              openId={openId}
              onOpenChange={(o) => handleOpen('radius', o)}
              label="圓角"
              displayValue={currentRadius.label}
              icon={
                <div
                  className="h-4 w-6 border border-white/30 bg-white/20 shrink-0"
                  style={{ borderRadius: currentRadius.value }}
                />
              }
            >
              {radiusPresets.map((r, idx) => (
                <TileItem
                  key={r.label}
                  label={r.label}
                  active={config.radius === idx}
                  onClick={() => updateConfig({ radius: idx })}
                />
              ))}
            </Tile>

            {/* Heading font */}
            <Tile
              id="heading"
              openId={openId}
              onOpenChange={(o) => handleOpen('heading', o)}
              label="標題字型"
              displayValue={currentHeadingFont.label}
              icon={<span className="text-xs font-bold text-white/60 shrink-0">Aa</span>}
            >
              <TileItem
                label="繼承內文"
                active={config.headingFont === 'inherit'}
                onClick={() => updateConfig({ headingFont: 'inherit' })}
              />
              {fontOptions.map(f => (
                <TileItem
                  key={f.name}
                  label={f.label}
                  active={config.headingFont === f.name}
                  onClick={() => updateConfig({ headingFont: f.name })}
                />
              ))}
            </Tile>

            {/* Body font */}
            <Tile
              id="font"
              openId={openId}
              onOpenChange={(o) => handleOpen('font', o)}
              label="字型"
              displayValue={currentFont.label}
              icon={<span className="text-xs font-bold text-white/60 shrink-0">Aa</span>}
            >
              {fontOptions.map(f => (
                <TileItem
                  key={f.name}
                  label={f.label}
                  active={config.font === f.name}
                  onClick={() => updateConfig({ font: f.name })}
                />
              ))}
            </Tile>

            {/* Icon Library */}
            <Tile
              id="iconLibrary"
              openId={openId}
              onOpenChange={(o) => handleOpen('iconLibrary', o)}
              label="Icon Library"
              displayValue={currentIconLib.label}
              icon={iconLibraryLogos[config.iconLibrary] ?? iconLibraryLogos.lucide}
            >
              {iconLibraries.map(lib => (
                <TileItem
                  key={lib.name}
                  label={lib.label}
                  active={config.iconLibrary === lib.name}
                  onClick={() => updateConfig({ iconLibrary: lib.name })}
                />
              ))}
            </Tile>

            {/* Chart color */}
            <Tile
              id="chart"
              openId={openId}
              onOpenChange={(o) => handleOpen('chart', o)}
              label="圖表配色"
              displayValue={currentChartColor.label}
              icon={
                <div
                  className="h-5 w-5 rounded-full shrink-0"
                  style={{ backgroundColor: currentChartColor.light['chart-3'] ?? currentChartColor.light.primary }}
                />
              }
            >
              <TileItem label="Neutral" active={config.chartColor === 'neutral'} onClick={() => updateConfig({ chartColor: 'neutral' })} />
              <div className="mx-2 my-1 h-px bg-white/10" />
              {colorThemes.filter(c => c.name !== 'neutral').map(color => (
                <TileItem
                  key={color.name}
                  label={color.label}
                  active={config.chartColor === color.name}
                  onClick={() => updateConfig({ chartColor: color.name })}
                />
              ))}
            </Tile>

            {/* Mode */}
            <Tile
              id="mode"
              openId={openId}
              onOpenChange={(o) => handleOpen('mode', o)}
              label="外觀模式"
              displayValue={isDark ? '深色' : '淺色'}
              icon={
                isDark ? (
                  <Moon className="h-4 w-4 text-white/60 shrink-0" />
                ) : (
                  <Sun className="h-4 w-4 text-white/60 shrink-0" />
                )
              }
            >
              <TileItem label="淺色" active={!isDark} onClick={() => setTheme('light')} />
              <TileItem label="深色" active={isDark} onClick={() => setTheme('dark')} />
            </Tile>

            {/* Language — not part of ThemeConfig, unaffected by Shuffle */}
            <Tile
              id="language"
              openId={openId}
              onOpenChange={(o) => handleOpen('language', o)}
              label="語言"
              displayValue={localeOptions.find(o => o.value === locale)?.label ?? locale}
              icon={<Globe className="h-4 w-4 text-white/60 shrink-0" />}
            >
              {localeOptions.map(opt => (
                <TileItem
                  key={opt.value}
                  label={opt.label}
                  active={locale === opt.value}
                  onClick={() => setLocale(opt.value)}
                />
              ))}
            </Tile>

        </div>

        {/* Row 2: Fixed bottom actions */}
        <div className="flex items-center gap-2 px-3 pb-2.5">
          {/* Preset — click to copy */}
          <button
            type="button"
            onClick={() => {
              copyToClipboard(window.location.href)
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }}
            className="flex-1 min-w-0 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg ring-1 ring-white/10 hover:bg-white/5 transition-colors"
          >
            <span className="text-xs font-mono text-white/50 truncate">
              {copied ? 'Copied' : presetString}
            </span>
          </button>

          {/* Shuffle */}
          <button
            type="button"
            onClick={shuffle}
            className="shrink-0 flex items-center px-3 py-2 rounded-lg ring-1 ring-white/10 hover:bg-white/5 transition-colors"
            title="Shuffle"
          >
            <span className="text-xs font-medium text-white/60">Shuffle</span>
          </button>

          {/* Reset */}
          <button
            type="button"
            onClick={resetToDefaults}
            className="shrink-0 flex items-center px-3 py-2 rounded-lg ring-1 ring-white/10 hover:bg-white/5 transition-colors"
            title="Reset"
          >
            <span className="text-xs font-medium text-white/60">Reset</span>
          </button>
        </div>

      </div>
    </>
  )
}
