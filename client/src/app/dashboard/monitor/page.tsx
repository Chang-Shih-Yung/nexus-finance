'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import StatCard from '@/components/StatCard'
import ChartCard from '@/components/ChartCard'
import { api } from '@/lib/api'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

interface HealthRow {
  minute: string
  avg_latency: number
  error_count: number
  error_rate: number
  total_requests: number
}

export default function MonitorPage() {
  const [healthData, setHealthData] = useState<HealthRow[]>([])

  const loadData = useCallback(async () => {
    const data = await api.getApiHealth(60) as HealthRow[]
    setHealthData(data)
  }, [])

  useEffect(() => {
    loadData()
    const t = setInterval(loadData, 15000)
    return () => clearInterval(t)
  }, [loadData])

  const avgLatency = healthData.length
    ? Math.round(healthData.reduce((a, d) => a + Number(d.avg_latency), 0) / healthData.length)
    : 0

  const errorRate = (() => {
    if (!healthData.length) return 0
    const totalErr = healthData.reduce((a, d) => a + Number(d.error_count), 0)
    const totalReq = healthData.reduce((a, d) => a + Number(d.total_requests), 0)
    return totalReq ? +(totalErr / totalReq * 100).toFixed(2) : 0
  })()

  const totalRequests = healthData.reduce((a, d) => a + Number(d.total_requests), 0)
  const hasAlert = avgLatency > 500 || errorRate > 5

  const alertMessage = [
    avgLatency > 500 && `平均延遲 ${avgLatency}ms 超過 500ms 閾值`,
    errorRate > 5 && `錯誤率 ${errorRate}% 超過 5% 閾值`,
  ].filter(Boolean).join('；')

  const labels = healthData.map(d => {
    const dt = new Date(d.minute)
    return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`
  })

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  }

  return (
    <div>
      {hasAlert && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <span className="text-2xl">🚨</span>
          <div>
            <p className="text-red-800 font-semibold text-sm">異常警示</p>
            <p className="text-red-600 text-sm">{alertMessage}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="平均延遲 (ms)" value={avgLatency} format="number" warn={avgLatency > 500} />
        <StatCard title="Error Rate" value={errorRate} format="percent" warn={errorRate > 5} />
        <StatCard title="總請求數 (過去 1hr)" value={totalRequests} format="number" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="API 平均延遲 (每分鐘)" height={280}>
          {healthData.length > 0 && (
            <Line data={{
              labels,
              datasets: [{
                label: '延遲 (ms)',
                data: healthData.map(d => Number(d.avg_latency)),
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245,158,11,0.1)',
                fill: true,
                tension: 0.3,
              }],
            }} options={baseOptions} />
          )}
        </ChartCard>
        <ChartCard title="Error Rate % (每分鐘)" height={280}>
          {healthData.length > 0 && (
            <Line data={{
              labels,
              datasets: [{
                label: 'Error Rate %',
                data: healthData.map(d => Number(d.error_rate)),
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239,68,68,0.1)',
                fill: true,
                tension: 0.3,
              }],
            }} options={{ ...baseOptions, scales: { y: { min: 0 } } }} />
          )}
        </ChartCard>
      </div>
    </div>
  )
}
