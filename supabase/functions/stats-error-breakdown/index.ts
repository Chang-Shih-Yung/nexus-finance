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
      SELECT t.error_code, COUNT(*) AS count
      FROM transactions t
      WHERE t.status = 'failed'
      ${from ? db`AND t.created_at >= ${from}` : db``}
      ${to ? db`AND t.created_at <= ${to}` : db``}
      GROUP BY t.error_code
      ORDER BY count DESC
    `
    return jsonResponse(rows, 200, req)
  } catch (e: any) {
    console.error('[stats-error-breakdown]', e.message)
    return jsonResponse({ error: 'Internal server error' }, 500, req)
  }
})
