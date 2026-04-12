-- ============================================================================
-- B Layer — AI function error path smoke
--
-- Both nf_ai_ask and nf_ai_ask_deep return JSON with error info on
-- failure (they do NOT raise exceptions). We verify:
--   1. The error_code / error field in the returned JSON
--   2. The ai_ask_errors ledger table gets rows inserted
-- ============================================================================

-- Helper: assert a jsonb result contains a key with a specific value.
CREATE OR REPLACE FUNCTION pg_temp.assert_json_field(
  p_label    text,
  p_result   jsonb,
  p_key      text,
  p_expected text
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_actual text;
BEGIN
  v_actual := p_result ->> p_key;
  IF v_actual IS DISTINCT FROM p_expected THEN
    RAISE EXCEPTION 'ASSERT FAIL [%]: $.% = "%" (expected "%")',
      p_label, p_key, COALESCE(v_actual, 'NULL'), p_expected;
  END IF;
END;
$$;

-- ── nf_ai_ask: missing API key ───────────────────────────────────
-- No vault secret in local instance → returns error_code = 'missing_api_key'

DO $$
DECLARE v_result jsonb;
BEGIN
  SELECT public.nf_ai_ask('今天成功率多少？') INTO v_result;
  PERFORM pg_temp.assert_json_field(
    'nf_ai_ask missing_api_key',
    v_result, 'error_code', 'missing_api_key'
  );
END;
$$;

-- ── nf_ai_ask_deep: empty question ──────────────────────────────
-- Returns JSON with error = 'missing_question'

DO $$
DECLARE v_result jsonb;
BEGIN
  SELECT public.nf_ai_ask_deep('', 'test_rpc', '[]'::jsonb) INTO v_result;
  PERFORM pg_temp.assert_json_field(
    'nf_ai_ask_deep missing_question',
    v_result, 'error', 'missing_question'
  );
END;
$$;

-- ── nf_ai_ask_deep: empty data ──────────────────────────────────

DO $$
DECLARE v_result jsonb;
BEGIN
  SELECT public.nf_ai_ask_deep('test question', 'test_rpc', '[]'::jsonb) INTO v_result;
  PERFORM pg_temp.assert_json_field(
    'nf_ai_ask_deep empty_data',
    v_result, 'error', 'empty_data'
  );
END;
$$;

-- ── nf_ai_ask_deep: no API key (past input validation) ──────────

DO $$
DECLARE v_result jsonb;
BEGIN
  SELECT public.nf_ai_ask_deep('test question', 'test_rpc', '[{"x":1}]'::jsonb) INTO v_result;
  PERFORM pg_temp.assert_json_field(
    'nf_ai_ask_deep missing_api_key',
    v_result, 'error', 'missing_api_key'
  );
END;
$$;

-- ── Verify ai_ask_errors ledger was written ──────────────────────
-- The calls above should have inserted error rows (proving the
-- INSERT INTO ai_ask_errors paths work).

DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.ai_ask_errors;
  IF v_count < 1 THEN
    RAISE EXCEPTION 'ASSERT FAIL: ai_ask_errors has 0 rows — error ledger INSERT is broken';
  END IF;
END;
$$;

SELECT 'B-layer 04_ai_error_paths: ALL PASSED' AS result;
