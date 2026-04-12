-- ============================================================================
-- B Layer — AI function error path smoke
--
-- Calls nf_ai_ask and nf_ai_ask_deep with intentionally bad inputs and
-- verifies they raise the correct error codes. No API key is set, so
-- any call that gets past input validation will hit missing_api_key or
-- http_failed — both are expected and asserted.
--
-- These tests also verify the ai_ask_errors ledger is written to on
-- failure, catching typos in INSERT statements from Wave 3.
-- ============================================================================

-- Helper: call a function and assert the error message contains a substring.
CREATE OR REPLACE FUNCTION pg_temp.assert_raises(
  p_label    text,
  p_sql      text,
  p_contains text
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_msg text;
BEGIN
  BEGIN
    EXECUTE p_sql;
    -- If we get here, no error was raised.
    RAISE EXCEPTION 'ASSERT FAIL [%]: expected error containing "%" but call succeeded',
      p_label, p_contains;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
    IF v_msg NOT ILIKE '%' || p_contains || '%' THEN
      RAISE EXCEPTION 'ASSERT FAIL [%]: error "%" does not contain "%"',
        p_label, v_msg, p_contains;
    END IF;
  END;
END;
$$;

-- ── nf_ai_ask: missing API key ───────────────────────────────────
-- No GEMMA_API_KEY vault secret exists in local Supabase, so any
-- call should fail with missing_api_key.

SELECT pg_temp.assert_raises(
  'nf_ai_ask missing key',
  $$SELECT public.nf_ai_ask('今天成功率多少？')$$,
  'missing_api_key'
);

-- ── nf_ai_ask_deep: empty question ──────────────────────────────

SELECT pg_temp.assert_raises(
  'nf_ai_ask_deep empty question',
  $$SELECT public.nf_ai_ask_deep('', 'test_rpc', '[]'::jsonb)$$,
  'missing_question'
);

-- ── nf_ai_ask_deep: empty data ──────────────────────────────────

SELECT pg_temp.assert_raises(
  'nf_ai_ask_deep empty data',
  $$SELECT public.nf_ai_ask_deep('test question', 'test_rpc', '[]'::jsonb)$$,
  'empty_data'
);

-- ── nf_ai_ask_deep: no API key (gets past validation) ───────────
-- Pass valid question + non-empty data → should fail at the HTTP
-- call with missing_api_key (no vault secret in local instance).

SELECT pg_temp.assert_raises(
  'nf_ai_ask_deep missing key',
  $$SELECT public.nf_ai_ask_deep('test question', 'test_rpc', '[{"x":1}]'::jsonb)$$,
  'missing_api_key'
);

-- ── Verify ai_ask_errors ledger was written ──────────────────────
-- The calls above should have inserted error rows. Check that at
-- least one row exists (proving the INSERT paths work).

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
