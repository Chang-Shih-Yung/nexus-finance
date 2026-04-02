/**
 * ai-query Edge Function
 * 從 server/services/groqAgent.js 移植至 Deno TypeScript
 */
import Groq from 'npm:groq-sdk'
import { handleCors, jsonResponse } from '../_shared/cors.ts'
import { requireAuth } from '../_shared/auth.ts'
import { getDb } from '../_shared/db.ts'
import { sanitize } from '../_shared/sqlSanitizer.ts'

// ── Schema description ───────────────────────────────────────────
const SCHEMA_DESCRIPTION = `
資料庫：nexus_finance（PostgreSQL 14）
用途：銀行數據監控平台

=== 表結構 ===

1. users（銀行客戶）
   - id SERIAL PK
   - name VARCHAR(100)
   - email VARCHAR(255) UNIQUE
   - phone VARCHAR(30)
   - tier user_tier ENUM('general','vip','premium')
   - rm_name VARCHAR(100)
   - branch VARCHAR(100)
   - created_at TIMESTAMPTZ
   - last_login_at TIMESTAMPTZ
   - status VARCHAR(20) DEFAULT 'active'

2. events（使用者行為事件）
   - id SERIAL PK
   - user_id INT FK→users(id)
   - event_type event_type ENUM('login','logout','transfer_init','transfer_success','transfer_failed','click','view_account','view_statement')
   - metadata JSONB
   - created_at TIMESTAMPTZ

3. transactions（交易紀錄）
   - id SERIAL PK
   - user_id INT FK→users(id)
   - amount NUMERIC(15,2)
   - currency VARCHAR(3) DEFAULT 'TWD'
   - from_account VARCHAR(20)
   - to_account VARCHAR(20)
   - status tx_status ENUM('pending','success','failed')
   - error_code VARCHAR(50)
   - error_message VARCHAR(255)
   - channel VARCHAR(20) DEFAULT 'web'
   - created_at TIMESTAMPTZ

4. api_logs（API 監控日誌）
   - id SERIAL PK
   - method VARCHAR(10)
   - path VARCHAR(255)
   - status_code INT
   - response_time_ms INT
   - created_at TIMESTAMPTZ

=== 常用索引 ===
- events: (user_id, event_type, created_at), (created_at), (event_type)
- transactions: (user_id, status, created_at), (created_at), (status), (error_code)
- users: (tier), (rm_name), (branch)

=== 注意事項 ===
- 時間欄位皆為 TIMESTAMPTZ，查詢時用 CURRENT_DATE, NOW() 或日期字串
- 金額欄位 amount 為 TWD，NUMERIC(15,2)
- 漏斗分析：login → transfer_init → transfer_success
`

const SYSTEM_PROMPT = `你是「Nexus Finance」銀行數據監控平台的 AI 查詢助手。
你的使用者是銀行理財專員（理專），他們會用中文自然語言詢問數據問題。

你的工作流程：
1. 理解使用者的自然語言問題
2. 根據問題產生正確的 PostgreSQL SELECT 查詢
3. 用 run_sql_query 工具執行查詢
4. 分析查詢結果，用 suggest_chart_config 產生適合的 Chart.js 圖表設定
5. 用繁體中文回答，包含數據摘要和見解

回答規則：
- 一定要用繁體中文回答
- 先簡述查詢結果的重點數據
- 如果資料適合用圖表呈現，一定要呼叫 suggest_chart_config
- 如果查詢出錯，解釋可能的原因並嘗試修正
- 金額顯示加上千分位和「元」
- 百分比保留一位小數
`

const TOOLS: Groq.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_schema',
      description: '取得 nexus_finance 資料庫的完整表結構、欄位、型別、索引資訊',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_sql_query',
      description: '在 nexus_finance 資料庫執行 SELECT 查詢（只允許 SELECT，有安全防護和 LIMIT 1000 上限）',
      parameters: {
        type: 'object',
        properties: {
          sql: { type: 'string', description: '要執行的 PostgreSQL SELECT 查詢語句' },
        },
        required: ['sql'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'suggest_chart_config',
      description: '根據查詢結果產生 Chart.js 圖表設定（前端 vue-chartjs 可直接使用）',
      parameters: {
        type: 'object',
        properties: {
          chartType: { type: 'string', enum: ['line', 'bar', 'pie', 'doughnut'] },
          labels: { type: 'array', items: { type: 'string' } },
          datasets: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                data: { type: 'array', items: { type: 'number' } },
              },
              required: ['label', 'data'],
            },
          },
          title: { type: 'string' },
        },
        required: ['chartType', 'labels', 'datasets'],
      },
    },
  },
]

