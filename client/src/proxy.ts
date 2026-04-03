import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY) {
    console.error('[proxy] Missing Supabase env vars — skipping auth check')
    return NextResponse.next({ request })
  }
  return await updateSession(request)
}

export const config = {
  matcher: [
    // Next.js requires this matcher to be a statically analyzable literal.
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
