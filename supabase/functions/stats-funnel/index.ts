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
  const windowHours = 24

  try {
    const db = getDb()
    const rows = await db`
      WITH session_window AS (
        SELECT
          user_id,
          MAX(CASE WHEN event_type = 'login'            THEN created_at END) AS last_login,
          MAX(CASE WHEN event_type = 'transfer_init'    THEN created_at END) AS last_init,
          MAX(CASE WHEN event_type = 'transfer_success' THEN created_at END) AS last_success
        FROM events
        WHERE event_type IN ('login', 'transfer_init', 'transfer_success')
        ${from ? db`AND created_at >= ${from}` : db``}
        ${to ? db`AND created_at <= ${to}` : db``}
        GROUP BY user_id
      )
      SELECT
        COUNT(DISTINCT user_id) AS login_users,
        COUNT(DISTINCT CASE
          WHEN last_init IS NOT NULL
           AND last_init - last_login <= (${windowHours.toString()} || ' hours')::INTERVAL
          THEN user_id END) AS init_users,
        COUNT(DISTINCT CASE
          WHEN last_success IS NOT NULL
           AND last_success - last_login <= (${windowHours.toString()} || ' hours')::INTERVAL
          THEN user_id END) AS success_users
      FROM session_window
      WHERE last_login IS NOT NULL
    `

    const r = rows[0]
    const funnel = [
      { step: 'login',            users: parseInt(r.login_users,   10) },
      { step: 'transfer_init',    users: parseInt(r.init_users,    10) },
      { step: 'transfer_success', users: parseInt(r.success_users, 10) },
    ]

    for (let i = 1; i < funnel.length; i++) {
      const prev = funnel[i - 1].users
      ;(funnel[i] as any).conversion_rate = prev ? +((funnel[i].users / prev) * 100).toFixed(2) : 0
      ;(funnel[i] as any).drop_off_rate   = prev ? +((1 - funnel[i].users / prev) * 100).toFixed(2) : 0
    }

    return jsonResponse(funnel, 200, req)
  } catch (e: any) {
    console.error('[stats-funnel]', e.message)
    return jsonResponse({ error: 'Internal server error' }, 500, req)
  }
})
