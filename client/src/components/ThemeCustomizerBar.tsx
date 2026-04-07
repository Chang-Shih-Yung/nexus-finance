'use client'

import { useState } from 'react'
import { Check, Link, Moon, Shuffle, Sun } from 'lucide-react'
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  useThemeCustomizer,
  copyToClipboard,
  colorThemes,
  baseThemes,
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
  const { config, updateConfig, isDark, setTheme, mounted, shuffle, getShareUrl } =
    useThemeCustomizer()
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
      <div className="relative z-[30] lg:hidden bg-[oklch(0.18_0_0)] border border-white/10 rounded-2xl shrink-0 overflow-hidden shadow-xl">
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
                style={{ backgroundColor: currentThemeColor.light.primary }}
              />
            }
          >
            {colorThemes.map(color => (
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
                style={{ backgroundColor: currentChartColor.light.primary }}
              />
            }
          >
            {colorThemes.map(color => (
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

          {/* Shuffle */}
          <button
            type="button"
            onClick={shuffle}
            className="shrink-0 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
            title="隨機組合"
          >
            <Shuffle className="h-4 w-4 text-white/60" />
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={() => {
              copyToClipboard(getShareUrl())
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }}
            className="shrink-0 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
            title="複製分享連結"
          >
            {copied
              ? <Check className="h-4 w-4 text-green-400" />
              : <Link className="h-4 w-4 text-white/60" />
            }
          </button>

        </div>
      </div>
    </>
  )
}
