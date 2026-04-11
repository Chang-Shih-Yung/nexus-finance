/**
 * Presentation helpers for AI query results.
 *
 * The nf_ai_ask RPC returns raw rows from whatever aggregate function
 * the LLM picked, with snake_case column names and untyped values.
 * For a non-technical audience (executives) we need to turn that into
 * human-readable labels and properly formatted numbers.
 */

// ── Field name → 中文 label ───────────────────────────────────────
// Only the fields that actually appear in the whitelisted nf_* RPCs.
// Falls back to a prettified snake_case string when not found.
const FIELD_LABELS: Record<string, string> = {
    // Revenue
    total_revenue: '總營收',
    interest_income: '利息收入',
    fee_income: '手續費收入',
    daily_avg: '日均值',
    prev_total: '上期總額',
    change_pct: '期間變化',
    pct_of_total: '佔比',
    product_type: '產品類別',

    // Loans
    total_outstanding: '放款餘額',
    loan_count: '放款筆數',
    avg_rate: '平均利率',
    overdue_count: '逾期筆數',
    overdue_amount: '逾期金額',
    npl_ratio: 'NPL 比率',
    default_count: '違約戶數',
    loan_type: '放款類別',

    // Deposits
    total_deposits: '存款總額',
    account_count: '帳戶數',
    avg_balance: '平均餘額',
    weighted_rate: '加權利率',
    total_balance: '存款餘額',

    // Compliance
    category: '類別',
    total_items: '項目總數',
    compliant: '合規',
    warning: '警示',
    violation: '違規',
    pending: '待審',
    avg_score: '平均分數',
    item_name: '項目名稱',
    status: '狀態',
    score: '分數',
    details: '細節',
    due_date: '到期日',
    checked_at: '檢查時間',

    // NPS / Feedback
    total_responses: '回應數',
    promoters: '推薦者',
    passives: '被動者',
    detractors: '批評者',
    nps_score: 'NPS 分數',
    user_name: '客戶姓名',
    channel: '通路',
    comment: '留言',
    created_at: '建立時間',

    // Fraud
    total_alerts: '警報總數',
    open_count: '未處理',
    investigating: '調查中',
    resolved: '已解決',
    false_positive: '誤報',
    critical_count: '重大等級',
    high_count: '高風險',
    total_amount: '總金額',
    alert_type: '警報類型',
    severity: '嚴重度',
    description: '描述',
    amount: '金額',

    // System
    name: '名稱',
    uptime_pct: '可用率',
    avg_response_ms: '平均延遲',
    last_incident: '最近事件',
    last_check: '最近檢查',
    total_components: '系統總數',
    operational: '正常',
    degraded: '降級',
    outage: '中斷',
    avg_uptime: '平均可用率',

    // FX / Investment
    currency_pair: '幣別',
    buy_rate: '買價',
    sell_rate: '賣價',
    updated_at: '更新時間',
    risk_level: '風險等級',
    return_ytd: '年初至今報酬',
    aum: '管理資產',
    currency: '幣別',
    total_aum: '總管理資產',
    product_count: '產品數',
    avg_return: '平均報酬',
    high_risk_count: '高風險數',
    medium_risk_count: '中風險數',
    low_risk_count: '低風險數',

    // Budget / Branches / RMs
    metric_key: '指標',
    target_total: '目標',
    actual_total: '實際',
    achievement_pct: '達成率',
    branch_name: '分行',
    target_value: '目標值',
    actual_value: '實際值',
    rank: '排名',
    rm_name: '理專',
    client_count: '客戶數',
    total_txn_amount: '總交易金額',
    txn_count: '交易筆數',
    avg_client_balance: '平均客戶餘額',

    // Channels
    event_count: '事件數',
    pct: '佔比',
    total_logins: '總登入',
    mobile_logins: '行動登入',
    web_logins: '網頁登入',
    mobile_pct: '行動佔比',
    unique_digital_users: '數位用戶',

    // Today snapshot
    snapshot_date: '日期',
    as_of: '資料時間',
    active_users: '活躍用戶',
    success_rate: '成功率',

    // Dashboard core
    date: '日期',
    metric_value: '數值',
    dimension_value: '項目',
    current_total: '本期總和',
    previous_total: '上期總和',
    today_value: '今日值',
    avg_7d: '7日平均',
    stddev_7d: '7日標準差',
    z_score: 'Z 分數',
    minute: '時間',
    error_count: '錯誤數',
    error_rate: '錯誤率',
    total_requests: '請求總數',
    avg_latency: '平均延遲',
    from_account: '轉出帳戶',
    to_account: '轉入帳戶',
    primary_currency: '主要幣別',
    month: '月份',
    txn_amount: '交易金額',
    error_code: '錯誤代碼',
    error_message: '錯誤訊息',
    error_msg: '錯誤訊息',
    id: '編號',
    tier: '客戶等級',
    customer_tier: '客戶等級',
    user_tier: '客戶等級',
    email: '電子郵件',
}

