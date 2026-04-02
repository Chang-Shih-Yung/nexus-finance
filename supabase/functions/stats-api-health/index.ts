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
  const minutes = Math.min(parseInt(url.searchParams.get('minutes') ?? '60', 10), 1440)

  try {
    const db = getDb()
    const rows = await db`
      SELECT
        date_trunc('minute', created_at) AS minute,
        ROUND(AVG(response_time_ms)::numeric, 2) AS avg_latency,
        COUNT(*) AS total_requests,
        COUNT(*) FILTER (WHERE status_code >= 500) AS error_count,
        ROUND(COUNT(*) FILTER (WHERE status_code >= 500) * 100.0 / NULLIF(COUNT(*),0), 2) AS error_rate
      FROM api_logs
      WHERE created_at >= NOW() - (${minutes.toString()} || ' minutes')::INTERVAL
      GROUP BY date_trunc('minute', created_at)
      ORDER BY minute
    `
    return jsonResponse(rows, 200, req)
  } catch (e: any) {
    console.error('[stats-api-health]', e.message)
    return jsonResponse({ error: 'Internal server error' }, 500, req)
  }
})
