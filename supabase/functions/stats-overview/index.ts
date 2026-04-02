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

  try {
    const db = getDb()
    const today = new Date().toISOString().split('T')[0]

    const [loginsRows, txRows, activeRows] = await Promise.all([
      db`SELECT COUNT(DISTINCT user_id) AS count FROM events WHERE event_type='login' AND DATE(created_at)=${today}`,
      db`
        SELECT COUNT(*) AS total,
               COUNT(*) FILTER (WHERE status='success') AS success_count,
               ROUND(COUNT(*) FILTER (WHERE status='success') * 100.0 / NULLIF(COUNT(*),0), 2) AS success_rate
        FROM transactions WHERE DATE(created_at)=${today}
      `,
      db`SELECT COUNT(DISTINCT user_id) AS count FROM events WHERE DATE(created_at)=${today}`,
    ])

    return jsonResponse({
      today_logins:        parseInt(loginsRows[0].count, 10),
      today_transactions:  parseInt(txRows[0].total, 10),
      today_success_rate:  parseFloat(txRows[0].success_rate ?? 0),
      today_active_users:  parseInt(activeRows[0].count, 10),
    }, 200, req)
  } catch (e: any) {
    console.error('[stats-overview]', e.message)
    return jsonResponse({ error: 'Internal server error' }, 500, req)
  }
})
