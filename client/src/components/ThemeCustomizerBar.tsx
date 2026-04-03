'use client'

import { useState } from 'react'
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

type TileId =
  | 'style'
  | 'theme'
  | 'base'
  | 'radius'
  | 'heading'
  | 'font'
  | 'chart'
  | 'mode'

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
        sideOffset={10}
        className="p-1 bg-[oklch(0.22_0_0)] border-white/10 min-w-[200px] w-auto shadow-2xl"
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
  const { config, updateConfig, handleStyleChange, isDark, setTheme, mounted } =
    useThemeCustomizer()
  const [openId, setOpenId] = useState<TileId | null>(null)

  function handleOpen(id: TileId, open: boolean) {
    setOpenId(open ? id : null)
  }

  if (!mounted) return null

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
  const currentChartColor = chartColors[config.chartColor] ?? chartColors[0]

  return (
    <>
      {/* Backdrop — locks background interaction when any tile is open */}
      {openId !== null && (
        <div
          className="fixed inset-0 z-[29] touch-none"
          onClick={() => setOpenId(null)}
        />
      )}

      {/* Bar — relative z-[30] sits above the backdrop */}
      <div className="lg:hidden relative z-[30] bg-[oklch(0.18_0_0)] border-t border-white/8 shadow-[0_-8px_24px_oklch(0_0_0/40%)] shrink-0">
        <div className="flex gap-2 overflow-x-auto scrollbar-none px-3 py-2.5">

          {/* Style */}
          <Tile
            id="style"
            openId={openId}
            onOpenChange={(o) => handleOpen('style', o)}
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
            id="theme"
            openId={openId}
            onOpenChange={(o) => handleOpen('theme', o)}
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
            id="base"
            openId={openId}
            onOpenChange={(o) => handleOpen('base', o)}
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
            id="radius"
            openId={openId}
            onOpenChange={(o) => handleOpen('radius', o)}
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
            id="heading"
            openId={openId}
            onOpenChange={(o) => handleOpen('heading', o)}
            label="標題字型"
            displayValue={currentHeadingFont.label}
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
            id="font"
            openId={openId}
            onOpenChange={(o) => handleOpen('font', o)}
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
            id="chart"
            openId={openId}
            onOpenChange={(o) => handleOpen('chart', o)}
            label="圖表配色"
            displayValue={currentChartColor.name}
            icon={
              <div
                className="h-5 w-5 rounded-full shrink-0"
                style={{
                  backgroundColor: `oklch(0.55 ${currentChartColor.chroma} ${currentChartColor.hue})`,
                }}
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

        </div>
      </div>
    </>
  )
}
