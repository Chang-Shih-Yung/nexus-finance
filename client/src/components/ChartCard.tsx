import { Children } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileBarChart } from '@/lib/icons'
import { useI18n } from '@/lib/i18n/context'
import { cn } from '@/lib/utils'

interface Props {
  id?: string
  title: string
  height?: number
  className?: string
  children: React.ReactNode
}

export default function ChartCard({ id, title, height = 280, className, children }: Props) {
  const { t } = useI18n()
  const hasContent = Children.toArray(children).filter(Boolean).length > 0

  return (
    <Card id={id} className={cn('shadow-sm', className)}>
      <CardHeader>
        <CardTitle className="text-sm tracking-wide text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative" style={{ height, minHeight: 1 }}>
          {hasContent ? children : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground/50">
              <FileBarChart className="size-8" />
              <span className="text-xs">{t('common.noDataInRange')}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
