'use client'

import { useState } from 'react'
import { Check, Copy, Link, Lock, Moon, RotateCcw, Save, Shuffle, Sun, Trash2, Unlock } from 'lucide-react'
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  useThemeCustomizer,
  copyToClipboard,
  encodeThemeUrl,
  colorThemes,
  baseThemes,
  stylePresets,
  fontOptions,
  radiusPresets,
  type ThemeConfigKey,
} from '@/components/ThemeCustomizerProvider'

// ── Shared primitives ─────────────────────────────────────────────────────────

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
    <div className="group relative">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left"
          >
            <div className="min-w-0">
              <p className="text-[11px] text-white/40 leading-none mb-1">
                {label}
              </p>
              <p className="text-[13px] font-medium text-white leading-none truncate">
                {displayValue}
              </p>
            </div>
            {preview && <div className="shrink-0 ml-2">{preview}</div>}
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="start"
          sideOffset={8}
          className="p-1.5 min-w-[140px] w-auto shadow-lg"
        >
          {children}
        </PopoverContent>
      </Popover>
      {onToggleLock && (
        <button
          type="button"
          onClick={onToggleLock}
          className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded hover:bg-white/10"
          title={locked ? '解鎖' : '鎖定'}
        >
          {locked
            ? <Lock className="h-2.5 w-2.5 text-white/60" />
            : <Unlock className="h-2.5 w-2.5 text-white/15" />
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
        className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors"
      >
        <span>{label}</span>
        {active && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
      </button>
    </PopoverClose>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ThemeCustomizerContent() {
  const {
    config,
    updateConfig,
    resetToDefaults,
    isDark,
    setTheme,
    mounted,
    locks,
    toggleLock,
    shuffle,
    presets,
    savePreset,
    loadPreset,
    deletePreset,
    getShareUrl,
  } = useThemeCustomizer()

  const [presetName, setPresetName] = useState('')
  const [copied, setCopied] = useState(false)

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

  function handleCopyUrl() {
    copyToClipboard(getShareUrl())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleSavePreset() {
    const name = presetName.trim()
    if (!name) return
    savePreset(name)
    setPresetName('')
  }

  const lockable = (key: ThemeConfigKey) => ({
    locked: locks[key],
    onToggleLock: () => toggleLock(key),
  })

  // Compact preset string for display
  const presetString = `--preset ${config.style}-${config.themeColor}`

  return (
    <div className="px-1 py-3">

      {/* Style */}
      <OptionRow
        label="Style"
        displayValue={currentStyle.label}
        preview={<div className="h-4 w-6 border border-white/20 bg-white/10 rounded" />}
        {...lockable('style')}
      >
        {stylePresets.map(s => (
          <OptionItem key={s.name} label={s.label} active={config.style === s.name} onClick={() => updateConfig({ style: s.name })} />
        ))}
      </OptionRow>

      {/* Base Color */}
      <OptionRow
        label="Base Color"
        displayValue={currentBaseColor.label}
        preview={<div className="h-4 w-4 rounded-full border border-white/10" style={{ backgroundColor: currentBaseColor.light['muted-foreground'] }} />}
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

      {/* Heading */}
      <OptionRow
        label="Heading"
        displayValue={currentHeadingFont.label}
        preview={<span className="text-sm font-semibold text-white/40">Aa</span>}
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
        preview={<span className="text-sm font-semibold text-white/40">Aa</span>}
        {...lockable('font')}
      >
        {fontOptions.map(f => (
          <OptionItem key={f.name} label={f.label} active={config.font === f.name} onClick={() => updateConfig({ font: f.name })} />
        ))}
      </OptionRow>

      {/* Radius */}
      <OptionRow
        label="Radius"
        displayValue={currentRadius.label}
        preview={<div className="h-4 w-6 border border-white/20 bg-white/10" style={{ borderRadius: currentRadius.value }} />}
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
        preview={isDark ? <Moon className="h-4 w-4 text-white/40" /> : <Sun className="h-4 w-4 text-white/40" />}
      >
        <OptionItem label="Light" active={!isDark} onClick={() => setTheme('light')} />
        <OptionItem label="Dark" active={isDark} onClick={() => setTheme('dark')} />
      </OptionRow>

      {/* ── Bottom actions ── */}
      <div className="px-3 pt-3 mt-2 border-t border-white/5 space-y-2">

        {/* Preset string (like --preset b0) */}
        <div className="flex gap-1.5">
          <div
            className="flex-1 min-w-0 px-2.5 py-2 rounded-lg bg-white/5 text-[11px] text-white/50 font-mono truncate cursor-text select-all"
            onClick={handleCopyUrl}
            title={getShareUrl()}
          >
            {presetString}
          </div>
          <button
            onClick={handleCopyUrl}
            className="shrink-0 p-2 rounded-lg hover:bg-white/5 transition-colors"
            title="複製分享連結"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Link className="h-3.5 w-3.5 text-white/30" />}
          </button>
        </div>

        {/* Shuffle */}
        <button
          onClick={shuffle}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-[13px] font-medium text-white/70 hover:text-white transition-colors"
        >
          Shuffle
        </button>

        {/* Save preset */}
        <div className="flex gap-1">
          <input
            type="text"
            value={presetName}
            onChange={e => setPresetName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSavePreset()}
            placeholder="儲存預設組合…"
            className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-white/5 text-[11px] text-white/70 placeholder:text-white/20 focus:outline-none focus:bg-white/10 border-none"
          />
          <button
            onClick={handleSavePreset}
            disabled={!presetName.trim()}
            className="shrink-0 px-2 py-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors disabled:opacity-20"
          >
            <Save className="h-3 w-3" />
          </button>
        </div>

        {/* Preset list */}
        {presets.length > 0 && (
          <div className="space-y-0.5">
            {presets.map(p => (
              <div key={p.name} className="flex items-center gap-0.5">
                <button
                  onClick={() => loadPreset(p)}
                  className="flex-1 min-w-0 text-left px-2.5 py-1.5 rounded-lg text-[11px] text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors truncate"
                >
                  {p.name}
                </button>
                <button
                  onClick={() => {
                    copyToClipboard(
                      window.location.origin + window.location.pathname +
                      encodeThemeUrl(p.config, p.mode === 'dark')
                    )
                  }}
                  className="shrink-0 p-1 rounded text-white/20 hover:text-white/50 transition-colors"
                  title="複製連結"
                >
                  <Copy className="h-2.5 w-2.5" />
                </button>
                <button
                  onClick={() => deletePreset(p.name)}
                  className="shrink-0 p-1 rounded text-white/20 hover:text-red-400 transition-colors"
                  title="刪除"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Reset */}
        <button
          onClick={resetToDefaults}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          重置
        </button>
      </div>
    </div>
  )
}
