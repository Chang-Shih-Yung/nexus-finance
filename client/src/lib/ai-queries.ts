'use client'

import { invokeRpc } from '@/lib/rpc'

// ── Row = whatever columns the chosen RPC returns ──
export type AiDataRow = Record<string, unknown>

// ── Follow-up drill-down suggestion emitted by the LLM ──
export interface AiFollowUp {
    /** Short button text (≤10 chars ideally). */
    label: string
    /** Full natural-language question to re-ask the system. */
    question: string
}

/**
 * Rendering hint resolved server-side in nf_ai_ask from catalog metadata +
 * row shape. The frontend branches on this to decide which widgets to show:
 *   - text  : narrative only (single-row snapshots fall back to a KPI grid)
 *   - table : narrative + DataTable (no chart)
 *   - chart : narrative + ChartRenderer (no table)
 *   - both  : narrative + ChartRenderer + DataTable
 */
export type AiRenderHint = 'text' | 'table' | 'chart' | 'both'

// ── Frontend-facing shape consumed by AiQuerySection ──
export interface AiQueryResponse {
    answer: string
    /** Optional second-line insight from Call 2 (延伸觀察 / 對比). */
    insight?: string
    /**
     * True when the primary AI path failed and the server fell back to a
     * template narration, chart-derivation silently failed, etc. Frontend
     * shows "⚠️ 模型輸出品質降低" badge with tooltip explaining the cause.
     */
    degraded?: boolean
    /**
     * Short enum-like reason code from the backend (e.g. `call2_http_failed`,
     * `call2_parse_failed`, `chart_derivation_failed`). The frontend maps
     * this to a human-readable tooltip.
     */
    degradeReason?: string
    /** Name of the RPC the LLM dispatched to (e.g. "nf_revenue_summary"). */
    rpcCalled?: string
    /** Raw rows returned by the chosen RPC, rendered as KPI cards or a table. */
    data?: AiDataRow[]
    /** Server-resolved rendering hint (defaults to 'text'). */
    render?: AiRenderHint
    /** Optional 2-3 conversational follow-up suggestions. */
    followUps?: AiFollowUp[]
    /** Optional chart configuration derived from the LLM chart hint. */
    chartConfig?: {
        type: 'line' | 'bar' | 'pie' | 'doughnut'
        /** Original x field key (used to format axis labels / tooltips). */
        xKey: string
        /** Original y field key (used to format values via formatValue()). */
        yKey: string
        data: {
            labels: string[]
            datasets: Array<{
                label: string
                data: number[]
                borderColor?: string
                backgroundColor?: string
                borderWidth?: number
                fill?: boolean
                tension?: number
            }>
        }
        options?: Record<string, unknown>
    }
}

// ── Raw shape returned by nf_ai_ask RPC (jsonb) ──
interface AiAskRaw {
    answer?: string
    insight?: string | null
    degraded?: boolean | null
    degrade_reason?: string | null
    rpc_called?: string | null
    params?: Record<string, unknown> | null
    data?: AiDataRow[] | null
    chart?: {
        type?: 'line' | 'bar' | 'pie'
        x_field?: string
        y_field?: string
    } | null
    render?: AiRenderHint | null
    follow_ups?: Array<{ label?: string; question?: string }> | null
    // Error path
    error?: string
    message?: string
    status_code?: number
    attempted?: string
    raw?: string
}

function toNumber(v: unknown): number {
    if (typeof v === 'number') return v
    if (typeof v === 'string') {
        const n = Number(v)
        return Number.isFinite(n) ? n : 0
    }
    return 0
}

function toLabel(v: unknown): string {
    if (v == null) return ''
    if (typeof v === 'string') return v
    if (v instanceof Date) return v.toISOString().slice(0, 10)
    return String(v)
}

/**
 * Normalise the LLM's raw follow_ups array. Drops malformed entries
 * and enforces a cap of 4 so the UI stays tidy.
 */
