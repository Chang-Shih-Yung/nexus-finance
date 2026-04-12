/** Shared chart constants across dashboard sections */

export const PIE_COLORS = [
  'var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)',
  'var(--color-chart-4)', 'var(--color-chart-5)',
] as const

export const PIE_COLORS_ALT = [
  'var(--color-chart-4)', 'var(--color-chart-1)', 'var(--color-chart-3)',
  'var(--color-chart-5)', 'var(--color-chart-2)',
] as const

export const TIER_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  premium: 'default',
  vip: 'secondary',
  general: 'outline',
}
