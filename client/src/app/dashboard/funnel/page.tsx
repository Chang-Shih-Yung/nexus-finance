'use client'

import { useEffect, useState } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import ChartCard from '@/components/ChartCard'
import { api } from '@/lib/api'

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
  const [funnelData, setFunnelData] = useState<FunnelRow[]>([])

  useEffect(() => {
    api.getFunnel().then(d => setFunnelData(d as FunnelRow[])).catch(console.error)
  }, [])

  const chartData = {
    labels: funnelData.map(d => stepLabels[d.step] || d.step),
    datasets: [{
      label: '不重複使用者數',
      data: funnelData.map(d => d.users),
      backgroundColor: ['#10b981', '#f59e0b', '#3b82f6'],
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
            <div key={step.step} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">{stepLabels[step.step] || step.step}</p>
              <p className="text-2xl font-bold text-gray-900">{step.users.toLocaleString()}</p>
              {i > 0 && (
                <div className="mt-2 text-sm">
                  <span className="text-emerald-600">轉換率 {step.conversion_rate}%</span>
                  <span className="mx-2 text-gray-300">|</span>
                  <span className="text-red-500">流失率 {step.drop_off_rate}%</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
