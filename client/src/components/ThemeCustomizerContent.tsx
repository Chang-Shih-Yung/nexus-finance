'use client'

import { useState } from 'react'
import { Check, LockKeyhole, Moon, Sun, UnlockKeyhole } from 'lucide-react'
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  useThemeCustomizer,
  copyToClipboard,
  colorThemes,
  baseThemes,
  stylePresets,
  fontOptions,
  radiusPresets,
  type ThemeConfigKey,
} from '@/components/ThemeCustomizerProvider'

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

  if (!mounted) return <div className="h-8" />

  const currentStyle = stylePresets.find(s => s.name === config.style) ?? stylePresets[0]
  const currentThemeColor = colorThemes.find(c => c.name === config.themeColor) ?? colorThemes[0]
  const currentBaseColor = baseThemes.find(b => b.name === config.baseColor) ?? baseThemes[2]
  const currentFont = fontOptions.find(f => f.name === config.font) ?? fontOptions[0]
  const currentHeadingFont = config.headingFont === 'inherit'
    ? { label: '繼承內文' }
    : (fontOptions.find(f => f.name === config.headingFont) ?? fontOptions[0])
  const currentChartColor = colorThemes.find(c => c.name === config.chartColor) ?? colorThemes[0]
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
        preview={<div className="h-4 w-4 rounded-full" style={{ backgroundColor: currentThemeColor.light.primary }} />}
        {...lockable('themeColor')}
      >
        {colorThemes.map(color => (
          <OptionItem key={color.name} label={color.label} active={config.themeColor === color.name} onClick={() => updateConfig({ themeColor: color.name })} />
        ))}
      </OptionRow>

      {/* Chart Color */}
      <OptionRow
        label="Chart Color"
        displayValue={currentChartColor.label}
        preview={<div className="h-4 w-4 rounded-full" style={{ backgroundColor: currentChartColor.light.primary }} />}
        {...lockable('chartColor')}
      >
        {colorThemes.map(color => (
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
