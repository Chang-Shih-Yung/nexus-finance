/**
 * SQL Sanitizer — 只允許 SELECT，防止注入
 * 從 server/services/sqlSanitizer.js 移植至 TypeScript
 */

const FORBIDDEN_PATTERNS: RegExp[] = [
  /\b(DROP|DELETE|TRUNCATE|ALTER|CREATE|INSERT|UPDATE|GRANT|REVOKE)\b/i,
  /;\s*(DROP|DELETE|TRUNCATE|ALTER|CREATE|INSERT|UPDATE|GRANT|REVOKE)\b/i,
  /--/,
  /\/\*[\s\S]*?\*\//,
  /\bpg_\w+/i,
  /\binformation_schema\b/i,
  /\bEXEC(UTE)?\b/i,
  /\bINTO\s+OUTFILE\b/i,
  /\bLOAD_FILE\b/i,
]

export const MAX_ROWS = 1000

export function sanitize(sql: string): { ok: true; sql: string } | { ok: false; error: string } {
  if (typeof sql !== 'string' || !sql.trim()) {
    return { ok: false, error: 'SQL 不能為空' }
  }

  const trimmed = sql.trim().replace(/;+\s*$/, '')

  if (!/^\s*(SELECT|WITH)\b/i.test(trimmed)) {
    return { ok: false, error: '只允許 SELECT 查詢' }
  }

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { ok: false, error: `包含禁止的語句: ${new RegExp(pattern).exec(trimmed)?.[0]}` }
    }
  }

  let safeSql = trimmed
  const limitMatch = safeSql.match(/\bLIMIT\s+(\d+)/i)
  if (!limitMatch) {
    safeSql += ` LIMIT ${MAX_ROWS}`
  } else {
    const supplied = parseInt(limitMatch[1], 10)
    if (supplied > MAX_ROWS) {
      safeSql = safeSql.replace(/\bLIMIT\s+\d+/i, `LIMIT ${MAX_ROWS}`)
    }
  }

  return { ok: true, sql: safeSql }
}
