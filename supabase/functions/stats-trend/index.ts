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
  const days = Math.min(parseInt(url.searchParams.get('days') ?? '7', 10), 90)

  try {
    const db = getDb()
    const rows = await db`
      SELECT
        d.date,
        COALESCE(login_counts.count, 0) AS logins,
        COALESCE(tx_counts.total, 0) AS transactions,
        COALESCE(tx_counts.success_rate, 0) AS success_rate
      FROM generate_series(CURRENT_DATE - ${days} * INTERVAL '1 day', CURRENT_DATE, '1 day') AS d(date)
      LEFT JOIN (
        SELECT DATE(created_at) AS date, COUNT(DISTINCT user_id) AS count
        FROM events WHERE event_type='login'
        GROUP BY DATE(created_at)
      ) login_counts ON d.date = login_counts.date
      LEFT JOIN (
        SELECT DATE(created_at) AS date, COUNT(*) AS total,
               ROUND(COUNT(*) FILTER (WHERE status='success') * 100.0 / NULLIF(COUNT(*),0), 2) AS success_rate
        FROM transactions GROUP BY DATE(created_at)
      ) tx_counts ON d.date = tx_counts.date
      ORDER BY d.date
    `
    return jsonResponse(rows, 200, req)
  } catch (e: any) {
    console.error('[stats-trend]', e.message)
    return jsonResponse({ error: 'Internal server error' }, 500, req)
  }
})
