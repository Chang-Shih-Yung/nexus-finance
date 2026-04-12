/**
 * Convert array of objects to CSV and trigger browser download.
 */
export function downloadCsv(
  rows: Record<string, unknown>[],
  filename: string,
  headers?: Record<string, string>
) {
  if (!rows.length) return

  const keys = Object.keys(rows[0])
  const headerRow = keys.map(k => headers?.[k] ?? k)

  const csvRows = [
    headerRow.join(','),
    ...rows.map(row =>
      keys.map(k => {
        const v = row[k]
        let s = v == null ? '' : String(v)
        // Prevent formula injection in Excel (=, +, -, @, \t, \r)
        if (/^[=+\-@\t\r]/.test(s)) s = "'" + s
        // Escape quotes and wrap if contains comma/quote/newline/CR
        return s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')
          ? `"${s.replace(/"/g, '""')}"`
          : s
      }).join(',')
    ),
  ]

  // BOM for Excel CJK support
  const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
