/**
 * SQL Sanitizer — 只允許 SELECT，防止注入
 */

const FORBIDDEN_PATTERNS = [
    /\b(DROP|DELETE|TRUNCATE|ALTER|CREATE|INSERT|UPDATE|GRANT|REVOKE)\b/i,
    /;\s*(DROP|DELETE|TRUNCATE|ALTER|CREATE|INSERT|UPDATE|GRANT|REVOKE)\b/i,
    /--/,                     // SQL single-line comments
    /\/\*[\s\S]*?\*\//,       // SQL block comments
    /\bpg_\w+/i,              // PostgreSQL system catalogs
    /\binformation_schema\b/i,
    /\bEXEC(UTE)?\b/i,
    /\bINTO\s+OUTFILE\b/i,
    /\bLOAD_FILE\b/i,
];

const MAX_ROWS = 1000;

function sanitize(sql) {
    if (typeof sql !== 'string' || !sql.trim()) {
        return { ok: false, error: 'SQL 不能為空' };
    }

    const trimmed = sql.trim().replace(/;+\s*$/, '');

    if (!/^\s*(SELECT|WITH)\b/i.test(trimmed)) {
        return { ok: false, error: '只允許 SELECT 查詢' };
    }

    for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(trimmed)) {
            return { ok: false, error: `包含禁止的語句: ${new RegExp(pattern).exec(trimmed)?.[0]}` };
        }
    }

    let safeSql = trimmed;

    // 若無 LIMIT → 加上 LIMIT MAX_ROWS
    // 若有 LIMIT → 強制將值限制在 MAX_ROWS 以內
    const limitMatch = safeSql.match(/\bLIMIT\s+(\d+)/i);
    if (!limitMatch) {
        safeSql += ` LIMIT ${MAX_ROWS}`;
    } else {
        const supplied = Number.parseInt(limitMatch[1], 10);
        if (supplied > MAX_ROWS) {
            safeSql = safeSql.replace(/\bLIMIT\s+\d+/i, `LIMIT ${MAX_ROWS}`);
        }
    }

    return { ok: true, sql: safeSql };
}

module.exports = { sanitize, MAX_ROWS };
