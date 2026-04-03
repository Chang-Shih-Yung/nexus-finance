'use client'

import { useEffect, useState } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import StatCard from '@/components/StatCard'
import ChartCard from '@/components/ChartCard'
import { api } from '@/lib/api'
import { useChartColors } from '@/hooks/useChartColors'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

interface Overview {
  today_logins: number
  today_transactions: number
  today_success_rate: number
  today_active_users: number
}

interface TrendRow {
  date: string
  logins: number
  success_rate: number
}

export default function DashboardPage() {
  const colors = useChartColors()
  const [overview, setOverview] = useState<Overview>({
    today_logins: 0, today_transactions: 0,
    today_success_rate: 0, today_active_users: 0,
  })
  const [trendData, setTrendData] = useState<TrendRow[]>([])

  useEffect(() => {
    const load = () => {
      Promise.allSettled([
        api.getOverview() as Promise<Overview>,
        api.getTrend(7) as Promise<TrendRow[]>,
      ]).then(([ov, trend]) => {
        if (ov.status === 'fulfilled') setOverview(ov.value)
        if (trend.status === 'fulfilled') setTrendData(trend.value)
      })
    }
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [])

  const labels = trendData.map(d => {
    const dt = new Date(d.date)
    return `${dt.getMonth() + 1}/${dt.getDate()}`
  })

  const loginChartData = {
    labels,
    datasets: [{
      label: '登入人數',
      data: trendData.map(d => Number(d.logins)),
      borderColor: colors.chart1,
      backgroundColor: `${colors.chart1}1a`,
      fill: true,
      tension: 0.3,
    }],
  }

  const successRateChartData = {
    labels,
    datasets: [{
      label: '成功率 %',
      data: trendData.map(d => Number(d.success_rate)),
      borderColor: colors.chart2,
      backgroundColor: `${colors.chart2}1a`,
      fill: true,
      tension: 0.3,
    }],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="今日登入人數" value={overview.today_logins} format="number" />
        <StatCard title="今日交易筆數" value={overview.today_transactions} format="number" />
        <StatCard title="今日成功率" value={overview.today_success_rate} format="percent"
          warn={overview.today_success_rate < 80} />
        <StatCard title="今日活躍用戶" value={overview.today_active_users} format="number" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="每日登入人數 (最近 7 天)" height={280}>
          {trendData.length > 0 && <Line data={loginChartData} options={chartOptions} />}
        </ChartCard>
        <ChartCard title="交易成功率趨勢 (最近 7 天)" height={280}>
          {trendData.length > 0 && (
            <Line data={successRateChartData}
              options={{ ...chartOptions, scales: { y: { min: 0, max: 100 } } }} />
          )}
        </ChartCard>
      </div>
    </div>
  )
}
