'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler,
  type ChartData, type ChartOptions,
} from 'chart.js'
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2'
import { Bot, Send } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

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
  id: string
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

export default function AiQuerySection() {
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
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content: query }])
    setLoading(true)
    try {
      const data = await api.aiQuery(query) as AiQueryResponse
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.answer,
        sql: data.sql,
        showSql: false,
        chartConfig: data.chartConfig,
      }])
    } catch (err: unknown) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: err instanceof Error ? err.message : '查詢失敗，請稍後再試。',
      }])
    } finally {
      setLoading(false)
    }
  }

  function toggleSql(id: string) {
    setMessages(prev => prev.map(m =>
      m.id === id ? { ...m, showSql: !m.showSql } : m
    ))
  }

  return (
    <section id="ai-query" className="scroll-mt-28 py-8 border-t border-border">
      <h2 className="text-base font-semibold text-foreground mb-4">AI 查詢</h2>
      <div className="w-full flex flex-col gap-4">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              AI 數據查詢助手
            </CardTitle>
            <CardDescription>輸入自然語言後，系統會回傳指標摘要、SQL 與圖表建議</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              ref={chatRef}
              className="space-y-4 min-h-64 max-h-[50vh] overflow-y-auto pr-1"
            >
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-accent p-4 mb-4">
                    <Bot className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">你可以直接問業務問題</h3>
                  <p className="text-sm text-muted-foreground">點擊下方提示，或在輸入框輸入問題</p>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3 max-w-lg shadow-sm'
                    : 'bg-muted border border-border rounded-2xl rounded-bl-md px-4 py-3 max-w-2xl'}>
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>

                    {msg.sql && (
                      <div className="mt-3">
                        <button
                          onClick={() => toggleSql(msg.id)}
                          className="text-xs text-primary hover:underline"
                        >
                          {msg.showSql ? '隱藏 SQL' : '顯示 SQL'}
                        </button>
                        {msg.showSql && (
                          <pre className="mt-2 bg-background text-foreground text-xs p-3 rounded-lg overflow-x-auto border border-border font-mono">
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
                  <div className="bg-muted border border-border rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      {[0, 150, 300].map(delay => (
                        <span
                          key={delay}
                          className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                          style={{ animationDelay: `${delay}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 快速提示 */}
        <div className="flex flex-wrap gap-2">
          {sampleQueries.map(q => (
            <Button
              key={q}
              variant="outline"
              size="sm"
              onClick={() => sendMessage(q)}
              disabled={loading}
              className="text-xs h-8"
            >
              {q}
            </Button>
          ))}
        </div>

        {/* 輸入欄 */}
        <div className="flex gap-3">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && sendMessage()}
            type="text"
            placeholder="輸入查詢，例如：這個月 VIP 客戶的轉帳成功率多少？"
            disabled={loading}
            className="flex-1 h-11"
          />
          <Button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="h-11 px-5"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">送出</span>
          </Button>
        </div>
      </div>
    </section>
  )
}
