'use client'

import { useEffect, useState } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import ChartCard from '@/components/ChartCard'
import { api } from '@/lib/api'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface ErrorRow { error_code: string; count: number }
interface TxRow {
  id: number; created_at: string; user_name: string; tier: string
  amount: number; channel: string; error_code: string; error_message: string
}

const tierClass: Record<string, string> = {
  premium: 'bg-purple-100 text-purple-700',
  vip: 'bg-amber-100 text-amber-700',
  general: 'bg-gray-100 text-gray-600',
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function ErrorsPage() {
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
      backgroundColor: '#ef4444',
      borderRadius: 6,
    }],
  }

  return (
    <div>
      <ChartCard title="錯誤代碼分佈" height={300}>
        {errorData.length > 0 && (
          <Bar data={chartData} options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
          }} />
        )}
      </ChartCard>

      <div className="bg-white rounded-xl border border-gray-200 mt-6 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-600">最近失敗交易明細</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">時間</th>
                <th className="px-4 py-3 font-medium">客戶</th>
                <th className="px-4 py-3 font-medium">等級</th>
                <th className="px-4 py-3 font-medium">金額</th>
                <th className="px-4 py-3 font-medium">管道</th>
                <th className="px-4 py-3 font-medium">錯誤代碼</th>
                <th className="px-4 py-3 font-medium">錯誤訊息</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {failedTx.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{formatTime(tx.created_at)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{tx.user_name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tierClass[tx.tier] ?? tierClass.general}`}>
                      {tx.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{Number(tx.amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-500">{tx.channel}</td>
                  <td className="px-4 py-3">
                    <span className="text-red-600 font-mono text-xs">{tx.error_code}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{tx.error_message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
