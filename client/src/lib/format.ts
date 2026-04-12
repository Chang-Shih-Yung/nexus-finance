/** Shared formatting functions */

export function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function formatTime(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function formatAmount(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return v.toLocaleString()
}

/** Convert RPC trend data to chart-ready format */
export function toChartData(rows: Array<{ date: string; metric_value: number }>) {
  return rows.map(d => ({ date: formatDate(d.date), value: Number(d.metric_value) }))
}

/** Convert RPC breakdown data to pie/bar-ready format */
export function toBreakdownData(
  rows: Array<{ dimension_value: string; metric_value: number }>,
  labelFn?: (key: string) => string
) {
  return rows.map(d => ({
    name: labelFn ? labelFn(d.dimension_value) : d.dimension_value,
    value: Number(d.metric_value),
  }))
}
