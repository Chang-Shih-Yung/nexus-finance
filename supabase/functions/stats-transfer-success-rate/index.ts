import { handleCors, jsonResponse } from '../_shared/cors.ts'
import { requireAuth } from '../_shared/auth.ts'
import { getDb } from '../_shared/db.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    await requireAuth(req)
  } catch (e: any) {
    return jsonResponse({ error: e.message }, e.status ?? 401, req)
  }

  const url = new URL(req.url)
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')

  try {
    const db = getDb()
    const rows = await db`
      SELECT
        DATE(t.created_at) AS date,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE t.status = 'success') AS success_count,
        ROUND(COUNT(*) FILTER (WHERE t.status = 'success') * 100.0 / NULLIF(COUNT(*), 0), 2) AS success_rate
      FROM transactions t
      WHERE 1=1
      ${from ? db`AND t.created_at >= ${from}` : db``}
      ${to ? db`AND t.created_at <= ${to}` : db``}
      GROUP BY DATE(t.created_at)
      ORDER BY date
    `
    return jsonResponse(rows, 200, req)
  } catch (e: any) {
    console.error('[stats-transfer-success-rate]', e.message)
    return jsonResponse({ error: 'Internal server error' }, 500, req)
  }
})