// ── Value dictionary ─────────────────────────────────────────────
// Translates enum-like raw values returned by RPCs into Traditional
// Chinese labels. The outer key is the COLUMN name (as returned by the
// RPC) and the inner map is value → zh-TW label.
//
// Design notes:
//   - Unknown values fall through unchanged. This is intentional: it's
//     always better to show raw English than to hide data behind "?".
//   - Values already in Chinese (e.g. loan_type = '房貸' from
//     nf_loan_by_type) naturally pass through because there's no entry
//     for them in the map.
//   - A few columns share semantics (status may mean transaction status,
//     compliance status, or alert status). When values differ per
//     context we merge both sides so the dictionary answers both.
const VALUE_LABELS: Record<string, Record<string, string>> = {
    // Transaction & generic status
    status: {
        // transaction lifecycle
        pending: '待處理',
        success: '成功',
        failed: '失敗',
        completed: '已完成',
        cancelled: '已取消',
        processing: '處理中',
        // compliance
        compliant: '合規',
        warning: '警示',
        violation: '違規',
        // fraud alert
        open: '未處理',
        investigating: '調查中',
        resolved: '已解決',
        false_positive: '誤報',
        // system health
        operational: '正常',
        degraded: '降級',
        outage: '中斷',
    },

    // Channel / source
    channel: {
        web: '網頁',
        mobile: '行動',
        app: 'App',
        atm: 'ATM',
        branch: '分行',
        api: 'API',
        kiosk: '自助機台',
    },

    // Transaction / product category
    category: {
        payment: '付款',
        loan: '貸款',
        deposit: '存款',
        transfer: '轉帳',
        withdrawal: '提款',
        fee: '手續費',
        interest: '利息',
        refund: '退款',
        fx: '外匯',
        investment: '投資',
    },

    // Currency code
    currency: {
        TWD: '台幣',
        USD: '美元',
        JPY: '日圓',
        EUR: '歐元',
        CNY: '人民幣',
        HKD: '港幣',
        GBP: '英鎊',
        AUD: '澳幣',
        SGD: '新加坡幣',
    },
    // primary_currency aliases to currency — see translateValue() below.

    // Severity (fraud alerts, compliance)
    severity: {
        critical: '重大',
        high: '高',
        medium: '中',
        low: '低',
        info: '資訊',
    },

    // Risk level (investment products)
    risk_level: {
        high: '高風險',
        medium: '中風險',
        low: '低風險',
    },

    // Alert type (fraud)
    alert_type: {
        unusual_amount: '異常金額',
        velocity: '頻率異常',
        location: '地點異常',
        card_not_present: '無卡交易',
        device_change: '裝置變更',
    },

    // Account type
    account_type: {
        checking: '活期',
        savings: '儲蓄',
        time_deposit: '定存',
        loan: '貸款',
        credit: '信用',
    },

    // Loan type (may already be Chinese in DB, this covers English fallback)
    loan_type: {
        mortgage: '房貸',
        personal: '信貸',
        auto: '車貸',
        business: '企業貸',
        student: '學貸',
    },

    // Product / service type
    product_type: {
        savings: '儲蓄',
        checking: '活期',
        loan: '貸款',
        mortgage: '房貸',
        investment: '投資',
        insurance: '保險',
        card: '信用卡',
    },

    // Region / tier (customer segmentation)
    tier: {
        vip: 'VIP',
        VIP: 'VIP',
        gold: '金卡',
        GOLD: '金卡',
        silver: '銀卡',
        SILVER: '銀卡',
        bronze: '銅卡',
        BRONZE: '銅卡',
        standard: '一般',
        STANDARD: '一般',
        premium: '尊榮',
        PREMIUM: '尊榮',
        general: '一般',
        GENERAL: '一般',
    },
    // customer_tier and user_tier alias to tier — see translateValue() below.

    // Transaction error codes (seeded in demo data)
    error_code: {
        E_TIMEOUT: '系統逾時',
        E_BALANCE: '餘額不足',
        E_ACCOUNT: '帳號錯誤',
        E_FRAUD: '疑似詐欺',
        E_AUTH: '驗證失敗',
        E_LIMIT: '超過限額',
        E_NETWORK: '網路異常',
        E_SYSTEM: '系統錯誤',
        E_VALIDATION: '資料錯誤',
        UNKNOWN: '未知錯誤',
    },
}

// Column aliases — multiple column names share the same enum dictionary,
// so we redirect them to a canonical key instead of duplicating the map.
const VALUE_LABEL_ALIASES: Record<string, string> = {
    primary_currency: 'currency',
    customer_tier: 'tier',
    user_tier: 'tier',
}

