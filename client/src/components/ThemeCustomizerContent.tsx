'use client'

import { useState } from 'react'
import { Check, Globe, LockKeyhole, Moon, Sun, UnlockKeyhole } from '@/lib/icons'
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  useThemeCustomizer,
  copyToClipboard,
  colorThemes,
  baseThemes,
  stylePresets,
  fontOptions,
  radiusPresets,
  iconLibraries,
  type ThemeConfigKey,
} from '@/components/ThemeCustomizerProvider'
import { useI18n, type Locale } from '@/lib/i18n/context'

const localeOptions: { value: Locale; label: string }[] = [
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'en', label: 'English' },
]

// ── Icon library brand logos (from official shadcn source) ───────────────────

const iconLibraryLogos: Record<string, React.ReactNode> = {
  lucide: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="text-white">
      <path d="M14 12a4 4 0 0 0-8 0 8 8 0 1 0 16 0 11.97 11.97 0 0 0-4-8.944" />
      <path d="M10 12a4 4 0 0 0 8 0 8 8 0 1 0-16 0 11.97 11.97 0 0 0 4.063 9" />
    </svg>
  ),
  tabler: (
    <svg width="16" height="16" viewBox="0 0 32 32" fill="none" className="text-white">
      <path fill="currentColor" d="M31.288 7.107A8.83 8.83 0 0 0 24.893.712a55.9 55.9 0 0 0-17.786 0A8.83 8.83 0 0 0 .712 7.107a55.9 55.9 0 0 0 0 17.786 8.83 8.83 0 0 0 6.395 6.395c5.895.95 11.89.95 17.786 0a8.83 8.83 0 0 0 6.395-6.395c.95-5.895.95-11.89 0-17.786" />
      <path fill="#fff" d="m17.884 9.076 1.5-2.488 6.97 6.977-2.492 1.494zm-7.96 3.127 7.814-.909 3.91 3.66-.974 7.287-9.582 2.159a3.06 3.06 0 0 1-2.17-.329l5.244-4.897c.91.407 2.003.142 2.587-.626.584-.77.488-1.818-.226-2.484s-1.84-.755-2.664-.21c-.823.543-1.107 1.562-.67 2.412l-5.245 4.89a2.53 2.53 0 0 1-.339-2.017z" />
    </svg>
  ),
  hugeicons: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="text-white">
      <path d="M2 9.5H22" /><path d="M20.5 9.5H3.5L4.23353 15.3682C4.59849 18.2879 4.78097 19.7477 5.77343 20.6239C6.76589 21.5 8.23708 21.5 11.1795 21.5H12.8205C15.7629 21.5 17.2341 21.5 18.2266 20.6239C19.219 19.7477 19.4015 18.2879 19.7665 15.3682L20.5 9.5Z" /><path d="M5 9C5 5.41015 8.13401 2.5 12 2.5C15.866 2.5 19 5.41015 19 9" />
    </svg>
  ),
  phosphor: (
    <svg width="16" height="16" viewBox="0 0 32 32" className="text-white">
      <path fill="none" d="M0 0h32v32H0z" /><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5h9v16H9zm9 16v9a9 9 0 0 1-9-9M9 5l9 16m0 0h1a8 8 0 0 0 0-16h-1" />
    </svg>
  ),
  remixicon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-white">
      <path d="M12 2C17.5228 2 22 6.47715 22 12C22 15.3137 19.3137 18 16 18C12.6863 18 10 15.3137 10 12C10 11.4477 9.55228 11 9 11C8.44772 11 8 11.4477 8 12C8 16.4183 11.5817 20 16 20C16.8708 20 17.7084 19.8588 18.4932 19.6016C16.7458 21.0956 14.4792 22 12 22C6.6689 22 2.3127 17.8283 2.0166 12.5713C2.23647 9.45772 4.83048 7 8 7C11.3137 7 14 9.68629 14 13C14 13.5523 14.4477 14 15 14C15.5523 14 16 13.5523 16 13C16 8.58172 12.4183 5 8 5C6.50513 5 5.1062 5.41032 3.90918 6.12402C5.72712 3.62515 8.67334 2 12 2Z" />
    </svg>
  ),
}

// ── Shared primitives (matching official shadcn /create customizer) ───────────

