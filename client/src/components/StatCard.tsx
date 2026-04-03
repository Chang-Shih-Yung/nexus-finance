import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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
    <Card className="border-slate-200/80 bg-white/90 shadow-sm">
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className={`text-3xl ${warn ? 'text-rose-600' : 'text-slate-900'}`}>
          {display}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {warn ? <Badge variant="destructive">需關注</Badge> : <Badge variant="secondary">正常</Badge>}
        {subtitle && <p className="mt-2 text-xs text-slate-500">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}
