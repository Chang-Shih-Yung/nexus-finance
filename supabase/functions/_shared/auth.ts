import { createClient } from 'npm:@supabase/supabase-js@2'

export async function requireAuth(req: Request): Promise<void> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw Object.assign(new Error('未授權，請先登入'), { status: 401 })
  }

  const token = authHeader.slice(7)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    throw Object.assign(new Error('Token 無效或已過期，請重新登入'), { status: 401 })
  }
}
