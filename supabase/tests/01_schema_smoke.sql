-- ============================================================================
-- A Layer — Schema & function existence smoke
--
-- Asserts that critical AI / config functions exist with the correct
-- signatures and grants. Zero network calls, zero cost.
-- ============================================================================

-- Helper: assert a function exists with the expected arg types.
-- Usage: SELECT assert_fn_exists('nf_ai_ask', ARRAY['text']);
CREATE OR REPLACE FUNCTION pg_temp.assert_fn_exists(
  p_name  text,
  p_args  text[]
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = p_name
      AND p.pronargs = COALESCE(array_length(p_args, 1), 0)
  ) THEN
    RAISE EXCEPTION 'ASSERT FAIL: function public.%(%) does not exist',
      p_name, array_to_string(p_args, ', ');
  END IF;
END;
$$;

-- Helper: assert a table exists.
CREATE OR REPLACE FUNCTION pg_temp.assert_table_exists(
  p_name text
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = p_name
  ) THEN
    RAISE EXCEPTION 'ASSERT FAIL: table public.% does not exist', p_name;
  END IF;
END;
$$;

-- ── AI functions ─────────────────────────────────────────────────

-- nf_ai_ask(text) → jsonb
SELECT pg_temp.assert_fn_exists('nf_ai_ask', ARRAY['text']);

-- nf_ai_ask_deep(text, text, jsonb) → jsonb
SELECT pg_temp.assert_fn_exists('nf_ai_ask_deep', ARRAY['text','text','jsonb']);

-- ── Config functions ─────────────────────────────────────────────

-- nf_ai_config_list() → setof record
SELECT pg_temp.assert_fn_exists('nf_ai_config_list', ARRAY[]::text[]);

-- nf_ai_config_set(text, text) → record
SELECT pg_temp.assert_fn_exists('nf_ai_config_set', ARRAY['text','text']);

-- Typed getters
SELECT pg_temp.assert_fn_exists('nf_ai_config_get_int',     ARRAY['text','int']);
SELECT pg_temp.assert_fn_exists('nf_ai_config_get_numeric', ARRAY['text','numeric']);
SELECT pg_temp.assert_fn_exists('nf_ai_config_get_text',    ARRAY['text','text']);

-- ── PII masking functions ────────────────────────────────────────

SELECT pg_temp.assert_fn_exists('nf_mask_name',    ARRAY['text']);
SELECT pg_temp.assert_fn_exists('nf_mask_account', ARRAY['text']);

-- ── Tables ───────────────────────────────────────────────────────

SELECT pg_temp.assert_table_exists('nf_ai_config');
SELECT pg_temp.assert_table_exists('ai_ask_errors');

-- ── Config seed count ────────────────────────────────────────────
-- If someone adds a key, bump this number. If someone deletes one
-- by accident, this will catch it.

DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.nf_ai_config;
  IF v_count <> 14 THEN
    RAISE EXCEPTION 'ASSERT FAIL: nf_ai_config has % rows (expected 14)', v_count;
  END IF;
END;
$$;

-- ── ai_ask_errors RLS is enabled ─────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'ai_ask_errors'
      AND c.relrowsecurity = true
  ) THEN
    RAISE EXCEPTION 'ASSERT FAIL: ai_ask_errors does not have RLS enabled';
  END IF;
END;
$$;

SELECT 'A-layer 01_schema_smoke: ALL PASSED' AS result;
