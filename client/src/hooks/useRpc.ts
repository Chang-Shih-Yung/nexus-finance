'use client'

import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { invokeRpc, type RpcParams } from '@/lib/rpc'

export function useRpc<T>(
  key: string[],
  rpcName: string,
  params?: RpcParams,
  options?: Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<T, Error>({
    queryKey: key,
    queryFn: () => invokeRpc<T>(rpcName, params),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
    ...options,
  })
}
