/**
 * Copilot Agent — 使用 @github/copilot-sdk 建構 AI 查詢代理
 *
 * 提供 3 個 custom tools：get_schema, run_sql_query, suggest_chart_config
 * 讓 Copilot 能理解資料庫結構、執行查詢、產生圖表設定
 */
const { CopilotClient, approveAll, defineTool } = require('@github/copilot-sdk');
const pool = require('../db/connection');
const { sanitize } = require('./sqlSanitizer');

// Singleton client — 整個 server 生命週期共用
let clientInstance = null;
let clientReady = false;

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
   - error_code VARCHAR(50)  -- 如 INSUFFICIENT_BALANCE, ACCOUNT_NOT_FOUND 等
   - error_message VARCHAR(255)
   - channel VARCHAR(20) DEFAULT 'web'  -- web / mobile / atm
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
2. 用 get_schema 工具取得資料庫結構（如果需要）
3. 根據問題產生正確的 PostgreSQL SELECT 查詢
4. 用 run_sql_query 工具執行查詢
5. 分析查詢結果，用 suggest_chart_config 產生適合的 Chart.js 圖表設定
6. 用繁體中文回答，包含數據摘要和見解

回答規則：
- 一定要用繁體中文回答
- 先簡述查詢結果的重點數據
- 如果資料適合用圖表呈現，一定要呼叫 suggest_chart_config
- 如果查詢出錯，解釋可能的原因並嘗試修正
- 金額顯示加上千分位和「元」
- 百分比保留一位小數
`;

/** 取得或建立 CopilotClient — 連接到外部 headless CLI server */
async function getClient() {
    if (clientInstance && clientReady) return clientInstance;

    const cliUrl = process.env.COPILOT_CLI_URL || 'localhost:4321';
    clientInstance = new CopilotClient({ cliUrl, logLevel: 'error' });
    await clientInstance.start();
    clientReady = true;
    return clientInstance;
}

/** 使用官方 defineTool helper 定義 custom tools */
function buildTools() {
    const getSchema = defineTool('get_schema', {
        description: '取得 nexus_finance 資料庫的完整表結構、欄位、型別、索引資訊',
        parameters: { type: 'object', properties: {} },
        skipPermission: true,
        handler: async () => SCHEMA_DESCRIPTION,
    });

    const runSqlQuery = defineTool('run_sql_query', {
        description: '在 nexus_finance 資料庫執行 SELECT 查詢（只允許 SELECT，有安全防護）',
        parameters: {
            type: 'object',
            properties: {
                sql: { type: 'string', description: '要執行的 PostgreSQL SELECT 查詢語句' },
            },
            required: ['sql'],
        },
        skipPermission: true,
        handler: async ({ sql }) => {
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
        },
    });

    const suggestChart = defineTool('suggest_chart_config', {
        description: '根據查詢結果產生 Chart.js 圖表設定（前端 vue-chartjs 可直接使用）',
        parameters: {
            type: 'object',
            properties: {
                chartType: { type: 'string', enum: ['line', 'bar', 'pie', 'doughnut'], description: '圖表類型' },
                labels: { type: 'array', items: { type: 'string' }, description: 'X 軸標籤' },
                datasets: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            label: { type: 'string', description: '資料集名稱' },
                            data: { type: 'array', items: { type: 'number' }, description: '數據值' },
                        },
                        required: ['label', 'data'],
                    },
                    description: '圖表資料集',
                },
                title: { type: 'string', description: '圖表標題' },
            },
            required: ['chartType', 'labels', 'datasets'],
        },
        skipPermission: true,
        handler: async ({ chartType, labels, datasets, title }) => {
            const colors = [
                'rgba(16,185,129,0.7)', 'rgba(59,130,246,0.7)', 'rgba(249,115,22,0.7)',
                'rgba(139,92,246,0.7)', 'rgba(236,72,153,0.7)', 'rgba(234,179,8,0.7)',
            ];
            return {
                type: chartType,
                data: {
                    labels,
                    datasets: datasets.map((ds, i) => ({
                        label: ds.label,
                        data: ds.data,
                        backgroundColor: chartType === 'line' ? 'transparent' : colors[i % colors.length],
                        borderColor: colors[i % colors.length],
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
        },
    });

    return [getSchema, runSqlQuery, suggestChart];
}

/**
 * 執行 AI 查詢
 * @param {string} userQuery - 使用者的自然語言問題
 * @returns {{ answer: string, sql: string|null, chartConfig: object|null }}
 */
async function query(userQuery) {
    const client = await getClient();

    const tools = buildTools();
    let capturedSql = null;
    let capturedChart = null;

    // Wrap handlers to capture SQL and chart
    const originalSqlHandler = tools[1].handler;
    tools[1].handler = async (args) => {
        const result = await originalSqlHandler(args);
        if (result.executed) {
            capturedSql = result.sql;
        }
        return result;
    };

    const originalChartHandler = tools[2].handler;
    tools[2].handler = async (args) => {
        const result = await originalChartHandler(args);
        capturedChart = result;
        return result;
    };

    const session = await client.createSession({
        model: 'gpt-4.1',
        tools,
        onPermissionRequest: approveAll,
        systemMessage: {
            mode: 'append',
            content: SYSTEM_PROMPT,
        },
        // Disable built-in tools — we only want our custom tools
        availableTools: ['get_schema', 'run_sql_query', 'suggest_chart_config'],
        infiniteSessions: { enabled: false },
    });

    try {
        const response = await session.sendAndWait(
            { prompt: userQuery },
            30000, // 30 second timeout
        );

        const answer = response?.data?.content || '抱歉，無法取得回應。';

        return {
            answer,
            sql: capturedSql,
            chartConfig: capturedChart,
        };
    } finally {
        await session.disconnect();
    }
}

/** Graceful shutdown */
async function shutdown() {
    if (clientInstance) {
        try { await clientInstance.stop(); } catch { /* ignore */ }
        clientInstance = null;
        clientReady = false;
    }
}

module.exports = { query, shutdown };
