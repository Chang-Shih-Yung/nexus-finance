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
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 200)

  try {
    const db = getDb()
    const rows = await db`
      SELECT t.id, u.name AS user_name, u.tier, t.amount, t.currency,
             t.from_account, t.to_account, t.error_code, t.error_message,
             t.channel, t.created_at
      FROM transactions t
      JOIN users u ON u.id = t.user_id
      WHERE t.status = 'failed'
      ORDER BY t.created_at DESC
      LIMIT ${limit}
    `
    return jsonResponse(rows, 200, req)
  } catch (e: any) {
    console.error('[stats-failed-transactions]', e.message)
    return jsonResponse({ error: 'Internal server error' }, 500, req)
  }
})
