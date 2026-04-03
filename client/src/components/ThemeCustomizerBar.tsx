'use client'

import { Check, Moon, Sun } from 'lucide-react'
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import {
  useThemeCustomizer,
  themeColors,
  baseColors,
  chartColors,
  stylePresets,
  fontOptions,
  radiusPresets,
} from '@/components/ThemeCustomizerProvider'

// ── Tile ──────────────────────────────────────────────────────────────────────

function Tile({
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
          className="shrink-0 flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-left min-w-[118px]"
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
        sideOffset={8}
        className="p-1 bg-sidebar border-sidebar-border min-w-[160px] w-auto"
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
        className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
      >
        <span>{label}</span>
        {active && <Check className="h-3.5 w-3.5 text-sidebar-primary shrink-0" />}
      </button>
    </PopoverClose>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ThemeCustomizerBar() {
  const { config, updateConfig, handleStyleChange, isDark, setTheme, mounted } =
    useThemeCustomizer()

  if (!mounted) return null

  const currentThemeColor =
    themeColors.find(c => c.hue === config.primaryHue && c.chroma === config.primaryChroma) ??
    themeColors[0]
  const currentBaseColor =
    baseColors.find(b => b.hue === config.baseHue && b.chroma === config.baseChroma) ??
    baseColors[0]
  const currentStyle = stylePresets.find(s => s.value === config.style) ?? stylePresets[0]
  const currentFont = fontOptions.find(f => f.value === config.font) ?? fontOptions[0]
  const currentChartColor = chartColors[config.chartColor] ?? chartColors[0]

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-sidebar border-t border-sidebar-border shadow-[0_-8px_24px_oklch(0_0_0/35%)]">
      <div className="flex gap-2 overflow-x-auto scrollbar-none px-3 py-2.5">

        {/* Style */}
        <Tile
          label="樣式"
          displayValue={currentStyle.label}
          icon={
            <div
              className="h-4 w-6 border border-white/30 bg-white/20 shrink-0"
              style={{ borderRadius: `${currentStyle.defaultRadius * 0.5}rem` }}
            />
          }
        >
          {stylePresets.map(s => (
            <TileItem
              key={s.value}
              label={s.label}
              active={config.style === s.value}
              onClick={() => handleStyleChange(s.value)}
            />
          ))}
        </Tile>

        {/* Theme color */}
        <Tile
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
                      'h-7 w-7 rounded-full border-2 flex items-center justify-center hover:scale-110 transition-transform',
                      isActive ? 'border-white' : 'border-transparent',
                    )}
                    style={{
                      backgroundColor: `oklch(0.55 ${color.chroma} ${color.hue})`,
                    }}
                  >
                    {isActive && <Check className="h-3 w-3 text-white drop-shadow" />}
                  </button>
                </PopoverClose>
              )
            })}
          </div>
        </Tile>

        {/* Base color */}
        <Tile
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
            <TileItem
              key={base.name}
              label={base.name}
              active={config.baseHue === base.hue && config.baseChroma === base.chroma}
              onClick={() => updateConfig({ baseHue: base.hue, baseChroma: base.chroma })}
            />
          ))}
        </Tile>

        {/* Radius */}
        <Tile
          label="圓角"
          displayValue={`${config.radius}rem`}
          icon={
            <div
              className="h-4 w-6 border border-white/30 bg-white/20 shrink-0"
              style={{ borderRadius: `${Math.min(config.radius * 0.8, 0.5)}rem` }}
            />
          }
        >
          {radiusPresets.map(r => (
            <TileItem
              key={r}
              label={`${r}rem`}
              active={Math.abs(config.radius - r) < 0.01}
              onClick={() => updateConfig({ radius: r })}
            />
          ))}
        </Tile>

        {/* Heading font */}
        <Tile
          label="標題字型"
          displayValue={
            (fontOptions.find(f => f.value === config.headingFont) ?? fontOptions[0]).label
          }
          icon={<span className="text-xs font-bold text-white/60 shrink-0">Aa</span>}
        >
          {fontOptions.map(f => (
            <TileItem
              key={f.value}
              label={f.label}
              active={config.headingFont === f.value}
              onClick={() => updateConfig({ headingFont: f.value })}
            />
          ))}
        </Tile>

        {/* Body font */}
        <Tile
          label="字型"
          displayValue={currentFont.label}
          icon={<span className="text-xs font-bold text-white/60 shrink-0">Aa</span>}
        >
          {fontOptions.map(f => (
            <TileItem
              key={f.value}
              label={f.label}
              active={config.font === f.value}
              onClick={() => updateConfig({ font: f.value })}
            />
          ))}
        </Tile>

        {/* Chart color */}
        <Tile
          label="圖表配色"
          displayValue={currentChartColor.name}
          icon={
            <div
              className="h-5 w-5 rounded-full shrink-0"
              style={{ backgroundColor: `oklch(0.55 ${currentChartColor.chroma} ${currentChartColor.hue})` }}
            />
          }
        >
          {chartColors.map((color, idx) => (
            <TileItem
              key={color.name}
              label={color.name}
              active={config.chartColor === idx}
              onClick={() => updateConfig({ chartColor: idx })}
            />
          ))}
        </Tile>

        {/* Mode */}
        <Tile
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

      </div>
    </div>
  )
}
