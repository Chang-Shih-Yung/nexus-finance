import { handleCors, jsonResponse } from '../_shared/cors.ts'
import { requireAuth } from '../_shared/auth.ts'
import { getDb } from '../_shared/db.ts'

const VALID_TYPES = [
  'login', 'logout', 'transfer_init', 'transfer_success',
  'transfer_failed', 'click', 'view_account', 'view_statement',
]

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    await requireAuth(req)
  } catch (e: any) {
    return jsonResponse({ error: e.message }, e.status ?? 401, req)
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method Not Allowed' }, 405, req)
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, req)
  }

  const { userId, eventType, metadata } = body

  if (!userId || !eventType) {
    return jsonResponse({ error: 'userId and eventType are required' }, 400, req)
  }

  if (metadata !== undefined) {
    const metadataStr = JSON.stringify(metadata)
    if (metadataStr.length > 10_240) {
      return jsonResponse({ error: 'metadata 超過大小限制（最大 10KB）' }, 400, req)
    }
  }

  if (!VALID_TYPES.includes(eventType)) {
    return jsonResponse(
      { error: `Invalid eventType. Must be one of: ${VALID_TYPES.join(', ')}` },
      400,
      req,
    )
  }

  try {
    const db = getDb()
    const rows = await db`
      INSERT INTO events (user_id, event_type, metadata)
      VALUES (${userId}, ${eventType}, ${JSON.stringify(metadata ?? {})})
      RETURNING id, created_at
    `
    return jsonResponse(rows[0], 201, req)
  } catch (e: any) {
    console.error('[log-event]', e.message)
    return jsonResponse({ error: 'Internal server error' }, 500, req)
  }
})
