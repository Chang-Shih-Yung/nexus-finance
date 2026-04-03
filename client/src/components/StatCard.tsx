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
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className={`text-3xl ${warn ? 'text-destructive' : 'text-foreground'}`}>
          {display}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {warn ? <Badge variant="destructive">需關注</Badge> : <Badge variant="secondary">正常</Badge>}
        {subtitle && <p className="mt-2 text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}