/**
 * Translate a raw enum-like value into its zh-TW label. Unknown values
 * and non-string values pass through unchanged — we never want to hide
 * data from the user just because we haven't catalogued it yet.
 */
function translateValue(key: string, value: unknown): unknown {
    if (typeof value !== 'string') return value
    const canonicalKey = VALUE_LABEL_ALIASES[key] ?? key
    const dict = VALUE_LABELS[canonicalKey]
    if (!dict) return value
    return dict[value] ?? value
}

/** Turn snake_case → Title Case as a fallback when we don't have a Chinese label. */
function prettifySnakeCase(s: string): string {
    return s
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
}

export function fieldLabel(key: string): string {
    return FIELD_LABELS[key] ?? prettifySnakeCase(key)
}

// ── Value formatting ─────────────────────────────────────────────
const PCT_KEYS = new Set([
    'change_pct', 'pct', 'pct_of_total', 'npl_ratio', 'avg_rate', 'weighted_rate',
    'uptime_pct', 'avg_uptime', 'mobile_pct', 'achievement_pct', 'success_rate',
    'error_rate', 'return_ytd',
])

const DATE_KEYS = new Set([
    'date', 'snapshot_date', 'as_of', 'created_at', 'updated_at',
    'last_check', 'last_incident', 'checked_at', 'due_date',
    'minute', 'month',
])

const COUNT_KEYS = new Set([
    'account_count', 'loan_count', 'overdue_count', 'default_count',
    'total_items', 'compliant', 'warning', 'violation', 'pending',
    'promoters', 'passives', 'detractors', 'total_responses', 'total_alerts',
    'open_count', 'investigating', 'resolved', 'false_positive',
    'critical_count', 'high_count', 'total_components', 'operational',
    'degraded', 'outage', 'product_count', 'high_risk_count',
    'medium_risk_count', 'low_risk_count', 'client_count', 'txn_count',
    'event_count', 'total_logins', 'mobile_logins', 'web_logins',
    'unique_digital_users', 'error_count', 'total_requests', 'rank',
])

function isPercentKey(key: string): boolean {
    if (PCT_KEYS.has(key)) return true
    return key.endsWith('_pct') || key.endsWith('_rate') || key.endsWith('_ratio')
}

function isDateKey(key: string): boolean {
    return DATE_KEYS.has(key) || key.endsWith('_at') || key.endsWith('_date')
}

function isCountKey(key: string): boolean {
    return COUNT_KEYS.has(key) || key.endsWith('_count')
}

// IDs should render as plain digits, not comma-grouped numbers.
// "127" not "127" (fine) but also "1234567" not "1,234,567".
function isIdKey(key: string): boolean {
    return key === 'id' || key.endsWith('_id')
}

/** Format a raw cell value for display. Locale is zh-TW. */
export function formatValue(key: string, value: unknown): string {
    if (value == null) return '—'

    // Booleans → ✓ / ✗
    if (typeof value === 'boolean') return value ? '是' : '否'

    // Enum-like strings → Chinese label (status/channel/category/...)
    // Run this BEFORE number/date coercion so raw enum strings don't
    // accidentally get parsed as numbers. Unknown values pass through.
    if (typeof value === 'string') {
        const translated = translateValue(key, value)
        if (translated !== value) return String(translated)
    }

    // Dates → yyyy-MM-dd (or yyyy-MM-dd HH:mm for datetimes)
    if (isDateKey(key) && typeof value === 'string') {
        const d = new Date(value)
        if (!Number.isNaN(d.getTime())) {
            const y = d.getFullYear()
            const m = String(d.getMonth() + 1).padStart(2, '0')
            const day = String(d.getDate()).padStart(2, '0')
            if (key.endsWith('_at') || key === 'as_of' || key === 'last_check' || key === 'last_incident') {
                const hh = String(d.getHours()).padStart(2, '0')
                const mm = String(d.getMinutes()).padStart(2, '0')
                return `${y}-${m}-${day} ${hh}:${mm}`
            }
            return `${y}-${m}-${day}`
        }
    }

    // Numbers
    const n = typeof value === 'number' ? value : Number(value)
    if (Number.isFinite(n)) {
        if (isIdKey(key)) {
            return String(Math.trunc(n))
        }
        if (isPercentKey(key)) {
            return `${n.toFixed(1)}%`
        }
        if (isCountKey(key) || Number.isInteger(n)) {
            return n.toLocaleString('zh-TW')
        }
        // Money / float → comma group with up to 2 decimals
        return n.toLocaleString('zh-TW', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        })
    }

    // Strings and anything else
    return String(value)
}

/**
 * Columns in the order they should be displayed. Uses the first row's
 * keys so the order matches the SQL return shape of the chosen RPC.
 */
export function rowColumns(rows: Array<Record<string, unknown>>): string[] {
    if (!rows || rows.length === 0) return []
    return Object.keys(rows[0])
}
