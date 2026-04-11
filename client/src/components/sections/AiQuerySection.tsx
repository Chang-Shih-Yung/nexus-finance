'use client'

import { useState, useRef, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
} from 'recharts'
import {
  Bot, Send, ChevronDown, ChevronUp,
  TrendingUp, Target, CheckCircle2, AlertTriangle,
} from '@/lib/icons'
import {
  runAiQuery, runAiDeepAnalysis,
  type AiQueryResponse, type AiDataRow, type AiFollowUp,
  type AiRenderHint, type AiDeepAnalysis,
} from '@/lib/ai-queries'
import { fieldLabel, formatValue, rowColumns } from '@/lib/ai-format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import {
  Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription,
} from '@/components/ui/empty'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
  type ChartConfig as ShadcnChartConfig,
} from '@/components/ui/chart'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'

interface RawChartData {
  labels?: string[]
  datasets?: Array<{
    label?: string
    data?: number[]
    backgroundColor?: string | string[]
    borderColor?: string
  }>
}

interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut'
  /** Original x-axis field key, used to format date/category labels. */
  xKey: string
  /** Original y-axis field key, used to format tooltip values. */
  yKey: string
  data: RawChartData
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  /** Original question (kept on assistant msgs so deep analysis can re-ask). */
  question?: string
  /** Optional Call 2 extended observation (延伸觀察). Rendered below content. */
  insight?: string
  /** Call 1 + Call 2 quality flag — true when any fallback path fired. */
  degraded?: boolean
  /** Short reason code from backend (enum-like). */
  degradeReason?: string
  /** RPC name the backend dispatched to — required for deep analysis call. */
  rpcCalled?: string
  data?: AiDataRow[]
  render?: AiRenderHint
  chartConfig?: ChartConfig
  followUps?: AiFollowUp[]
  /** Lazily populated on "深度解讀" click. */
  deep?: AiDeepAnalysis
  deepLoading?: boolean
  deepOpen?: boolean
}

/**
 * Human-readable zh-TW explanation of each `degrade_reason` enum value.
 * Backend reasons are short enum-like strings so they can double as i18n
 * keys; we centralise the zh-TW mapping here. Unknown reasons fall back
 * to a generic message so we never show a raw enum to execs.
 */
const DEGRADE_REASON_ZH: Record<string, string> = {
  call1_http_failed:        'AI 服務連線失敗，改用備用文字回答。',
  call1_not_json:           'AI 回應格式不符，改用備用文字回答。',
  call2_http_failed:        '分析模型連線逾時，改以模板回覆。',
  call2_not_json:           '分析模型回傳格式錯誤，改以模板回覆。',
  call2_empty:              '分析模型沒有產生任何內容，改以模板回覆。',
  call2_schema_decode_failed: '分析模型回傳的 JSON 格式不正確，改以模板回覆。',
  call2_parse_failed:       '分析模型未依指定格式輸出，改以模板回覆。',
  chart_derivation_failed:  '原本預期顯示圖表，但欄位不符，改用表格呈現。',
  rpc_not_in_catalog:       '模型選到的函式不在目錄中。',
  rpc_exec_failed:          'RPC 執行失敗。',
  missing_api_key:          '尚未設定 AI 金鑰。',
  empty_catalog:            'AI 工具目錄為空。',
  rpc_invoke_failed:        '無法連線到資料庫，請稍後再試。',
  // Deep analysis reasons
  http_failed:              '深度分析模型連線失敗。',
  invalid_json:             '深度分析模型回傳格式錯誤。',
  empty_response:           '深度分析模型沒有產生任何內容。',
  parse_failed:              '深度分析未依格式輸出，下方為未整理的原始內容。',
  sections_incomplete:      '深度分析的部分段落缺漏。',
  empty_data:               '沒有資料可做深度分析。',
  degeneration_detected:    '分析模型輸出不穩定（token 重複循環），請點「重試」。',
  schema_decode_failed:     '分析模型回傳的 JSON 格式不正確，請點「重試」。',
}

function describeDegradeReason(code?: string): string {
  if (!code) return '此次輸出的品質可能不如預期，請留意內容正確性。'
  return DEGRADE_REASON_ZH[code]
    ?? `此次輸出使用了備用路徑（${code}），內容可能不如預期。`
}

