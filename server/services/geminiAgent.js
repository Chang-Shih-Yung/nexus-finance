/**
 * Gemini Agent — 使用 @google/genai 建構 AI 查詢代理
 *
 * 提供 3 個 tools：get_schema, run_sql_query, suggest_chart_config
 * 透過 Gemini function calling 實現完整的 agentic 迴圈
 *
 * 可用工具白名單：
 *   get_schema        — 唯讀，回傳靜態 schema 字串，無副作用
 *   run_sql_query     — 唯讀，只允許 SELECT（由 sqlSanitizer 強制），有 5s timeout 和 LIMIT 1000 上限
 *   suggest_chart_config — 純運算，不存取資料庫，只產生 Chart.js 設定物件
 */

const { GoogleGenAI } = require('@google/genai');
const pool = require('../db/connection');
const { sanitize } = require('./sqlSanitizer');

const SCHEMA_DESCRIPTION = `
資料庫：nexus_finance（PostgreSQL 14）
用途：銀行數據監控平台

=== 表結構 ===

1. users（銀行客戶）
   - id SERIAL PK
   - name VARCHAR(100)
   - email VARCHAR(255) UNIQUE
   - phone VARCHAR(30)
   - tier user_tier ENUM('general','vip','premium')  -- 客戶等級
   - rm_name VARCHAR(100)  -- 負責理專姓名
   - branch VARCHAR(100)   -- 所屬分行
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
- event_type 和 tx_status 是 PostgreSQL ENUM，比較時用字串值
`;

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
`;

// Gemini function declarations
const FUNCTION_DECLARATIONS = [
    {
        name: 'get_schema',
        description: '取得 nexus_finance 資料庫的完整表結構、欄位、型別、索引資訊',
        parameters: { type: 'object', properties: {} },
    },
    {
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
    {
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
];

const CHART_COLORS = [
    'rgba(16,185,129,0.7)', 'rgba(59,130,246,0.7)', 'rgba(249,115,22,0.7)',
    'rgba(139,92,246,0.7)', 'rgba(236,72,153,0.7)', 'rgba(234,179,8,0.7)',
];

async function handleRunSqlQuery(sql) {
    const check = sanitize(sql);
    if (!check.ok) return { error: check.error, executed: false };
    try {
        const result = await pool.query({ text: check.sql, statement_timeout: 5000 });
        return {
            executed: true,
            sql: check.sql,
            rowCount: result.rowCount,
            columns: result.fields.map(f => f.name),
            rows: result.rows,
        };
    } catch (err) {
        return { error: `查詢錯誤: ${err.message}`, executed: false, sql: check.sql };
    }
}

function buildChartConfig({ chartType, labels, datasets, title }) {
    return {
        type: chartType,
        data: {
            labels,
            datasets: datasets.map((ds, i) => ({
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
    };
}

/**
 * 執行 AI 查詢（Gemini agentic 迴圈）
 * @param {string} userQuery
 * @returns {{ answer: string, sql: string|null, chartConfig: object|null }}
 */
async function query(userQuery) {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const contents = [
        { role: 'user', parts: [{ text: userQuery }] },
    ];

    let capturedSql = null;
    let capturedChart = null;

    const MAX_ITERATIONS = 6; // 防止無限迴圈

    for (let i = 0; i < MAX_ITERATIONS; i++) {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents,
            config: {
                systemInstruction: SYSTEM_PROMPT,
                tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
                temperature: 0,
            },
        });

        const candidate = response.candidates?.[0];
        if (!candidate) throw new Error('Gemini 未回傳結果');

        const parts = candidate.content.parts;
        const functionCalls = parts.filter(p => p.functionCall);

        if (functionCalls.length === 0) {
            // 最終文字回應
            const textPart = parts.find(p => p.text);
            return {
                answer: textPart?.text || '抱歉，無法取得回應。',
                sql: capturedSql,
                chartConfig: capturedChart,
            };
        }

        // 將 model 回應加入對話歷史
        contents.push({ role: 'model', parts });

        // 執行所有 function calls
        const toolResponseParts = [];
        for (const part of functionCalls) {
            const { name, args } = part.functionCall;
            let result;

            switch (name) {
                case 'get_schema':
                    result = { schema: SCHEMA_DESCRIPTION };
                    break;
                case 'run_sql_query': {
                    result = await handleRunSqlQuery(args.sql || '');
                    if (result.executed) capturedSql = result.sql;
                    break;
                }
                case 'suggest_chart_config':
                    result = buildChartConfig(args);
                    capturedChart = result;
                    break;
                default:
                    result = { error: `未知工具: ${name}` };
            }

            toolResponseParts.push({
                functionResponse: { name, response: result },
            });
        }

        // 將工具結果加入對話歷史
        contents.push({ role: 'user', parts: toolResponseParts });
    }

    throw new Error('AI 查詢超過最大迭代次數，請簡化您的問題');
}

module.exports = { query };