function normaliseFollowUps(
    raw: AiAskRaw['follow_ups'],
): AiFollowUp[] | undefined {
    if (!Array.isArray(raw) || raw.length === 0) return undefined
    const cleaned: AiFollowUp[] = []
    for (const item of raw) {
        if (!item) continue
        const label = typeof item.label === 'string' ? item.label.trim() : ''
        const question = typeof item.question === 'string' ? item.question.trim() : ''
        if (!label || !question) continue
        cleaned.push({ label, question })
        if (cleaned.length >= 4) break
    }
    return cleaned.length > 0 ? cleaned : undefined
}

/**
 * Convert the LLM's chart hint + raw RPC rows into the recharts-friendly
 * ChartConfig shape that AiQuerySection already knows how to render.
 */
/**
 * Turn the LLM's chart hint + raw RPC rows into a chart config, or
 * return undefined when a chart would be misleading. A chart is
 * suppressed when:
 *   - the hint is missing fields or references columns that don't exist
 *   - a line chart only has 0 or 1 points (nothing to connect)
 *   - every y-value is zero (empty/grey chart)
 * In those cases the UI falls back to the KPI grid / data table,
 * which is always readable even for tiny datasets.
 */
function buildChartConfig(
    chart: AiAskRaw['chart'],
    rows: AiDataRow[] | null | undefined,
): AiQueryResponse['chartConfig'] | undefined {
    if (!chart || !chart.type || !rows || rows.length === 0) return undefined
    const { type, x_field, y_field } = chart
    if (!x_field || !y_field) return undefined
    if (!(x_field in rows[0]) || !(y_field in rows[0])) return undefined

    const labels = rows.map((r) => toLabel(r[x_field]))
    const data = rows.map((r) => toNumber(r[y_field]))

    // Line chart with <2 points is just a dot → fall back to KPI card.
    if (type === 'line' && data.length < 2) return undefined
    // All zero → chart would be a flat line / empty pie → fall back.
    if (data.every((v) => v === 0)) return undefined

    const common = { responsive: true, maintainAspectRatio: false }

    if (type === 'line') {
        return {
            type: 'line',
            xKey: x_field,
            yKey: y_field,
            data: {
                labels,
                datasets: [{
                    label: y_field,
                    data,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16,185,129,0.12)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                }],
            },
            options: common,
        }
    }

    if (type === 'bar') {
        return {
            type: 'bar',
            xKey: x_field,
            yKey: y_field,
            data: {
                labels,
                datasets: [{
                    label: y_field,
                    data,
                    backgroundColor: '#3b82f6',
                }],
            },
            options: common,
        }
    }

    if (type === 'pie') {
        return {
            type: 'pie',
            xKey: x_field,
            yKey: y_field,
            data: {
                labels,
                datasets: [{ label: y_field, data }],
            },
            options: common,
        }
    }

    return undefined
}

/**
 * Sends a natural-language question to the server-side nf_ai_ask RPC,
 * which calls Groq (key stored in Supabase Vault) and dispatches to a
 * whitelisted aggregate RPC. Returns a frontend-friendly shape.
 */