/** Dynamic match for call2_status_<code> / http_status_<code> etc. */
function describeDegradeReasonSmart(code?: string): string {
  if (!code) return describeDegradeReason(code)
  if (code.startsWith('call2_status_')) {
    return `分析模型回應異常（HTTP ${code.replace('call2_status_', '')}），改以模板回覆。`
  }
  if (code.startsWith('http_status_')) {
    return `深度分析模型回應異常（HTTP ${code.replace('http_status_', '')}）。`
  }
  return describeDegradeReason(code)
}

/**
 * Small warning badge shown in the assistant bubble header when the
 * backend signalled a degraded output. Uses shadcn Tooltip so hovering
 * reveals the specific reason while keeping the bubble compact.
 */
function DegradedBadge({ reason }: Readonly<{ reason?: string }>) {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex items-center gap-1 rounded-full border border-amber-300/60 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300 cursor-help"
            aria-label="模型輸出品質降低"
          >
            <AlertTriangle className="size-3" />
            模型輸出品質降低
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {describeDegradeReasonSmart(reason)}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

const sampleQueries = [
  '最近 30 天的營收總覽',
  '各產品線營收佔比',
  '目前放款組合與 NPL 比率',
  '本季分行營收排名',
  '過去 7 天詐欺警報統計',
  '數位銀行普及率怎樣？',
]

function toRechartsData(raw: RawChartData) {
  const labels = raw.labels ?? []
  const datasets = raw.datasets ?? []
  return labels.map((label, i) => {
    const row: Record<string, string | number> = { label }
    for (const ds of datasets) {
      const key = ds.label ?? 'value'
      row[key] = ds.data?.[i] ?? 0
    }
    return row
  })
}

/**
 * Chart rendered via shadcn's ChartContainer wrapper. This gives us:
 *   - CSS-variable driven theming (chart-1..5 design tokens)
 *   - A consistent tooltip surface (ChartTooltipContent) that matches Card
 *   - Automatic recharts class overrides for axis tick colors, grid, etc.
 * The wrapper handles ResponsiveContainer internally, so we just pass the
 * chart element as a child and control the outer box via className.
 */
function ChartRenderer({
  config,
  className,
}: Readonly<{ config: ChartConfig; className?: string }>) {
  const data = toRechartsData(config.data)
  const datasets = config.data.datasets ?? []
  const firstKey = datasets[0]?.label ?? 'value'
  const yLabel = fieldLabel(config.yKey)

  // Shared tick formatter for the x-axis — uses ai-format so dates/strings
  // render identically across chart types.
  const tickFormatter = (value: unknown): string =>
    formatValue(config.xKey, value)

  // Build a shadcn ChartConfig so the tooltip label matches the column name
  // and the series picks up the chart-1 CSS variable automatically.
  const shadcnConfig = {
    [firstKey]: { label: yLabel, color: 'var(--color-chart-1)' },
  } satisfies ShadcnChartConfig

  // Common outer sizing. aspect-auto cancels ChartContainer's default
  // aspect-video so the parent's explicit height (h-64 / h-72) wins.
  const outerClass = `aspect-auto w-full h-full ${className ?? ''}`

  if (config.type === 'pie' || config.type === 'doughnut') {
    const pieData = (config.data.labels ?? []).map((name, i) => ({
      name,
      value: datasets[0]?.data?.[i] ?? 0,
    }))
    return (
      <ChartContainer config={shadcnConfig} className={outerClass}>
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(value, name) => [
                  `${String(name)} · `,
                  formatValue(config.yKey, value),
                ]}
              />
            }
          />
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%" cy="50%"
            innerRadius={config.type === 'doughnut' ? '55%' : 0}
            outerRadius="75%"
            strokeWidth={0}
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={`var(--color-chart-${(i % 5) + 1})`} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
    )
  }

  if (config.type === 'bar') {
    return (
      <ChartContainer config={shadcnConfig} className={outerClass}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            tickFormatter={tickFormatter}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                labelFormatter={(label) => formatValue(config.xKey, label)}
                formatter={(value) => formatValue(config.yKey, value)}
              />
            }
          />
          {datasets.map((ds, i) => {
            const key = ds.label ?? 'value'
            return (
              <Bar
                key={i}
                dataKey={key}
                name={yLabel}
                fill="var(--color-chart-1)"
                radius={[4, 4, 0, 0]}
              />
            )
          })}
        </BarChart>
      </ChartContainer>
    )
  }

  // line (default) — Area under curve for a softer trend look.
  return (
    <ChartContainer config={shadcnConfig} className={outerClass}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
        <defs>
          <linearGradient id="fillAi" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11 }}
          tickFormatter={tickFormatter}
          axisLine={false}
          tickLine={false}
        />
        <YAxis hide />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(label) => formatValue(config.xKey, label)}
              formatter={(value) => formatValue(config.yKey, value)}
            />
          }
        />
        <Area
          dataKey={firstKey}
          name={yLabel}
          stroke="var(--color-chart-1)"
          fill="url(#fillAi)"
          strokeWidth={2}
          dot={false}
        />
      </AreaChart>
    </ChartContainer>
  )
}

