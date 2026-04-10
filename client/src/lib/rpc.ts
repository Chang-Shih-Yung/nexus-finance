'use client'

import { createClient } from '@/lib/supabase/client'

export type RpcParams = Record<string, unknown>

export async function invokeRpc<T>(name: string, params?: RpcParams): Promise<T> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc(name, params ?? {})
  if (error) throw new Error(error.message)
  return data as T
}
