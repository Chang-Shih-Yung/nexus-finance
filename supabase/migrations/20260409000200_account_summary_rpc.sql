-- RPC: nf_account_summary
-- Returns aggregated account info for dashboard card overview
CREATE OR REPLACE FUNCTION nf_account_summary()
RETURNS TABLE (
  total_balance    NUMERIC,
  account_count    BIGINT,
  primary_currency VARCHAR,
  avg_balance      NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    COALESCE(SUM(a.balance), 0)             AS total_balance,
    COUNT(*)                                 AS account_count,
    COALESCE(MODE() WITHIN GROUP (ORDER BY a.currency), 'TWD') AS primary_currency,
    COALESCE(AVG(a.balance), 0)             AS avg_balance
  FROM accounts a;
$$;

REVOKE ALL ON FUNCTION nf_account_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION nf_account_summary() TO authenticated;

-- RPC: nf_monthly_activity
-- Returns monthly transaction totals for the past N months (for yearly chart)
CREATE OR REPLACE FUNCTION nf_monthly_activity(p_months INT DEFAULT 12)
RETURNS TABLE (
  month      TEXT,
  txn_count  BIGINT,
  txn_amount NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    TO_CHAR(DATE_TRUNC('month', t.created_at), 'Mon') AS month,
    COUNT(*)        AS txn_count,
    SUM(t.amount)   AS txn_amount
  FROM transactions t
  WHERE t.created_at >= DATE_TRUNC('month', CURRENT_DATE) - (p_months || ' months')::INTERVAL
    AND t.created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
  GROUP BY DATE_TRUNC('month', t.created_at)
  ORDER BY DATE_TRUNC('month', t.created_at);
$$;

REVOKE ALL ON FUNCTION nf_monthly_activity(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION nf_monthly_activity(INT) TO authenticated;

-- RPC: nf_pending_transactions
-- Returns pending transactions for upcoming payments display
CREATE OR REPLACE FUNCTION nf_pending_transactions(p_limit INT DEFAULT 10)
RETURNS TABLE (
  id          INT,
  user_name   VARCHAR,
  amount      NUMERIC,
  currency    VARCHAR,
  category    VARCHAR,
  created_at  TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    t.id,
    u.name       AS user_name,
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

REVOKE ALL ON FUNCTION nf_pending_transactions(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION nf_pending_transactions(INT) TO authenticated;
