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
      SELECT DATE(e.created_at) AS date, COUNT(DISTINCT e.user_id) AS count
      FROM events e
      WHERE e.event_type = 'login'
      ${from ? db`AND e.created_at >= ${from}` : db``}
      ${to ? db`AND e.created_at <= ${to}` : db``}
      GROUP BY DATE(e.created_at)
      ORDER BY date
    `
    return jsonResponse(rows, 200, req)
  } catch (e: any) {
    console.error('[stats-daily-logins]', e.message)
    return jsonResponse({ error: 'Internal server error' }, 500, req)
  }
})
