-- AI assistant v12 (Gemma 4) — foundation tables.
--
-- Replaces the prompt-hardcoded RPC whitelist (v11) with a pg_proc-derived
-- catalog that auto-syncs from COMMENT ON FUNCTION. Also adds a slim
-- error-log table so failures are inspectable without grepping postgres logs.
--
-- Design notes locked in this session:
--   * Fail-open auto-sync (new nf_* function → available to AI by default)
--   * Write-intent naming safeguard (nf_generate_/set_/insert_/... → disabled)
--   * No ai_model_state table — single model, no fallback chain to track

CREATE TABLE IF NOT EXISTS public.ai_function_catalog (
  name              text PRIMARY KEY,
  description_zh    text NOT NULL DEFAULT '(待補充)',
  category          text,
  returns_shape     text,                            -- row_set | single_row | write
  example_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  enabled           boolean NOT NULL DEFAULT true,
  signature_hint    text,                            -- from pg_get_function_arguments
  last_synced_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ai_function_catalog IS
  'AI tool catalog synced from pg_proc + COMMENT ON FUNCTION by nf_ai_catalog_sync(). Operator-edited enabled flag is preserved across syncs.';

ALTER TABLE public.ai_function_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_public_ai_function_catalog" ON public.ai_function_catalog;
CREATE POLICY "deny_public_ai_function_catalog"
  ON public.ai_function_catalog
  FOR ALL
  USING (false);

CREATE TABLE IF NOT EXISTS public.ai_ask_errors (
  id               bigserial PRIMARY KEY,
  occurred_at      timestamptz NOT NULL DEFAULT now(),
  question         text NOT NULL,
  error_category   text NOT NULL,                   -- quota|schema_drift|empty_data|llm_format|dispatch_error|unknown
  error_code       text,
  debug_reason     text,
  model            text,
  rpc_attempted    text,
  params_attempted jsonb
);

COMMENT ON TABLE public.ai_ask_errors IS
  'Error ledger for nf_ai_ask. One row per failed invocation. Written by nf_ai_ask (SECURITY DEFINER) and not exposed via RLS.';

CREATE INDEX IF NOT EXISTS idx_ai_ask_errors_occurred_at
  ON public.ai_ask_errors (occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_ask_errors_category
  ON public.ai_ask_errors (error_category, occurred_at DESC);

ALTER TABLE public.ai_ask_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_public_ai_ask_errors" ON public.ai_ask_errors;
CREATE POLICY "deny_public_ai_ask_errors"
  ON public.ai_ask_errors
  FOR ALL
  USING (false);
