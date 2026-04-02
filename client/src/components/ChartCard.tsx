interface Props {
  title: string
  height?: number
  children: React.ReactNode
}

export default function ChartCard({ title, height = 280, children }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-medium text-gray-600 mb-4">{title}</h3>
      <div className="relative" style={{ height }}>
        {children}
      </div>
    </div>
  )
}
