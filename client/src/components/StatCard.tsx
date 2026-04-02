interface Props {
  title: string
  value: number | string
  subtitle?: string
  format?: 'number' | 'percent' | 'plain'
  warn?: boolean
}

export default function StatCard({ title, value, subtitle, format, warn }: Props) {
  const display =
    format === 'percent'
      ? `${value}%`
      : format === 'number' && typeof value === 'number'
        ? value.toLocaleString()
        : value

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className={`text-3xl font-bold ${warn ? 'text-red-600' : 'text-gray-900'}`}>
        {display}
      </p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  )
}
