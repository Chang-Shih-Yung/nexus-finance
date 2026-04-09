import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface Props {
  id?: string
  title: string
  height?: number
  className?: string
  children: React.ReactNode
}

export default function ChartCard({ id, title, height = 280, className, children }: Props) {
  return (
    <Card id={id} className={cn('shadow-sm', className)}>
      <CardHeader>
        <CardTitle className="text-sm tracking-wide text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative" style={{ height, minHeight: 1 }}>
          {children}
        </div>
      </CardContent>
    </Card>
  )
}
