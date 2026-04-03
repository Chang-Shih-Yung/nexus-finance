'use client'

import { useEffect, useState } from 'react'

/** Resolve any CSS color (including oklch) to a hex string like #rrggbb */
function cssColorToHex(raw: string): string {
  if (!raw || typeof document === 'undefined') return ''
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  const ctx = canvas.getContext('2d')
  if (!ctx) return raw
  ctx.fillStyle = raw
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function getCssVar(name: string): string {
  if (typeof window === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

const FALLBACKS = {
  chart1: '#2563eb',
  chart2: '#16a34a',
  chart3: '#ca8a04',
  chart4: '#dc2626',
  chart5: '#7c3aed',
}

export function useChartColors() {
  const [colors, setColors] = useState(FALLBACKS)

  useEffect(() => {
    function read() {
      setColors({
        chart1: cssColorToHex(getCssVar('--chart-1')) || FALLBACKS.chart1,
        chart2: cssColorToHex(getCssVar('--chart-2')) || FALLBACKS.chart2,
        chart3: cssColorToHex(getCssVar('--chart-3')) || FALLBACKS.chart3,
        chart4: cssColorToHex(getCssVar('--chart-4')) || FALLBACKS.chart4,
        chart5: cssColorToHex(getCssVar('--chart-5')) || FALLBACKS.chart5,
      })
    }
    read()
    // Re-read when theme changes (class or inline style from ThemeCustomizer)
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] })
    return () => observer.disconnect()
  }, [])

  return colors
}
