'use client'

import { useEffect, useState } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import ChartCard from '@/components/ChartCard'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useChartColors } from '@/hooks/useChartColors'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface ErrorRow { error_code: string; count: number }
interface TxRow {
  id: number; created_at: string; user_name: string; tier: string
  amount: number; channel: string; error_code: string; error_message: string
}

const tierVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  premium: 'default',
  vip: 'secondary',
  general: 'outline',
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function ErrorsSection() {
  const colors = useChartColors()
  const [errorData, setErrorData] = useState<ErrorRow[]>([])
  const [failedTx, setFailedTx] = useState<TxRow[]>([])

  useEffect(() => {
    Promise.allSettled([
      api.getErrorBreakdown(),
      api.getFailedTransactions(30),
    ]).then(([errors, txs]) => {
      if (errors.status === 'fulfilled') setErrorData(errors.value as ErrorRow[])
      if (txs.status === 'fulfilled') setFailedTx(txs.value as TxRow[])
    })
  }, [])

  const chartData = {
    labels: errorData.map(d => d.error_code),
    datasets: [{
      label: '次數',
      data: errorData.map(d => Number(d.count)),
      backgroundColor: colors.chart4,
      borderRadius: 6,
    }],
  }

  return (
    <section id="errors" className="scroll-mt-28 py-8 border-t border-border">
      <h2 className="text-base font-semibold text-foreground mb-4">錯誤監控</h2>
      <ChartCard title="錯誤代碼分佈" height={260}>
        {errorData.length > 0 && (
          <Bar data={chartData} options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
          }} />
        )}
      </ChartCard>

      <Card className="mt-6 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">最近失敗交易明細</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>時間</TableHead>
                  <TableHead>客戶</TableHead>
                  <TableHead>等級</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                  <TableHead>管道</TableHead>
                  <TableHead>錯誤代碼</TableHead>
                  <TableHead>錯誤訊息</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failedTx.map(tx => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-muted-foreground">{formatTime(tx.created_at)}</TableCell>
                    <TableCell className="font-medium">{tx.user_name}</TableCell>
                    <TableCell>
                      <Badge variant={tierVariant[tx.tier] ?? 'outline'}>{tx.tier}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{Number(tx.amount).toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground">{tx.channel}</TableCell>
                    <TableCell><span className="text-destructive font-mono text-xs">{tx.error_code}</span></TableCell>
                    <TableCell className="text-muted-foreground text-xs">{tx.error_message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
