'use client'

import { Check, Moon, RotateCcw, Sun } from 'lucide-react'
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import {
  useThemeCustomizer,
  colorThemes,
  baseThemes,
  stylePresets,
  fontOptions,
  radiusPresets,
} from '@/components/ThemeCustomizerProvider'

// ── Shared primitives ─────────────────────────────────────────────────────────

function OptionRow({
  label,
  displayValue,
  icon,
  children,
}: {
  label: string
  displayValue: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl border border-sidebar-border bg-sidebar-accent/10 hover:bg-sidebar-accent/40 transition-colors text-left"
        >
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium text-sidebar-foreground/50 uppercase tracking-wider leading-none mb-1">
              {label}
            </p>
            <p className="text-sm font-semibold text-sidebar-foreground leading-none truncate">
              {displayValue}
            </p>
          </div>
          <div className="shrink-0">{icon}</div>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        className="p-1 bg-sidebar border-sidebar-border min-w-[160px] w-auto"
      >
        {children}
      </PopoverContent>
    </Popover>
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
        className="w-full flex items-center justify-between px-4 py-3 rounded-md text-[15px] text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
      >
        <span>{label}</span>
        {active && <Check className="h-3.5 w-3.5 text-sidebar-primary shrink-0" />}
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

  return (
    <div className="px-3 py-4 space-y-2">

      {/* Style */}
      <OptionRow
        label="樣式"
        displayValue={currentStyle.label}
        icon={
          <div className="h-4 w-7 border border-sidebar-border bg-sidebar-accent/40 shrink-0 rounded" />
        }
      >
        {stylePresets.map(s => (
          <OptionItem
            key={s.name}
            label={s.label}
            active={config.style === s.name}
            onClick={() => updateConfig({ style: s.name })}
          />
        ))}
      </OptionRow>

      {/* Theme color */}
      <OptionRow
        label="主題色"
        displayValue={currentThemeColor.label}
        icon={
          <div
            className="h-5 w-5 rounded-full shrink-0"
            style={{
              backgroundColor: currentThemeColor.light.primary,
            }}
          />
        }
      >
        <div className="p-2 grid grid-cols-4 gap-1.5">
          {colorThemes.map(color => {
            const isActive = config.themeColor === color.name
            return (
              <PopoverClose key={color.name} asChild>
                <button
                  title={color.label}
                  onClick={() => updateConfig({ themeColor: color.name })}
                  className={cn(
                    'h-7 w-7 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110',
                    isActive ? 'border-white' : 'border-transparent',
                  )}
                  style={{
                    backgroundColor: color.light.primary,
                  }}
                >
                  {isActive && <Check className="h-3.5 w-3.5 text-white drop-shadow" />}
                </button>
              </PopoverClose>
            )
          })}
        </div>
      </OptionRow>

      {/* Base color */}
      <OptionRow
        label="基底灰調"
        displayValue={currentBaseColor.label}
        icon={
          <div
            className="h-5 w-5 rounded-full shrink-0"
            style={{
              backgroundColor: currentBaseColor.light.muted,
            }}
          />
        }
      >
        {baseThemes.map(base => (
          <OptionItem
            key={base.name}
            label={base.label}
            active={config.baseColor === base.name}
            onClick={() => updateConfig({ baseColor: base.name })}
          />
        ))}
      </OptionRow>

      {/* Radius */}
      <OptionRow
        label="圓角"
        displayValue={currentRadius.label}
        icon={
          <div
            className="h-4 w-7 border border-sidebar-border bg-sidebar-accent/40 shrink-0"
            style={{ borderRadius: currentRadius.value }}
          />
        }
      >
        {radiusPresets.map((r, idx) => (
          <OptionItem
            key={r.label}
            label={r.label}
            active={config.radius === idx}
            onClick={() => updateConfig({ radius: idx })}
          />
        ))}
      </OptionRow>

      {/* Heading font */}
      <OptionRow
        label="標題字型"
        displayValue={currentHeadingFont.label}
        icon={
          <span className="text-sm font-semibold text-sidebar-foreground/50 shrink-0">Aa</span>
        }
      >
        <OptionItem
          label="繼承內文"
          active={config.headingFont === 'inherit'}
          onClick={() => updateConfig({ headingFont: 'inherit' })}
        />
        {fontOptions.map(f => (
          <OptionItem
            key={f.name}
            label={f.label}
            active={config.headingFont === f.name}
            onClick={() => updateConfig({ headingFont: f.name })}
          />
        ))}
      </OptionRow>

      {/* Body font */}
      <OptionRow
        label="字型"
        displayValue={currentFont.label}
        icon={
          <span className="text-sm font-semibold text-sidebar-foreground/50 shrink-0">Aa</span>
        }
      >
        {fontOptions.map(f => (
          <OptionItem
            key={f.name}
            label={f.label}
            active={config.font === f.name}
            onClick={() => updateConfig({ font: f.name })}
          />
        ))}
      </OptionRow>

      {/* Chart color */}
      <OptionRow
        label="圖表配色"
        displayValue={currentChartColor.label}
        icon={
          <div
            className="h-5 w-5 rounded-full shrink-0"
            style={{ backgroundColor: currentChartColor.light.primary }}
          />
        }
      >
        <div className="p-2 grid grid-cols-4 gap-1.5">
          {colorThemes.map(color => {
            const isActive = config.chartColor === color.name
            return (
              <PopoverClose key={color.name} asChild>
                <button
                  title={color.label}
                  onClick={() => updateConfig({ chartColor: color.name })}
                  className={cn(
                    'h-7 w-7 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110',
                    isActive ? 'border-white' : 'border-transparent',
                  )}
                  style={{
                    backgroundColor: color.light.primary,
                  }}
                >
                  {isActive && <Check className="h-3.5 w-3.5 text-white drop-shadow" />}
                </button>
              </PopoverClose>
            )
          })}
        </div>
      </OptionRow>

      {/* Mode */}
      <OptionRow
        label="外觀模式"
        displayValue={isDark ? '深色' : '淺色'}
        icon={
          isDark ? (
            <Moon className="h-4 w-4 text-sidebar-foreground/50 shrink-0" />
          ) : (
            <Sun className="h-4 w-4 text-sidebar-foreground/50 shrink-0" />
          )
        }
      >
        <OptionItem label="淺色" active={!isDark} onClick={() => setTheme('light')} />
        <OptionItem label="深色" active={isDark} onClick={() => setTheme('dark')} />
      </OptionRow>

      {/* Reset */}
      <button
        onClick={resetToDefaults}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-sidebar-border text-xs text-sidebar-foreground/40 hover:text-sidebar-foreground/70 hover:bg-sidebar-accent/20 transition-colors mt-1"
      >
        <RotateCcw className="h-3 w-3" />
        重置為預設值
      </button>
    </div>
  )
}
