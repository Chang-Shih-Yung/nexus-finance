'use client'

import { useEffect, useState } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import ChartCard from '@/components/ChartCard'
import { Card, CardContent } from '@/components/ui/card'
import { api } from '@/lib/api'
import { useChartColors } from '@/hooks/useChartColors'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface FunnelRow {
  step: string
  users: number
  conversion_rate: number
  drop_off_rate: number
}

const stepLabels: Record<string, string> = {
  login: '登入',
  transfer_init: '發起轉帳',
  transfer_success: '轉帳成功',
}

export default function FunnelPage() {
  const colors = useChartColors()
  const [funnelData, setFunnelData] = useState<FunnelRow[]>([])

  useEffect(() => {
    api.getFunnel().then(d => setFunnelData(d as FunnelRow[])).catch(console.error)
  }, [])

  const chartData = {
    labels: funnelData.map(d => stepLabels[d.step] || d.step),
    datasets: [{
      label: '不重複使用者數',
      data: funnelData.map(d => d.users),
      backgroundColor: [colors.chart1, colors.chart3, colors.chart2],
      borderRadius: 8,
    }],
  }

  return (
    <div>
      <ChartCard title="使用者漏斗：登入 → 發起轉帳 → 轉帳成功" height={320}>
        {funnelData.length > 0 && (
          <Bar data={chartData} options={{
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y' as const,
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true } },
          }} />
        )}
      </ChartCard>

      {funnelData.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          {funnelData.map((step, i) => (
            <Card key={step.step}>
              <CardContent className="pt-5">
                <p className="text-sm text-muted-foreground">{stepLabels[step.step] || step.step}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{step.users.toLocaleString()}</p>
                {i > 0 && (
                  <div className="mt-2 text-sm flex gap-3">
                    <span className="text-chart-2">轉換率 {step.conversion_rate}%</span>
                    <span className="text-destructive">流失率 {step.drop_off_rate}%</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
