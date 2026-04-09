'use client'

import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

type RpcParams = Record<string, unknown>

async function invokeRpc<T>(name: string, params?: RpcParams): Promise<T> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc(name, params ?? {})
  if (error) throw new Error(error.message)
  return data as T
}

export function useRpc<T>(
  key: string[],
  rpcName: string,
  params?: RpcParams,
  options?: Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<T, Error>({
    queryKey: key,
    queryFn: () => invokeRpc<T>(rpcName, params),
    ...options,
  })
}
