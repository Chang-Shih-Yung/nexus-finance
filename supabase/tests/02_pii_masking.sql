-- ============================================================================
-- A Layer — PII masking correctness
--
-- Verifies nf_mask_name and nf_mask_account produce expected outputs.
-- These are IMMUTABLE pure functions — no network, no side effects.
-- ============================================================================

CREATE OR REPLACE FUNCTION pg_temp.assert_eq(
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

-- ── nf_mask_name ─────────────────────────────────────────────────

SELECT pg_temp.assert_eq('mask_name(王小明)',
  public.nf_mask_name('王小明'), '王**');

SELECT pg_temp.assert_eq('mask_name(A)',
  public.nf_mask_name('A'), 'A**');

SELECT pg_temp.assert_eq('mask_name(empty)',
  public.nf_mask_name(''), '');

SELECT pg_temp.assert_eq('mask_name(null)',
  public.nf_mask_name(NULL), NULL);

-- ── nf_mask_account ──────────────────────────────────────────────

SELECT pg_temp.assert_eq('mask_account(1234567890)',
  public.nf_mask_account('1234567890'), '****7890');

SELECT pg_temp.assert_eq('mask_account(1234)',
  public.nf_mask_account('1234'), '****');

SELECT pg_temp.assert_eq('mask_account(12)',
  public.nf_mask_account('12'), '****');

SELECT pg_temp.assert_eq('mask_account(empty)',
  public.nf_mask_account(''), '');

SELECT pg_temp.assert_eq('mask_account(null)',
  public.nf_mask_account(NULL), NULL);

SELECT 'A-layer 02_pii_masking: ALL PASSED' AS result;
