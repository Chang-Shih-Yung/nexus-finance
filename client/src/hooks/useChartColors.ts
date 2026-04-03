'use client'

import { useEffect, useState } from 'react'

function getCssVar(name: string): string {
  if (typeof window === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function useChartColors() {
  const [colors, setColors] = useState({
    chart1: '#2563eb',
    chart2: '#16a34a',
    chart3: '#ca8a04',
    chart4: '#dc2626',
    chart5: '#7c3aed',
  })

  useEffect(() => {
    function read() {
      setColors({
        chart1: getCssVar('--chart-1') || '#2563eb',
        chart2: getCssVar('--chart-2') || '#16a34a',
        chart3: getCssVar('--chart-3') || '#ca8a04',
        chart4: getCssVar('--chart-4') || '#dc2626',
        chart5: getCssVar('--chart-5') || '#7c3aed',
      })
    }
    read()
    // Re-read when theme changes (class on <html> changes)
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return colors
}
