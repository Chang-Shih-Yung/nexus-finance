-- Consolidated AI helpers extracted from the v1→v11 iteration history.
--
-- This migration replaces the following deleted files, which were all
-- iterations of the Groq-era nf_ai_ask that are now superseded by
-- v12 (Gemma 4) in 20260410003200_ai_ask_v12_gemma.sql:
--
--   20260410000400_ai_ask_rpc.sql              (v1)
--   20260410000500_ai_ask_timeout_fix.sql
--   20260410000600_ai_ask_longer_poll.sql
--   20260410000700_ai_ask_inline_timeout.sql
--   20260410000800_authenticated_role_timeout.sql
--   20260410000900_ai_ask_sync_http.sql
--   20260410001000_ai_ask_v2_ux.sql            (defined nf_today_snapshot + nf_mask_pii)
--   20260410001100_ai_ask_v3_no_placeholders.sql
--   20260410001200_ai_ask_v4_friendly_errors.sql
--   20260410001300_batch2_data_quality.sql     (defined nf_recent_transactions fix + data cleanup)
--   20260410001400_ai_ask_verbose_429.sql
--   20260410001401_ai_ask_verbose_429_fix.sql
--   20260410001500_ai_ask_v6_slim_prompt_model_param.sql
--   20260410001600_ai_ask_v6_propagate_auth_context.sql
--   20260410001700_ai_ask_v7_single_model.sql
--   20260410001800_ai_ask_v8_no_hallucination.sql
--   20260410001900_ai_ask_v9_fallback_quota.sql
--   20260410002000_ai_ask_v10_8b_compat_prompt.sql
--   20260410002200_ai_ask_v11_int_params_no_digits.sql
--
-- What survives from that pile and lands here:
--   1. nf_today_snapshot()      — KPI card RPC used by the AI assistant
--   2. nf_mask_pii(jsonb)       — PII masking helper, called by nf_ai_ask v12
--   3. nf_recent_transactions() — the v5 version that excludes future-dated rows
--   4. data-quality fixes       — channel pollution cleanup + pending-tx timestamp
--                                 stagger, both idempotent and keyed off row id

-- ── 1. nf_today_snapshot() ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.nf_today_snapshot()
RETURNS TABLE (
  snapshot_date  DATE,
  login_count    NUMERIC,
  active_users   NUMERIC,
  txn_count      NUMERIC,
  txn_amount     NUMERIC,
  success_rate   NUMERIC,
  error_count    NUMERIC,
  as_of          TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    CURRENT_DATE AS snapshot_date,
    COALESCE(MAX(CASE WHEN metric_key = 'login_count'  THEN metric_value END), 0) AS login_count,
    COALESCE(MAX(CASE WHEN metric_key = 'active_users' THEN metric_value END), 0) AS active_users,
    COALESCE(MAX(CASE WHEN metric_key = 'txn_count'    THEN metric_value END), 0) AS txn_count,
    COALESCE(MAX(CASE WHEN metric_key = 'txn_amount'   THEN metric_value END), 0) AS txn_amount,
    COALESCE(MAX(CASE WHEN metric_key = 'success_rate' THEN metric_value END), 0) AS success_rate,
    COALESCE(MAX(CASE WHEN metric_key = 'error_count'  THEN metric_value END), 0) AS error_count,
    NOW() AS as_of
  FROM daily_snapshots
  WHERE date = CURRENT_DATE
    AND dimension = 'total'
    AND dimension_value = '_all';
END;
$$;

GRANT EXECUTE ON FUNCTION public.nf_today_snapshot TO authenticated;

-- ── 2. nf_mask_pii(jsonb) ─────────────────────────────────────
-- Walks a jsonb array of result rows and masks customer-facing PII
-- fields in place. Returns the masked array.
--   user_name     "王小明"      → "王**"
--   from_account  "1234567890"  → "****7890"
--   to_account    "1234567890"  → "****7890"
-- Idempotent and null-safe. Non-array input is returned unchanged.
CREATE OR REPLACE FUNCTION public.nf_mask_pii(p_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_result     jsonb := '[]'::jsonb;
  v_row        jsonb;
  v_masked_row jsonb;
  v_key        text;
  v_val        jsonb;
  v_text       text;
BEGIN
  IF p_data IS NULL OR jsonb_typeof(p_data) <> 'array' THEN
    RETURN p_data;
  END IF;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_data) LOOP
    v_masked_row := v_row;

    FOR v_key, v_val IN SELECT * FROM jsonb_each(v_row) LOOP
      IF jsonb_typeof(v_val) <> 'string' THEN
        CONTINUE;
      END IF;

      v_text := v_val #>> '{}';
      IF v_text IS NULL OR v_text = '' THEN
        CONTINUE;
      END IF;

      IF v_key = 'user_name' THEN
        v_masked_row := jsonb_set(
          v_masked_row,
          ARRAY[v_key],
          to_jsonb(LEFT(v_text, 1) || '**')
        );
      ELSIF v_key IN ('from_account', 'to_account') THEN
        v_masked_row := jsonb_set(
          v_masked_row,
          ARRAY[v_key],
          to_jsonb('****' || RIGHT(v_text, 4))
        );
      END IF;
    END LOOP;

    v_result := v_result || jsonb_build_array(v_masked_row);
  END LOOP;

  RETURN v_result;
END;
$$;

-- ── 3. nf_recent_transactions(p_limit) ───────────────────────
-- v5 variant: excludes future-dated rows so "recent" means
-- "already happened". Pending upcoming payments have their own
-- RPC (nf_pending_transactions).
CREATE OR REPLACE FUNCTION public.nf_recent_transactions(p_limit INT DEFAULT 10)
RETURNS TABLE (
  id           INT,
  user_name    VARCHAR,
  amount       NUMERIC,
  currency     VARCHAR,
  from_account VARCHAR,
  to_account   VARCHAR,
  status       tx_status,
  category     VARCHAR,
  channel      VARCHAR,
  created_at   TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    t.id,
    u.name       AS user_name,
    t.amount,
    t.currency,
    t.from_account,
    t.to_account,
    t.status,
    COALESCE(t.category, 'transfer') AS category,
    t.channel,
    t.created_at
  FROM transactions t
  JOIN users u ON u.id = t.user_id
  WHERE t.created_at <= NOW()
  ORDER BY t.created_at DESC
  LIMIT p_limit;
$$;

-- ── 4. Data-quality fixups ────────────────────────────────────
-- (a) Replace the 'rich-seed-v1' dev marker that leaked into
--     transactions.channel with a realistic channel mix.
UPDATE transactions
SET channel = CASE
    WHEN (id % 100) = 0                THEN 'branch'
    WHEN (id % 100) <  45              THEN 'web'
    WHEN (id % 100) <  80              THEN 'mobile'
    WHEN (id % 100) <  92              THEN 'atm'
    ELSE                                    'branch'
  END
WHERE channel = 'rich-seed-v1';

-- (b) Re-stagger pending-transaction timestamps across business
--     hours so they don't all share the same HH:MM. Deterministic
--     hash-based so re-runs are stable.
UPDATE transactions t
SET created_at =
  date_trunc('day', t.created_at)
  + make_interval(
      hours => 9 + ((abs(hashtextextended(t.id::text, 0)) % 9)::int),
      mins  => (abs(hashtextextended(t.id::text, 1)) % 60)::int,
      secs  => (abs(hashtextextended(t.id::text, 2)) % 60)::int
    )
WHERE t.status = 'pending'
  AND t.created_at > NOW();