/**
 * Single-row KPI grid. Renders each column as a shadcn Card (size="sm")
 * so label + value pick up the same design tokens as the rest of the
 * dashboard. Used for *_summary style RPCs.
 */
function KpiGrid({ row }: Readonly<{ row: AiDataRow }>) {
  const cols = Object.keys(row)
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
      {cols.map((key) => (
        <Card key={key} size="sm" className="px-3 py-2 gap-1">
          <div className="text-[11px] text-muted-foreground">
            {fieldLabel(key)}
          </div>
          <div className="text-sm font-semibold text-foreground tabular-nums">
            {formatValue(key, row[key])}
          </div>
        </Card>
      ))}
    </div>
  )
}

/**
 * Multi-row data table using shadcn Table primitives so header / row /
 * cell styling stays consistent with the rest of the dashboard. Used
 * when the chosen RPC returns a list (render = 'table' or 'both').
 */
function DataTable({ rows }: Readonly<{ rows: AiDataRow[] }>) {
  const cols = rowColumns(rows)
  if (cols.length === 0) return null

  return (
    <div className="mt-3 rounded-lg border border-border bg-background overflow-hidden">
      <div className="max-h-80 overflow-y-auto">
        <Table className="text-xs">
          <TableHeader className="bg-muted/50 sticky top-0 z-10">
            <TableRow>
              {cols.map((c) => (
                <TableHead
                  key={c}
                  className="font-medium text-muted-foreground whitespace-nowrap h-9"
                >
                  {fieldLabel(c)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i}>
                {cols.map((c) => (
                  <TableCell
                    key={c}
                    className="whitespace-nowrap tabular-nums py-2"
                  >
                    {formatValue(c, row[c])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="px-3 py-1.5 text-[11px] text-muted-foreground bg-muted/30 border-t border-border">
        共 {rows.length} 筆
      </div>
    </div>
  )
}

/**
 * Conversational drill-down buttons. Shown below the answer body for
 * assistant messages that have at least one follow_up suggestion.
 * Each click re-asks the system with the canned question.
 */
function FollowUpChips({
  followUps,
  onPick,
  disabled,
}: Readonly<{
  followUps: AiFollowUp[]
  onPick: (question: string) => void
  disabled: boolean
}>) {
  if (!followUps || followUps.length === 0) return null
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {followUps.map((f) => (
        <Button
          key={f.question}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPick(f.question)}
          disabled={disabled}
          className="h-7 rounded-full text-xs px-3"
        >
          {f.label}
        </Button>
      ))}
    </div>
  )
}

/**
 * Parses a section body into either a paragraph or a bullet list.
 * Gemma emits lines starting with "- " or "• " — we preserve those as
 * list items. Mixed content (paragraph + bullets) degrades to paragraph.
 */
function parseSectionBody(body: string): { kind: 'paragraph' | 'list'; items: string[] } {
  const lines = body
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  const bulletLines = lines.filter((l) => /^[-•·]\s+/.test(l))
  if (bulletLines.length >= 2 && bulletLines.length === lines.length) {
    return {
      kind: 'list',
      items: bulletLines.map((l) => l.replace(/^[-•·]\s+/, '').trim()),
    }
  }
  return { kind: 'paragraph', items: [body.trim()] }
}

/**
 * Single titled section in the deep-analysis Card. Header shows an icon +
 * localized label; body is a paragraph or a shadcn-styled bullet list.
 */
function DeepSection({
  icon: Icon,
  title,
  body,
  tone,
}: Readonly<{
  icon: React.ComponentType<{ className?: string }>
  title: string
  body: string
  tone: 'default' | 'warning'
}>) {
  const parsed = parseSectionBody(body)
  const iconClass = tone === 'warning' ? 'text-amber-500' : 'text-primary'
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
        <Icon className={`size-3.5 ${iconClass}`} />
        <span>{title}</span>
      </div>
      {parsed.kind === 'paragraph' ? (
        <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {parsed.items[0]}
        </p>
      ) : (
        <ul className="space-y-1 text-xs text-muted-foreground leading-relaxed">
          {parsed.items.map((item, i) => (
            <li key={i} className="flex gap-1.5">
              <span className="text-muted-foreground/60 shrink-0">•</span>
              <span className="flex-1">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Expandable "深度解讀" panel shown below the primary answer for
 * non-text render hints. On first open we fire nf_ai_ask_deep with the
 * exact rows the user already saw (no RPC re-fetch → analysis anchors
 * to the on-screen snapshot, per product decision).
 */
function DeepAnalysisPanel({
  msg,
  onToggle,
  onFetch,
}: Readonly<{
  msg: Message
  onToggle: () => void
  onFetch: () => void
}>) {
  // Only offer deep analysis when there's structured data to reason over
  // AND the backend successfully dispatched to a whitelisted RPC.
  if (!msg.rpcCalled || !msg.data || msg.data.length === 0) return null
  if (msg.render === 'text') return null

  const isOpen = msg.deepOpen === true
  const hasResult = msg.deep !== undefined

  function handleClick() {
    if (!hasResult && !msg.deepLoading) {
      onFetch()
    }
    onToggle()
  }

  return (
    <div className="mt-3">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleClick}
        disabled={msg.deepLoading}
        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
      >
        {msg.deepLoading ? (
          <>
            <Spinner className="size-3" />
            <span className="ml-1.5">分析中…</span>
          </>
        ) : (
          <>
            <span>重點解讀</span>
            {isOpen
              ? <ChevronUp className="ml-1 size-3" />
              : <ChevronDown className="ml-1 size-3" />}
          </>
        )}
      </Button>

      {isOpen && hasResult && (
        <Card size="sm" className="mt-2 p-3 gap-3 bg-background/50">
          {msg.deep?.degraded && !msg.deep?.error && (
            <DegradedBadge reason={msg.deep.degradeReason} />
          )}
          {msg.deep?.error ? (
            <div className="space-y-2">
              <p className="text-xs text-destructive">{msg.deep.error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onFetch}
                disabled={msg.deepLoading}
                className="h-7 text-xs"
              >
                重試
              </Button>
            </div>
          ) : (
            <>
              {msg.deep?.trend && (
                <DeepSection
                  icon={TrendingUp}
                  title="重點摘要"
                  body={msg.deep.trend}
                  tone="default"
                />
              )}
              {msg.deep?.observations && (
                <DeepSection
                  icon={Target}
                  title="重點觀察"
                  body={msg.deep.observations}
                  tone="default"
                />
              )}
              {msg.deep?.recommendations && (
                <DeepSection
                  icon={CheckCircle2}
                  title="行動建議"
                  body={msg.deep.recommendations}
                  tone="default"
                />
              )}
              {msg.deep?.risks && (
                <DeepSection
                  icon={AlertTriangle}
                  title="潛在風險"
                  body={msg.deep.risks}
                  tone="warning"
                />
              )}
              {!msg.deep?.trend
                && !msg.deep?.observations
                && !msg.deep?.recommendations
                && !msg.deep?.risks && (
                <p className="text-xs text-muted-foreground">
                  模型沒有產出可解析的內容，請稍後再試。
                </p>
              )}
            </>
          )}
        </Card>
      )}
    </div>
  )
}

/**
 * Renders the body of an assistant message according to the server-resolved
 * `render` hint. Four branches:
 *   - text  : no chart / no table. Single-row payload → KPI grid.
 *   - table : DataTable only.
 *   - chart : ChartRenderer only (taller; no table competing for space).
 *   - both  : ChartRenderer on top, DataTable below.
 * Defensive fallbacks mirror the backend's degrade rules so an unknown or
 * impossible combination never shows an empty slot.
 */
function ResultBody({ msg }: Readonly<{ msg: Message }>) {
  const { data, chartConfig, render = 'text' } = msg
  const hasRows = Boolean(data && data.length > 0)
  const hasMultiRows = Boolean(data && data.length > 1)

  // --- text branch: KPI grid for single row, nothing otherwise ---
  if (render === 'text') {
    if (hasRows && data!.length === 1) {
      return <KpiGrid row={data![0]} />
    }
    return null
  }

  // --- table branch: just the table ---
  if (render === 'table') {
    if (!hasMultiRows) return null
    return <DataTable rows={data!} />
  }

  // --- chart branch: full-width chart only ---
  if (render === 'chart' && chartConfig) {
    return (
      <div className="mt-3 h-72 w-full">
        <ChartRenderer config={chartConfig} />
      </div>
    )
  }

  // --- both branch: chart on top + table below ---
  if (render === 'both' && chartConfig) {
    return (
      <>
        <div className="mt-3 h-64 w-full">
          <ChartRenderer config={chartConfig} />
        </div>
        {hasMultiRows && <DataTable rows={data!} />}
      </>
    )
  }

  // --- defensive fallback (chart/both with no chartConfig) ---
  if (hasMultiRows) return <DataTable rows={data!} />
  if (hasRows) return <KpiGrid row={data![0]} />
  return null
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
      const data: AiQueryResponse = await runAiQuery(query)
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.answer,
        question: query,
        insight: data.insight,
        degraded: data.degraded,
        degradeReason: data.degradeReason,
        rpcCalled: data.rpcCalled,
        data: data.data,
        render: data.render,
        chartConfig: data.chartConfig,
        followUps: data.followUps,
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

  /** Toggle the deep-analysis panel open/closed for a single assistant msg. */
  function toggleDeep(id: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, deepOpen: !m.deepOpen } : m)),
    )
  }

  /** Fire nf_ai_ask_deep the first time the user opens the panel. */
  async function fetchDeep(id: string) {
    const target = messages.find((m) => m.id === id)
    if (!target || !target.question || !target.rpcCalled || !target.data) return

    // Clear any previous result/error so a retry shows the spinner cleanly.
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, deep: undefined, deepLoading: true } : m,
      ),
    )

    const result = await runAiDeepAnalysis(
      target.question,
      target.rpcCalled,
      target.data,
    )

    setMessages((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, deep: result, deepLoading: false } : m,
      ),
    )
  }

  return (
    <div className="flex flex-col gap-4 min-h-0 flex-1">
      {/* Messages */}
      <div
        ref={chatRef}
        className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1"
      >
        {messages.length === 0 && (
          <Empty className="h-full border-none">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Bot />
              </EmptyMedia>
              <EmptyTitle>你可以直接問業務問題</EmptyTitle>
              <EmptyDescription>點擊下方提示，或在輸入框輸入問題</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {messages.map((msg) => {
          // Assistant bubbles with a chart/table need to breathe — give them
          // the full column width (capped at 4xl). Pure-text answers stay
          // compact so the conversation still feels like a chat.
          const needsWide =
            msg.role === 'assistant' &&
            msg.render !== undefined &&
            msg.render !== 'text'

          const bubbleClass = msg.role === 'user'
            ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3 max-w-lg shadow-sm'
            : needsWide
              ? 'bg-muted border border-border rounded-2xl rounded-bl-md px-4 py-3 w-full max-w-4xl'
              : 'bg-muted border border-border rounded-2xl rounded-bl-md px-4 py-3 max-w-2xl'

          return (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={bubbleClass}>
                {msg.role === 'assistant' && msg.degraded && (
                  <div className="mb-2">
                    <DegradedBadge reason={msg.degradeReason} />
                  </div>
                )}
                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                {msg.role === 'assistant' && msg.insight && (
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    💡 {msg.insight}
                  </p>
                )}
                {msg.role === 'assistant' && <ResultBody msg={msg} />}
                {msg.role === 'assistant' && (
                  <DeepAnalysisPanel
                    msg={msg}
                    onToggle={() => toggleDeep(msg.id)}
                    onFetch={() => fetchDeep(msg.id)}
                  />
                )}
                {msg.role === 'assistant' && msg.followUps && (
                  <FollowUpChips
                    followUps={msg.followUps}
                    onPick={(q) => sendMessage(q)}
                    disabled={loading}
                  />
                )}
              </div>
            </div>
          )
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted border border-border rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
              <Spinner className="size-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">思考中…</span>
            </div>
          </div>
        )}
      </div>

      {/* Sample queries */}
      <div className="flex flex-wrap gap-2 shrink-0">
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

      {/* Input */}
      <div className="flex gap-3 shrink-0">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !loading && sendMessage()}
          type="text"
          placeholder="輸入查詢，例如：最近 30 天的營收總覽"
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
  )
}
