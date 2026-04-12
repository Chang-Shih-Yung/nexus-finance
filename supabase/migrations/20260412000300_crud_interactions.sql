-- ============================================================================
-- Dashboard CRUD Interactions
-- 1. Failed transaction review (mark as processed + notes)
-- 2. Anomaly acknowledge
-- 3. Customer tier adjustment with audit trail
-- ============================================================================

-- ── 1. Failed Transaction Review ────────────────────────────────────────────

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS reviewed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by   TEXT,
  ADD COLUMN IF NOT EXISTS review_note   TEXT;

CREATE INDEX IF NOT EXISTS idx_tx_reviewed ON transactions(reviewed_at)
  WHERE reviewed_at IS NOT NULL;

-- RPC: mark a failed transaction as reviewed
CREATE OR REPLACE FUNCTION public.nf_review_failed_transaction(
  p_tx_id    INT,
  p_note     TEXT DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row transactions%ROWTYPE;
BEGIN
  -- Validate
  IF p_tx_id IS NULL THEN
    RETURN jsonb_build_object('error', 'missing_tx_id');
  END IF;

  SELECT * INTO v_row FROM transactions WHERE id = p_tx_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'tx_not_found');
  END IF;

  IF v_row.status != 'failed' THEN
    RETURN jsonb_build_object('error', 'not_a_failed_tx');
  END IF;

  IF v_row.reviewed_at IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'already_reviewed');
  END IF;

  UPDATE transactions
  SET reviewed_at  = NOW(),
      reviewed_by  = COALESCE(current_setting('request.jwt.claim.email', true), 'system'),
      review_note  = NULLIF(TRIM(p_note), '')
  WHERE id = p_tx_id;

  RETURN jsonb_build_object('ok', true, 'tx_id', p_tx_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.nf_review_failed_transaction(INT, TEXT) TO authenticated, service_role;

-- ── 2. Anomaly Acknowledgement ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS anomaly_acks (
  id           SERIAL PRIMARY KEY,
  metric_key   VARCHAR(50)  NOT NULL,
  dimension    VARCHAR(50)  NOT NULL DEFAULT 'total',
  dim_value    VARCHAR(100) NOT NULL DEFAULT '_all',
  ack_date     DATE         NOT NULL DEFAULT CURRENT_DATE,
  acked_by     TEXT,
  note         TEXT,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(metric_key, dimension, dim_value, ack_date)
);

ALTER TABLE anomaly_acks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_public_anomaly_acks" ON anomaly_acks FOR ALL USING (false);

-- RPC: acknowledge an anomaly
CREATE OR REPLACE FUNCTION public.nf_acknowledge_anomaly(
  p_metric_key  TEXT,
  p_dimension   TEXT DEFAULT 'total',
  p_dim_value   TEXT DEFAULT '_all',
  p_note        TEXT DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_metric_key IS NULL OR p_metric_key = '' THEN
    RETURN jsonb_build_object('error', 'missing_metric_key');
  END IF;

  INSERT INTO anomaly_acks (metric_key, dimension, dim_value, acked_by, note)
  VALUES (
    p_metric_key,
    COALESCE(NULLIF(p_dimension, ''), 'total'),
    COALESCE(NULLIF(p_dim_value, ''), '_all'),
    COALESCE(current_setting('request.jwt.claim.email', true), 'system'),
    NULLIF(TRIM(p_note), '')
  )
  ON CONFLICT (metric_key, dimension, dim_value, ack_date) DO UPDATE
    SET acked_by   = EXCLUDED.acked_by,
        note       = EXCLUDED.note,
        created_at = NOW();

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.nf_acknowledge_anomaly(TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- RPC: list today's acknowledged anomalies
CREATE OR REPLACE FUNCTION public.nf_anomaly_acks_today()
RETURNS SETOF anomaly_acks
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM anomaly_acks WHERE ack_date = CURRENT_DATE;
$$;

GRANT EXECUTE ON FUNCTION public.nf_anomaly_acks_today() TO authenticated, service_role;

-- ── 3. Customer Tier Adjustment ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tier_audit_log (
  id           SERIAL PRIMARY KEY,
  user_id      INT          NOT NULL REFERENCES users(id),
  old_tier     user_tier    NOT NULL,
  new_tier     user_tier    NOT NULL,
  changed_by   TEXT,
  reason       TEXT,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tier_audit_user ON tier_audit_log(user_id, created_at DESC);

ALTER TABLE tier_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_public_tier_audit" ON tier_audit_log FOR ALL USING (false);

-- RPC: update a user's tier with audit trail
CREATE OR REPLACE FUNCTION public.nf_update_user_tier(
  p_user_id   INT,
  p_new_tier  TEXT,
  p_reason    TEXT DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_tier user_tier;
  v_new     user_tier;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'missing_user_id');
  END IF;

  -- Validate tier value
  BEGIN
    v_new := p_new_tier::user_tier;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN jsonb_build_object('error', 'invalid_tier', 'valid', ARRAY['general','vip','premium']);
  END;

  SELECT tier INTO v_old_tier FROM users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'user_not_found');
  END IF;

  IF v_old_tier = v_new THEN
    RETURN jsonb_build_object('error', 'same_tier');
  END IF;

  -- Update + audit
  UPDATE users SET tier = v_new WHERE id = p_user_id;

  INSERT INTO tier_audit_log (user_id, old_tier, new_tier, changed_by, reason)
  VALUES (
    p_user_id,
    v_old_tier,
    v_new,
    COALESCE(current_setting('request.jwt.claim.email', true), 'system'),
    NULLIF(TRIM(p_reason), '')
  );

  RETURN jsonb_build_object('ok', true, 'old_tier', v_old_tier::text, 'new_tier', v_new::text);
END;
$$;

GRANT EXECUTE ON FUNCTION public.nf_update_user_tier(INT, TEXT, TEXT) TO authenticated, service_role;

-- RPC: get user detail for tier editing
CREATE OR REPLACE FUNCTION public.nf_user_detail(p_user_id INT)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', u.id,
    'name', nf_mask_name(u.name),
    'email', u.email,
    'tier', u.tier,
    'branch', u.branch,
    'rm_name', u.rm_name,
    'created_at', u.created_at,
    'tx_count', (SELECT count(*) FROM transactions t WHERE t.user_id = u.id),
    'tx_total', (SELECT COALESCE(sum(t.amount), 0) FROM transactions t WHERE t.user_id = u.id AND t.status = 'success')
  )
  FROM users u
  WHERE u.id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.nf_user_detail(INT) TO authenticated, service_role;
