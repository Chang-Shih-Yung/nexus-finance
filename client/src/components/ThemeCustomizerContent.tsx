'use client'

import { Check, Moon, RotateCcw, Sun } from 'lucide-react'
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import {
  useThemeCustomizer,
  themeColors,
  baseColors,
  chartPalettes,
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
        className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
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
    handleStyleChange,
    resetToDefaults,
    isDark,
    setTheme,
    mounted,
  } = useThemeCustomizer()

  if (!mounted) return <div className="h-8" />

  const currentThemeColor =
    themeColors.find(c => c.hue === config.primaryHue && c.chroma === config.primaryChroma) ??
    themeColors[0]
  const currentBaseColor =
    baseColors.find(b => b.hue === config.baseHue && b.chroma === config.baseChroma) ??
    baseColors[0]
  const currentStyle = stylePresets.find(s => s.value === config.style) ?? stylePresets[0]
  const currentFont = fontOptions.find(f => f.value === config.font) ?? fontOptions[0]
  const currentHeadingFont =
    fontOptions.find(f => f.value === config.headingFont) ?? fontOptions[0]
  const currentChartPalette = chartPalettes[config.chartPalette] ?? chartPalettes[0]

  return (
    <div className="px-3 py-4 space-y-2">

      {/* Style */}
      <OptionRow
        label="樣式"
        displayValue={currentStyle.label}
        icon={
          <div
            className="h-4 w-7 border border-sidebar-border bg-sidebar-accent/40 shrink-0"
            style={{ borderRadius: `${currentStyle.defaultRadius * 0.5}rem` }}
          />
        }
      >
        {stylePresets.map(s => (
          <OptionItem
            key={s.value}
            label={s.label}
            active={config.style === s.value}
            onClick={() => handleStyleChange(s.value)}
          />
        ))}
      </OptionRow>

      {/* Theme color */}
      <OptionRow
        label="主題色"
        displayValue={currentThemeColor.name}
        icon={
          <div
            className="h-5 w-5 rounded-full shrink-0"
            style={{
              backgroundColor: `oklch(0.55 ${currentThemeColor.chroma} ${currentThemeColor.hue})`,
            }}
          />
        }
      >
        <div className="p-2 grid grid-cols-4 gap-1.5">
          {themeColors.map(color => {
            const isActive =
              config.primaryHue === color.hue && config.primaryChroma === color.chroma
            return (
              <PopoverClose key={color.name} asChild>
                <button
                  title={color.name}
                  onClick={() =>
                    updateConfig({ primaryHue: color.hue, primaryChroma: color.chroma })
                  }
                  className={cn(
                    'h-7 w-7 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110',
                    isActive ? 'border-white' : 'border-transparent',
                  )}
                  style={{
                    backgroundColor: `oklch(0.55 ${color.chroma} ${color.hue})`,
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
        displayValue={currentBaseColor.name}
        icon={
          <div
            className="h-5 w-5 rounded-full shrink-0"
            style={{
              backgroundColor: `oklch(0.5 ${currentBaseColor.chroma} ${currentBaseColor.hue})`,
            }}
          />
        }
      >
        {baseColors.map(base => (
          <OptionItem
            key={base.name}
            label={base.name}
            active={config.baseHue === base.hue && config.baseChroma === base.chroma}
            onClick={() => updateConfig({ baseHue: base.hue, baseChroma: base.chroma })}
          />
        ))}
      </OptionRow>

      {/* Radius */}
      <OptionRow
        label="圓角"
        displayValue={`${config.radius}rem`}
        icon={
          <div
            className="h-4 w-7 border border-sidebar-border bg-sidebar-accent/40 shrink-0"
            style={{ borderRadius: `${Math.min(config.radius * 0.8, 0.5)}rem` }}
          />
        }
      >
        {radiusPresets.map(r => (
          <OptionItem
            key={r}
            label={`${r}rem`}
            active={Math.abs(config.radius - r) < 0.01}
            onClick={() => updateConfig({ radius: r })}
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
        {fontOptions.map(f => (
          <OptionItem
            key={f.value}
            label={f.label}
            active={config.headingFont === f.value}
            onClick={() => updateConfig({ headingFont: f.value })}
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
            key={f.value}
            label={f.label}
            active={config.font === f.value}
            onClick={() => updateConfig({ font: f.value })}
          />
        ))}
      </OptionRow>

      {/* Chart palette */}
      <OptionRow
        label="圖表配色"
        displayValue={currentChartPalette.name}
        icon={
          <div className="flex gap-0.5 overflow-hidden rounded shrink-0">
            {currentChartPalette.colors.slice(0, 4).map((c, i) => (
              <div
                key={i}
                className="h-4 w-2.5"
                style={{ backgroundColor: `oklch(${c.l} ${c.c} ${c.h})` }}
              />
            ))}
          </div>
        }
      >
        {chartPalettes.map((palette, idx) => (
          <OptionItem
            key={palette.name}
            label={palette.name}
            active={config.chartPalette === idx}
            onClick={() => updateConfig({ chartPalette: idx })}
          />
        ))}
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
