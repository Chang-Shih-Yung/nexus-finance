-- ============================================================================
-- Field-level PII masking — eliminate the call-site dependency on nf_mask_pii.
--
-- Background:
--   nf_ai_ask v13.5 line ~390 calls nf_mask_pii() on the entire RPC result
--   before sending it to the LLM, which protects the AI conversation path.
--   But four RPCs return user names + account numbers and could in principle
--   be called from places that forget to mask (frontend direct call, future
--   reports, ad-hoc dashboards). Defence-in-depth says: mask AT THE RPC, so
--   the unmasked value never leaves the function in the first place.
--
-- This migration adds two scalar helpers and updates the four leaky RPCs to
-- mask in their SELECT list. nf_mask_pii(jsonb) is kept as a belt-and-braces
-- second pass for any RPC that doesn't mask itself.
--
-- Affected RPCs:
--   - nf_recent_transactions     (was: 20260410002900)
--   - nf_pending_transactions    (was: 20260409000200)
--   - nf_customer_feedback_recent (was: 20260410000300)
--   - nf_fraud_alerts_list       (was: 20260410000300)
-- ============================================================================

-- ── Scalar PII helpers ──────────────────────────────────────────────
-- Same masking semantics as nf_mask_pii(jsonb): keep first char of name,
-- show last 4 of account. Both are NULL-safe and IMMUTABLE so they can be
-- inlined and indexed if needed.

CREATE OR REPLACE FUNCTION public.nf_mask_name(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_name IS NULL OR p_name = '' THEN p_name
    ELSE LEFT(p_name, 1) || '**'
  END;
$$;

COMMENT ON FUNCTION public.nf_mask_name(text) IS
'Field-level name masking: 王小明 → 王**. Used in nf_* RPCs that return customer names so PII is masked at the source.';

CREATE OR REPLACE FUNCTION public.nf_mask_account(p_account text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_account IS NULL OR p_account = '' THEN p_account
    WHEN length(p_account) <= 4 THEN '****'
    ELSE '****' || RIGHT(p_account, 4)
  END;
$$;

COMMENT ON FUNCTION public.nf_mask_account(text) IS
'Field-level account masking: 1234567890 → ****7890. Used in nf_* RPCs that return account numbers.';

-- Helpers exposed to all roles (read-only, IMMUTABLE, no privilege risk).
GRANT EXECUTE ON FUNCTION public.nf_mask_name(text)    TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.nf_mask_account(text) TO authenticated, anon, service_role;

-- ── nf_recent_transactions: mask user_name + account numbers ────────
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
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    public.nf_mask_name(u.name)::varchar       AS user_name,
    t.amount,
    t.currency,
    public.nf_mask_account(t.from_account)::varchar AS from_account,
    public.nf_mask_account(t.to_account)::varchar   AS to_account,
    t.status,
    COALESCE(t.category, 'transfer')           AS category,
    t.channel,
    t.created_at
  FROM transactions t
  JOIN users u ON u.id = t.user_id
  WHERE t.created_at <= NOW()
  ORDER BY t.created_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.nf_recent_transactions(INT) TO authenticated;

-- ── nf_pending_transactions: mask user_name ─────────────────────────
CREATE OR REPLACE FUNCTION public.nf_pending_transactions(p_limit INT DEFAULT 10)
RETURNS TABLE (
  id          INT,
  user_name   VARCHAR,
  amount      NUMERIC,
  currency    VARCHAR,
  category    VARCHAR,
  created_at  TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    public.nf_mask_name(u.name)::varchar AS user_name,
    t.amount,
    t.currency,
    COALESCE(t.category, 'transfer') AS category,
    t.created_at
  FROM transactions t
  JOIN users u ON u.id = t.user_id
  WHERE t.status = 'pending'
  ORDER BY t.created_at DESC
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION public.nf_pending_transactions(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nf_pending_transactions(INT) TO authenticated;

-- ── nf_customer_feedback_recent: mask user_name ─────────────────────
CREATE OR REPLACE FUNCTION public.nf_customer_feedback_recent(p_limit INT DEFAULT 10)
RETURNS TABLE(
  user_name TEXT,
  channel   TEXT,
  score     INT,
  category  TEXT,
  comment   TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.nf_mask_name(u.name) AS user_name,
    cf.channel,
    cf.score,
    cf.category,
    cf.comment,
    cf.created_at
  FROM customer_feedback cf
  JOIN users u ON u.id = cf.user_id
  ORDER BY cf.created_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.nf_customer_feedback_recent(INT) TO authenticated;

-- ── nf_fraud_alerts_list: mask user_name ─────────────────────────────
CREATE OR REPLACE FUNCTION public.nf_fraud_alerts_list(p_limit INT DEFAULT 10)
RETURNS TABLE(
  id          INT,
  user_name   TEXT,
  alert_type  TEXT,
  severity    TEXT,
  description TEXT,
  status      TEXT,
  amount      NUMERIC,
  created_at  TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    fa.id,
    public.nf_mask_name(u.name) AS user_name,
    fa.alert_type,
    fa.severity,
    fa.description,
    fa.status,
    fa.amount,
    fa.created_at
  FROM fraud_alerts fa
  JOIN users u ON u.id = fa.user_id
  WHERE fa.created_at > NOW() - interval '7 days'
  ORDER BY
    CASE fa.severity
      WHEN 'critical' THEN 0
      WHEN 'high'     THEN 1
      WHEN 'medium'   THEN 2
      ELSE 3
    END,
    fa.created_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.nf_fraud_alerts_list(INT) TO authenticated;
