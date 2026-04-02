'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler,
  type ChartData, type ChartOptions,
} from 'chart.js'
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2'
import { api } from '@/lib/api'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler,
)

interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut'
  data: ChartData
  options?: ChartOptions
}

interface AiQueryResponse {
  answer: string
  sql?: string
  chartConfig?: ChartConfig
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  sql?: string
  showSql?: boolean
  chartConfig?: ChartConfig
}

const sampleQueries = [
  '這個月 VIP 客戶的轉帳成功率多少？',
  '昨天哪些客戶轉帳失敗了？',
  '過去一週每天登入人數趨勢',
  '上個月轉帳金額最高的前 10 位客戶',
  '最近 30 天哪個錯誤代碼最常出現？',
  '哪些客戶超過 7 天沒有登入了？',
]

function ChartRenderer({ config }: Readonly<{ config: ChartConfig }>) {
  switch (config.type) {
    case 'line': return <Line data={config.data as ChartData<'line'>} options={config.options as ChartOptions<'line'>} />
    case 'bar': return <Bar data={config.data as ChartData<'bar'>} options={config.options as ChartOptions<'bar'>} />
    case 'pie': return <Pie data={config.data as ChartData<'pie'>} options={config.options as ChartOptions<'pie'>} />
    case 'doughnut': return <Doughnut data={config.data as ChartData<'doughnut'>} options={config.options as ChartOptions<'doughnut'>} />
    default: return <Bar data={config.data as ChartData<'bar'>} options={config.options as ChartOptions<'bar'>} />
  }
}

export default function AiQueryPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(text?: string) {
    const query = text ?? input.trim()
    if (!query) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: query }])
    setLoading(true)
    try {
      const data = await api.aiQuery(query) as AiQueryResponse
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        sql: data.sql,
        showSql: false,
        chartConfig: data.chartConfig,
      }])
    } catch (err: unknown) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: err instanceof Error ? err.message : '查詢失敗，請稍後再試。',
      }])
    } finally {
      setLoading(false)
    }
  }

  function toggleSql(i: number) {
    setMessages(prev => prev.map((m, idx) =>
      idx === i ? { ...m, showSql: !m.showSql } : m
    ))
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="space-y-4 mb-6 min-h-100" ref={chatRef}>
        {messages.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🤖</p>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">AI 數據查詢助手</h3>
            <p className="text-gray-500 mb-6">用自然語言查詢銀行數據，自動產生 SQL 與圖表</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {sampleQueries.map(q => (
                <button key={q} onClick={() => sendMessage(q)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-emerald-50 hover:border-emerald-300 transition">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={msg.role === 'user'
              ? 'bg-emerald-600 text-white rounded-2xl rounded-br-md px-4 py-3 max-w-lg'
              : 'bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 max-w-2xl'}>
              <p className="whitespace-pre-wrap text-sm">{msg.content}</p>

              {msg.sql && (
                <div className="mt-3">
                  <button onClick={() => toggleSql(i)}
                    className="text-xs text-blue-500 hover:underline">
                    {msg.showSql ? '隱藏 SQL' : '顯示 SQL'}
                  </button>
                  {msg.showSql && (
                    <pre className="mt-2 bg-gray-900 text-green-400 text-xs p-3 rounded-lg overflow-x-auto">
                      {msg.sql}
                    </pre>
                  )}
                </div>
              )}

              {msg.chartConfig && (
                <div className="mt-3 h-64">
                  <ChartRenderer config={msg.chartConfig} />
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                {[0, 150, 300].map(delay => (
                  <span key={delay} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${delay}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 bg-gray-50 pt-4">
        <div className="flex gap-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && sendMessage()}
            type="text"
            placeholder="輸入查詢，例如：這個月 VIP 客戶的轉帳成功率多少？"
            disabled={loading}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <button onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
            送出
          </button>
        </div>
      </div>
    </div>
  )
}
