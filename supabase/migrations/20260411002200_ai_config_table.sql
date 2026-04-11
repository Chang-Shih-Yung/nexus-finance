-- ============================================================================
-- nf_ai_config — centralised tunables for the AI pipeline.
--
-- Rationale:
--   nf_ai_ask and nf_ai_ask_deep both hardcode a handful of knobs:
--     - model name (gemma-4-26b-a4b-it)
--     - HTTP timeouts (90s / 50s / 100s)
--     - maxOutputTokens (512 / 200)
--     - temperature (0.1 / 0.2)
--     - data_blob char cap (3000)
--     - deep row cap (20)
--
--   Every time we want to tune one of these we have to open the big
--   CREATE OR REPLACE body and re-deploy the whole function. That's slow,
--   risks unrelated diff noise, and makes A/B experiments painful.
--
--   This migration adds a tiny key/value table + two typed getter helpers.
--   It does NOT modify nf_ai_ask or nf_ai_ask_deep — consumption is deferred
--   to Wave 5 (helper extraction) so Wave 4 is purely additive and cannot
--   break the live functions.
--
-- Safety:
--   - Purely additive: new table, new rows, new functions.
--   - Helpers are STABLE + SECURITY DEFINER with locked search_path.
--   - Defaults passed by callers so a missing row never breaks a call.
-- ============================================================================

-- ── Table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.nf_ai_config (
  key          text PRIMARY KEY,
  value        text NOT NULL,
  value_type   text NOT NULL CHECK (value_type IN ('int', 'text', 'numeric', 'bool')),
  description  text,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.nf_ai_config IS
'Centralised tunables for nf_ai_ask / nf_ai_ask_deep. Key/value with a
type tag so getters can cast safely. Rows are seeded by this migration;
update via UPDATE statements (not migrations) for runtime tuning.';

-- RLS: service_role only. Regular users have no business reading model
-- names or timeout budgets, and the SECURITY DEFINER helpers will see
-- the rows regardless of the caller's role.
ALTER TABLE public.nf_ai_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nf_ai_config_service_role_all ON public.nf_ai_config;
CREATE POLICY nf_ai_config_service_role_all
  ON public.nf_ai_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Seed defaults ──────────────────────────────────────────────────
-- Matches the current hardcoded values in the consolidated baseline so
-- switching to getter-based consumption later is a pure no-op swap.
INSERT INTO public.nf_ai_config (key, value, value_type, description) VALUES
  ('ask.model_call1',        'gemma-4-26b-a4b-it', 'text',
   'Model for Call 1 (tool dispatch) in nf_ai_ask.'),
  ('ask.model_call2',        'gemma-4-26b-a4b-it', 'text',
   'Model for Call 2 (narration) in nf_ai_ask.'),
  ('ask.timeout_call1_ms',   '90000',              'int',
   'curl CURLOPT_TIMEOUT_MS for Call 1.'),
  ('ask.timeout_call2_ms',   '50000',              'int',
   'curl CURLOPT_TIMEOUT_MS for Call 2 (lowered before the shot).'),
  ('ask.max_tokens_call1',   '512',                'int',
   'generationConfig.maxOutputTokens for Call 1.'),
  ('ask.max_tokens_call2',   '200',                'int',
   'generationConfig.maxOutputTokens for Call 2.'),
  ('ask.temperature_call1',  '0.1',                'numeric',
   'generationConfig.temperature for Call 1.'),
  ('ask.temperature_call2',  '0.2',                'numeric',
   'generationConfig.temperature for Call 2.'),
  ('deep.model',             'gemma-4-26b-a4b-it', 'text',
   'Model for nf_ai_ask_deep.'),
  ('deep.timeout_ms',        '100000',             'int',
   'curl CURLOPT_TIMEOUT_MS for the single deep call.'),
  ('deep.max_tokens',        '200',                'int',
   'generationConfig.maxOutputTokens for deep.'),
  ('deep.temperature',       '0.2',                'numeric',
   'generationConfig.temperature for deep.'),
  ('deep.max_rows',          '20',                 'int',
   'Max rows from p_data fed into the deep prompt (truncated above this).'),
  ('deep.data_blob_chars',   '3000',               'int',
   'Max chars of the masked JSON blob in the deep prompt.')
ON CONFLICT (key) DO NOTHING;

-- Keep updated_at honest on manual tuning.
CREATE OR REPLACE FUNCTION public.nf_ai_config_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS nf_ai_config_updated_at ON public.nf_ai_config;
CREATE TRIGGER nf_ai_config_updated_at
  BEFORE UPDATE ON public.nf_ai_config
  FOR EACH ROW
  EXECUTE FUNCTION public.nf_ai_config_touch_updated_at();

-- ── Typed getters ──────────────────────────────────────────────────
-- All getters take a default so a missing row falls back instead of
-- crashing the AI pipeline. SECURITY DEFINER so RLS doesn't block them
-- when called by authenticated users via nf_ai_ask.

CREATE OR REPLACE FUNCTION public.nf_ai_config_get_text(
  p_key     text,
  p_default text
)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT value FROM public.nf_ai_config WHERE key = p_key AND value_type = 'text'),
    p_default
  );
$$;

CREATE OR REPLACE FUNCTION public.nf_ai_config_get_int(
  p_key     text,
  p_default int
)
RETURNS int
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw text;
  v_out int;
BEGIN
  SELECT value INTO v_raw
  FROM public.nf_ai_config
  WHERE key = p_key AND value_type = 'int';

  IF v_raw IS NULL THEN RETURN p_default; END IF;

  BEGIN
    v_out := v_raw::int;
  EXCEPTION WHEN OTHERS THEN
    RETURN p_default;
  END;
  RETURN v_out;
END;
$$;

CREATE OR REPLACE FUNCTION public.nf_ai_config_get_numeric(
  p_key     text,
  p_default numeric
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw text;
  v_out numeric;
BEGIN
  SELECT value INTO v_raw
  FROM public.nf_ai_config
  WHERE key = p_key AND value_type = 'numeric';

  IF v_raw IS NULL THEN RETURN p_default; END IF;

  BEGIN
    v_out := v_raw::numeric;
  EXCEPTION WHEN OTHERS THEN
    RETURN p_default;
  END;
  RETURN v_out;
END;
$$;

COMMENT ON FUNCTION public.nf_ai_config_get_text(text, text) IS
'Typed getter for nf_ai_config. Falls back to p_default on missing row.';
COMMENT ON FUNCTION public.nf_ai_config_get_int(text, int) IS
'Typed getter for nf_ai_config with safe cast + default fallback.';
COMMENT ON FUNCTION public.nf_ai_config_get_numeric(text, numeric) IS
'Typed getter for nf_ai_config with safe cast + default fallback.';

-- Helpers are safe for authenticated callers (read-only, defaults handled).
GRANT EXECUTE ON FUNCTION public.nf_ai_config_get_text(text, text)       TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.nf_ai_config_get_int(text, int)         TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.nf_ai_config_get_numeric(text, numeric) TO authenticated, service_role;