function OptionRow({
  label,
  displayValue,
  preview,
  locked,
  onToggleLock,
  children,
}: {
  label: string
  displayValue: string
  preview?: React.ReactNode
  locked?: boolean
  onToggleLock?: () => void
  children: React.ReactNode
}) {
  return (
    <div className="group/picker relative">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="relative w-full rounded-lg px-2.5 py-2 ring-1 ring-white/10 hover:bg-white/5 transition-colors text-left"
          >
            {/* Label on top, value below — stacked vertically like official */}
            <div className="flex flex-col justify-start">
              <div className="text-xs text-white/40">{label}</div>
              <div className="text-sm font-medium text-white">{displayValue}</div>
            </div>
            {/* Preview circle — absolute right like official */}
            {preview && (
              <div className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 select-none">
                {preview}
              </div>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="start"
          sideOffset={20}
          className="p-1.5 min-w-[200px] w-auto shadow-2xl bg-neutral-900/90 backdrop-blur-xl ring-1 ring-neutral-800/50 border-0 rounded-xl"
        >
          {children}
        </PopoverContent>
      </Popover>
      {/* Lock button — absolute right, hidden until hover, like official */}
      {onToggleLock && (
        <button
          type="button"
          onClick={onToggleLock}
          data-locked={locked}
          className="absolute top-1/2 right-10 -translate-y-1/2 flex size-4 cursor-pointer items-center justify-center rounded opacity-0 transition-opacity group-hover/picker:opacity-100 group-focus-within/picker:opacity-100 focus:opacity-100 data-[locked=true]:opacity-100"
          title={locked ? '解鎖' : '鎖定'}
        >
          {locked
            ? <LockKeyhole className="h-3.5 w-3.5 text-white" />
            : <UnlockKeyhole className="h-3.5 w-3.5 text-white/30 hover:text-white" />
          }
        </button>
      )}
    </div>
  )
}

function OptionItem({
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
        className="w-full flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-neutral-100 hover:bg-neutral-600 transition-colors"
      >
        <span>{label}</span>
        {active && <Check className="h-4 w-4 text-neutral-100 shrink-0" />}
      </button>
    </PopoverClose>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ThemeCustomizerContent() {
  const {
    config,
    updateConfig,
    isDark,
    setTheme,
    mounted,
    locks,
    toggleLock,
  } = useThemeCustomizer()
  const { locale, setLocale } = useI18n()

  if (!mounted) return <div className="h-8" />

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

  const lockable = (key: ThemeConfigKey) => ({
    locked: locks[key],
    onToggleLock: () => toggleLock(key),
  })

  return (
    <div className="flex flex-col gap-3 px-2 py-3">

      {/* Style */}
      <OptionRow
        label="Style"
        displayValue={currentStyle.label}
        preview={<div className="h-3.5 w-5 border border-white rounded-sm" />}
        {...lockable('style')}
      >
        {stylePresets.map(s => (
          <OptionItem key={s.name} label={s.label} active={config.style === s.name} onClick={() => updateConfig({ style: s.name })} />
        ))}
      </OptionRow>

      {/* Separator */}
      <div className="h-px bg-white/5 -mx-2" />

      {/* Base Color */}
      <OptionRow
        label="Base Color"
        displayValue={currentBaseColor.label}
        preview={<div className="h-4 w-4 rounded-full" style={{ backgroundColor: currentBaseColor.light['muted-foreground'] }} />}
        {...lockable('baseColor')}
      >
        {baseThemes.map(base => (
          <OptionItem key={base.name} label={base.label} active={config.baseColor === base.name} onClick={() => updateConfig({ baseColor: base.name })} />
        ))}
      </OptionRow>

      {/* Theme */}
      <OptionRow
        label="Theme"
        displayValue={currentThemeColor.label}
        preview={<div className="h-4 w-4 rounded-full" style={{ backgroundColor: currentThemeColor.light['chart-3'] ?? currentThemeColor.light.primary }} />}
        {...lockable('themeColor')}
      >
        <OptionItem label="Neutral" active={config.themeColor === 'neutral'} onClick={() => updateConfig({ themeColor: 'neutral' })} />
        <div className="mx-1.5 my-1 h-px bg-white/10" />
        {colorThemes.filter(c => c.name !== 'neutral').map(color => (
          <OptionItem key={color.name} label={color.label} active={config.themeColor === color.name} onClick={() => updateConfig({ themeColor: color.name })} />
        ))}
      </OptionRow>

      {/* Chart Color */}
      <OptionRow
        label="Chart Color"
        displayValue={currentChartColor.label}
        preview={<div className="h-4 w-4 rounded-full" style={{ backgroundColor: currentChartColor.light['chart-3'] ?? currentChartColor.light.primary }} />}
        {...lockable('chartColor')}
      >
        <OptionItem label="Neutral" active={config.chartColor === 'neutral'} onClick={() => updateConfig({ chartColor: 'neutral' })} />
        <div className="mx-1.5 my-1 h-px bg-white/10" />
        {colorThemes.filter(c => c.name !== 'neutral').map(color => (
          <OptionItem key={color.name} label={color.label} active={config.chartColor === color.name} onClick={() => updateConfig({ chartColor: color.name })} />
        ))}
      </OptionRow>

      {/* Separator */}
      <div className="h-px bg-white/5 -mx-2" />

      {/* Heading */}
      <OptionRow
        label="Heading"
        displayValue={currentHeadingFont.label}
        preview={<span className="text-sm font-bold text-white">Aa</span>}
        {...lockable('headingFont')}
      >
        <OptionItem label="繼承內文" active={config.headingFont === 'inherit'} onClick={() => updateConfig({ headingFont: 'inherit' })} />
        {fontOptions.map(f => (
          <OptionItem key={f.name} label={f.label} active={config.headingFont === f.name} onClick={() => updateConfig({ headingFont: f.name })} />
        ))}
      </OptionRow>

      {/* Font */}
      <OptionRow
        label="Font"
        displayValue={currentFont.label}
        preview={<span className="text-sm font-bold text-white">Aa</span>}
        {...lockable('font')}
      >
        {fontOptions.map(f => (
          <OptionItem key={f.name} label={f.label} active={config.font === f.name} onClick={() => updateConfig({ font: f.name })} />
        ))}
      </OptionRow>

      {/* Icon Library */}
      <OptionRow
        label="Icon Library"
        displayValue={currentIconLib.label}
        preview={iconLibraryLogos[config.iconLibrary] ?? iconLibraryLogos.lucide}
        {...lockable('iconLibrary')}
      >
        {iconLibraries.map(lib => (
          <OptionItem key={lib.name} label={lib.label} active={config.iconLibrary === lib.name} onClick={() => updateConfig({ iconLibrary: lib.name })} />
        ))}
      </OptionRow>

      {/* Separator */}
      <div className="h-px bg-white/5 -mx-2" />

      {/* Radius */}
      <OptionRow
        label="Radius"
        displayValue={currentRadius.label}
        preview={(() => {
          // Map radius index to curve amount (0=none, 4=full)
          const r = [0, 2, 4, 7, 10][config.radius] ?? 4
          return (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-white">
              <path
                d={`M1 1 L${10 - r} 1 Q10 1 10 ${1 + r} L10 11`}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          )
        })()}
        {...lockable('radius')}
      >
        {radiusPresets.map((r, idx) => (
          <OptionItem key={r.label} label={r.label} active={config.radius === idx} onClick={() => updateConfig({ radius: idx })} />
        ))}
      </OptionRow>

      {/* Mode */}
      <OptionRow
        label="Mode"
        displayValue={isDark ? 'Dark' : 'Light'}
        preview={isDark ? <Moon className="h-4 w-4 text-white" /> : <Sun className="h-4 w-4 text-white" />}
      >
        <OptionItem label="Light" active={!isDark} onClick={() => setTheme('light')} />
        <OptionItem label="Dark" active={isDark} onClick={() => setTheme('dark')} />
      </OptionRow>

      {/* Separator */}
      <div className="h-px bg-white/5 -mx-2" />

      {/* Language — not part of ThemeConfig, unaffected by Shuffle */}
      <OptionRow
        label="Language"
        displayValue={localeOptions.find(o => o.value === locale)?.label ?? locale}
        preview={<Globe className="h-4 w-4 text-white" />}
      >
        {localeOptions.map(opt => (
          <OptionItem
            key={opt.value}
            label={opt.label}
            active={locale === opt.value}
            onClick={() => setLocale(opt.value)}
          />
        ))}
      </OptionRow>

    </div>
  )
}

export function ThemeCustomizerFooter() {
  const { resetToDefaults, mounted, shuffle, presetString } = useThemeCustomizer()
  const [copied, setCopied] = useState(false)

  if (!mounted) return null

  function handleCopyUrl() {
    copyToClipboard(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="shrink-0 px-2 pb-3 space-y-2">
      {/* Separator */}
      <div className="h-px bg-white/5" />

      {/* Preset — click to copy */}
      <button
        type="button"
        onClick={handleCopyUrl}
        className="w-full px-2 py-2 rounded-lg ring-1 ring-white/10 hover:bg-white/5 text-sm text-white/50 font-mono text-center transition-colors cursor-pointer"
      >
        {copied ? 'Copied' : presetString}
      </button>

      {/* Shuffle */}
      <button
        type="button"
        onClick={shuffle}
        className="w-full px-3 py-2 rounded-lg ring-1 ring-white/10 hover:bg-white/5 text-sm font-medium text-white/70 hover:text-white transition-colors cursor-pointer"
      >
        Shuffle
      </button>

      {/* Reset */}
      <button
        type="button"
        onClick={resetToDefaults}
        className="w-full px-3 py-2 rounded-lg ring-1 ring-white/10 hover:bg-white/5 text-sm font-medium text-white/70 hover:text-white transition-colors cursor-pointer"
      >
        Reset
      </button>
    </div>
  )
}
