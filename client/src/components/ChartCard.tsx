import { Children } from 'react'
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
  const hasContent = Children.toArray(children).filter(Boolean).length > 0

  return (
    <Card id={id} className={cn('shadow-sm', className)}>
      <CardHeader>
        <CardTitle className="text-sm tracking-wide text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative" style={{ height, minHeight: 1 }}>
          {hasContent ? children : (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
              暫無資料
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