const CHART_COLORS = [
  'rgba(16,185,129,0.7)', 'rgba(59,130,246,0.7)', 'rgba(249,115,22,0.7)',
  'rgba(139,92,246,0.7)', 'rgba(236,72,153,0.7)', 'rgba(234,179,8,0.7)',
]

async function handleRunSqlQuery(sql: string) {
  const check = sanitize(sql)
  if (!check.ok) return { error: check.error, executed: false }
  try {
    const db = getDb()
    const rows = await db.unsafe(check.sql)
    return {
      executed: true,
      sql: check.sql,
      rowCount: rows.length,
      columns: rows.length > 0 ? Object.keys(rows[0]) : [],
      rows,
    }
  } catch (err: any) {
    return { error: `查詢錯誤: ${err.message}`, executed: false, sql: check.sql }
  }
}

function buildChartConfig({ chartType, labels, datasets, title }: any) {
  return {
    type: chartType,
    data: {
      labels,
      datasets: datasets.map((ds: any, i: number) => ({
        label: ds.label,
        data: ds.data,
        backgroundColor: chartType === 'line' ? 'transparent' : CHART_COLORS[i % CHART_COLORS.length],
        borderColor: CHART_COLORS[i % CHART_COLORS.length],
        borderWidth: chartType === 'line' ? 2 : 1,
        fill: chartType === 'line',
        tension: 0.3,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: title ? { display: true, text: title } : undefined,
        legend: { display: datasets.length > 1 },
      },
    },
  }
}

// ── In-memory rate limiter（per Edge Function instance）─────────
const rateLimitMap = new Map<string, { windowStart: number; count: number }>()
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60_000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 })
    return true
  }
  entry.count++
  return entry.count <= RATE_LIMIT
}

// ── Main handler ─────────────────────────────────────────────────
Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    await requireAuth(req)
  } catch (e: any) {
    return jsonResponse({ error: e.message }, e.status ?? 401, req)
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method Not Allowed' }, 405, req)
  }

  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return jsonResponse({ error: '查詢頻率超過限制，請稍後再試（每分鐘最多 10 次）' }, 429, req)
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, req)
  }

  const userQuery: string = body.query ?? ''
  if (!userQuery || typeof userQuery !== 'string' || !userQuery.trim()) {
    return jsonResponse({ error: '請提供查詢問題' }, 400, req)
  }
  if (userQuery.length > 500) {
    return jsonResponse({ error: '查詢問題過長（最多 500 字元）' }, 400, req)
  }

  try {
    const groq = new Groq({ apiKey: Deno.env.get('GROQ_API_KEY')! })
    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userQuery.trim() },
    ]

    let capturedSql: string | null = null
    let capturedChart: object | null = null
    const MAX_ITERATIONS = 6

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages,
        tools: TOOLS,
        tool_choice: 'auto',
        temperature: 0,
        max_tokens: 4096,
      })

      const choice = response.choices?.[0]
      if (!choice) throw new Error('Groq 未回傳結果')

      const { message } = choice
      messages.push(message as Groq.Chat.ChatCompletionMessageParam)

      if (!message.tool_calls || message.tool_calls.length === 0) {
        return jsonResponse({
          answer: message.content || '抱歉，無法取得回應。',
          sql: capturedSql,
          chartConfig: capturedChart,
        }, 200, req)
      }

      for (const toolCall of message.tool_calls) {
        const { id, function: fn } = toolCall
        const args = JSON.parse(fn.arguments || '{}')
        let result: unknown

        switch (fn.name) {
          case 'get_schema':
            result = { schema: SCHEMA_DESCRIPTION }
            break
          case 'run_sql_query': {
            const r = await handleRunSqlQuery(args.sql || '')
            if ((r as any).executed) capturedSql = (r as any).sql
            result = r
            break
          }
          case 'suggest_chart_config':
            result = buildChartConfig(args)
            capturedChart = result as object
            break
          default:
            result = { error: `未知工具: ${fn.name}` }
        }

        messages.push({
          role: 'tool',
          tool_call_id: id,
          content: JSON.stringify(result),
        })
      }
    }

    return jsonResponse({ error: 'AI 查詢超過最大迭代次數，請簡化您的問題' }, 504, req)
  } catch (e: any) {
    console.error('[ai-query]', e.message)
    if (e.message?.includes('timeout')) {
      return jsonResponse({ error: '查詢超時，請簡化您的問題後重試' }, 504, req)
    }
    return jsonResponse({ error: 'Internal server error' }, 500, req)
  }
})
