import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  title: string
  height?: number
  children: React.ReactNode
}

export default function ChartCard({ title, height = 280, children }: Props) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm tracking-wide text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative" style={{ height }}>
          {children}
        </div>
      </CardContent>
    </Card>
  )
}
