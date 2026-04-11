'use client'

import { invokeRpc } from '@/lib/rpc'

// Mirror of public.nf_ai_config rows as returned by nf_ai_config_list().
export type AiConfigValueType = 'int' | 'numeric' | 'bool' | 'text'

export interface AiConfigRow {
  key: string
  value: string
  value_type: AiConfigValueType
  description: string | null
  updated_at: string
}

// Thin wrappers around the two UI-facing RPCs. The panel treats a failed
// `setAiConfig` as a signal to flip into read-only mode — browser clients
// authenticate with the `authenticated` role, not `service_role`, so the
// write will raise insufficient_privilege on purpose unless the backend
// is called with the service key.
export async function listAiConfig(): Promise<AiConfigRow[]> {
  return invokeRpc<AiConfigRow[]>('nf_ai_config_list')
}

export async function setAiConfig(
  key: string,
  value: string,
): Promise<AiConfigRow> {
  // RPC returns a composite row; Supabase wraps it as an object.
  const row = await invokeRpc<AiConfigRow | AiConfigRow[]>('nf_ai_config_set', {
    p_key: key,
    p_value: value,
  })
  return Array.isArray(row) ? row[0] : row
}