export async function runAiQuery(query: string): Promise<AiQueryResponse> {
    const trimmed = query.trim()
    if (!trimmed) {
        return { answer: '請輸入要查詢的問題。' }
    }

    let raw: AiAskRaw
    try {
        raw = await invokeRpc<AiAskRaw>('nf_ai_ask', { p_question: trimmed })
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        return {
            answer: `查詢失敗：${msg}`,
            degraded: true,
            degradeReason: 'rpc_invoke_failed',
        }
    }

    // ── Error paths surfaced by nf_ai_ask ──
    if (raw.error) {
        const parts = [raw.error]
        if (raw.message) parts.push(raw.message)
        if (raw.attempted) parts.push(`(attempted: ${raw.attempted})`)
        if (raw.status_code) parts.push(`(status ${raw.status_code})`)
        return {
            answer: `AI 查詢失敗：${parts.join(' — ')}`,
            degraded: true,
            degradeReason: raw.error,
        }
    }

    const answer = raw.answer ?? '（沒有產生回答）'

    const followUps = normaliseFollowUps(raw.follow_ups)

    // No RPC chosen → LLM decided the question isn't answerable by the catalog.
    // We still surface follow-ups so the exec gets a friendly redirect.
    const insight = typeof raw.insight === 'string' && raw.insight.trim()
        ? raw.insight.trim()
        : undefined

    const degraded = raw.degraded === true
    const degradeReason = typeof raw.degrade_reason === 'string' && raw.degrade_reason
        ? raw.degrade_reason
        : undefined

    if (!raw.rpc_called) {
        return { answer, insight, render: 'text', followUps, degraded, degradeReason }
    }

    const chartConfig = buildChartConfig(raw.chart, raw.data)

    // Server-resolved hint; default to 'text' when missing.
    let render: AiRenderHint = raw.render ?? 'text'

    // Safety degrade: if server said chart/both but frontend chart builder
    // refused (e.g. <2 points, all zero, field missing), drop to table when
    // we have rows, otherwise text. Backend does the same degrade but the
    // frontend has stricter quality rules (flat-zero check etc).
    if ((render === 'chart' || render === 'both') && !chartConfig) {
        render = raw.data && raw.data.length > 1 ? 'table' : 'text'
    }

    return {
        answer,
        insight,
        degraded,
        degradeReason,
        rpcCalled: raw.rpc_called,
        data: raw.data ?? undefined,
        render,
        chartConfig,
        followUps,
    }
}

// ── Deep analysis (Step 2) ───────────────────────────────────────────────

/** Structured four-section deep analysis returned by nf_ai_ask_deep. */
export interface AiDeepAnalysis {
    trend?: string
    observations?: string
    recommendations?: string
    risks?: string
    /** Set when the RPC failed; frontend shows this in place of sections. */
    error?: string
    /** True when deep analysis fell through to the raw-text / incomplete path. */
    degraded?: boolean
    /** Short enum-like reason code (e.g. `parse_failed`, `http_failed`). */
    degradeReason?: string
}

interface AiDeepRaw {
    trend?: string | null
    observations?: string | null
    recommendations?: string | null
    risks?: string | null
    error?: string | null
    message?: string | null
    model_used?: string | null
    degraded?: boolean | null
    degrade_reason?: string | null
}

function cleanSection(v: unknown): string | undefined {
    if (typeof v !== 'string') return undefined
    const trimmed = v.trim()
    return trimmed.length > 0 ? trimmed : undefined
}

/**
 * Calls nf_ai_ask_deep with the exact rows the user already saw so the
 * deep analysis is anchored to the same snapshot (no re-fetch drift).
 * PII masking and 60s HTTP timeout happen server-side.
 */
export async function runAiDeepAnalysis(
    question: string,
    rpcName: string,
    data: AiDataRow[],
): Promise<AiDeepAnalysis> {
    if (!question.trim() || !rpcName || !Array.isArray(data) || data.length === 0) {
        return { error: '缺少足夠資料，無法產生深度解讀。' }
    }

    let raw: AiDeepRaw
    try {
        raw = await invokeRpc<AiDeepRaw>('nf_ai_ask_deep', {
            p_question: question,
            p_rpc_name: rpcName,
            p_data: data,
        })
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        return { error: `深度解讀失敗：${msg}` }
    }

    const degraded = raw.degraded === true
    const degradeReason = typeof raw.degrade_reason === 'string' && raw.degrade_reason
        ? raw.degrade_reason
        : undefined

    if (raw.error) {
        const detail = raw.message ? `（${raw.message}）` : ''
        return {
            error: `深度解讀失敗：${raw.error}${detail}`,
            degraded: true,
            degradeReason: degradeReason ?? raw.error,
        }
    }

    return {
        trend: cleanSection(raw.trend),
        observations: cleanSection(raw.observations),
        recommendations: cleanSection(raw.recommendations),
        risks: cleanSection(raw.risks),
        degraded,
        degradeReason,
    }
}
