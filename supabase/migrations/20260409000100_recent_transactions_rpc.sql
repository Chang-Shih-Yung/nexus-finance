-- RPC: nf_recent_transactions
-- Returns the N most recent transactions with user and category info
CREATE OR REPLACE FUNCTION nf_recent_transactions(p_limit INT DEFAULT 10)
RETURNS TABLE (
  id          INT,
  user_name   VARCHAR,
  amount      NUMERIC,
  currency    VARCHAR,
  from_account VARCHAR,
  to_account  VARCHAR,
  status      tx_status,
  category    VARCHAR,
  channel     VARCHAR,
  created_at  TIMESTAMPTZ
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
  ORDER BY t.created_at DESC
  LIMIT p_limit;
$$;
