-- ============================================================================
-- A Layer — AI config getters
--
-- Verifies the typed getter functions return the correct seed values
-- and fall back to defaults for unknown keys.
-- ============================================================================

CREATE OR REPLACE FUNCTION pg_temp.assert_int_eq(
  p_label    text,
  p_actual   int,
  p_expected int
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_actual IS DISTINCT FROM p_expected THEN
    RAISE EXCEPTION 'ASSERT FAIL [%]: got % expected %',
      p_label, p_actual, p_expected;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.assert_text_eq(
  p_label    text,
  p_actual   text,
  p_expected text
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_actual IS DISTINCT FROM p_expected THEN
    RAISE EXCEPTION 'ASSERT FAIL [%]: got "%" expected "%"',
      p_label, p_actual, p_expected;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.assert_numeric_eq(
  p_label    text,
  p_actual   numeric,
  p_expected numeric
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_actual IS DISTINCT FROM p_expected THEN
    RAISE EXCEPTION 'ASSERT FAIL [%]: got % expected %',
      p_label, p_actual, p_expected;
  END IF;
END;
$$;

-- ── Getter returns seeded value ──────────────────────────────────

SELECT pg_temp.assert_int_eq(
  'get_int(deep.max_rows)',
  public.nf_ai_config_get_int('deep.max_rows', 99),
  8  -- seeded value after Wave 5 UPDATE
);

SELECT pg_temp.assert_int_eq(
  'get_int(deep.max_tokens)',
  public.nf_ai_config_get_int('deep.max_tokens', 99),
  120
);

SELECT pg_temp.assert_int_eq(
  'get_int(deep.timeout_ms)',
  public.nf_ai_config_get_int('deep.timeout_ms', 99),
  55000
);

SELECT pg_temp.assert_text_eq(
  'get_text(deep.model)',
  public.nf_ai_config_get_text('deep.model', 'fallback'),
  'gemma-4-26b-a4b-it'
);

SELECT pg_temp.assert_numeric_eq(
  'get_numeric(deep.temperature)',
  public.nf_ai_config_get_numeric('deep.temperature', 99.0),
  0.2
);

-- ── Getter falls back for unknown key ────────────────────────────

SELECT pg_temp.assert_int_eq(
  'get_int(nonexistent) falls back',
  public.nf_ai_config_get_int('nonexistent.key', 42),
  42
);

SELECT pg_temp.assert_text_eq(
  'get_text(nonexistent) falls back',
  public.nf_ai_config_get_text('nonexistent.key', 'default'),
  'default'
);

SELECT pg_temp.assert_numeric_eq(
  'get_numeric(nonexistent) falls back',
  public.nf_ai_config_get_numeric('nonexistent.key', 3.14),
  3.14
);

-- ── nf_ai_config_list returns 14 rows ────────────────────────────

DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.nf_ai_config_list();
  IF v_count <> 14 THEN
    RAISE EXCEPTION 'ASSERT FAIL: nf_ai_config_list() returned % rows (expected 14)', v_count;
  END IF;
END;
$$;

SELECT 'A-layer 03_ai_config: ALL PASSED' AS result;
