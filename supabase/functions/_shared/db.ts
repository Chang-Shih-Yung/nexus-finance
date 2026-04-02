import postgres from 'npm:postgres'

// 使用 Supabase 內建的 SUPABASE_DB_URL（直連 PostgreSQL）
// Edge Function 環境下必須設定 prepare: false
let _db: ReturnType<typeof postgres> | null = null

export function getDb(): ReturnType<typeof postgres> {
  if (!_db) {
    _db = postgres(Deno.env.get('SUPABASE_DB_URL')!, {
      prepare: false,
      ssl: 'require',
      max: 3,
    })
  }
  return _db
}
