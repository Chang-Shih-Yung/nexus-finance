-- Dashboard Overhaul: branches, accounts, daily_snapshots + generic RPC functions
-- Adds EVP-oriented metrics infrastructure

-- ── New Tables ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS branches (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  region     VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
  id           SERIAL PRIMARY KEY,
  user_id      INT NOT NULL REFERENCES users(id),
  account_type VARCHAR(30) NOT NULL DEFAULT 'checking',
  balance      NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency     VARCHAR(3) NOT NULL DEFAULT 'TWD',
  opened_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_snapshots (
  id              SERIAL PRIMARY KEY,
  date            DATE NOT NULL,
  metric_key      VARCHAR(50) NOT NULL,
  dimension       VARCHAR(50) NOT NULL DEFAULT 'total',
  dimension_value VARCHAR(100) NOT NULL DEFAULT '_all',
  metric_value    NUMERIC(15,4) NOT NULL DEFAULT 0,
  CONSTRAINT chk_metric_key CHECK (metric_key IN (
    'txn_count', 'txn_amount', 'success_rate', 'error_count',
    'error_rate', 'login_count', 'active_users', 'avg_balance'
  ))
);

-- ── Indexes ─────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_daily_snapshots_date_key
  ON daily_snapshots(date, metric_key);
CREATE INDEX IF NOT EXISTS idx_daily_snapshots_date_key_dim
  ON daily_snapshots(date, metric_key, dimension);
CREATE INDEX IF NOT EXISTS idx_accounts_user
  ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_branches_region
  ON branches(region);

-- ── Alter existing tables ───────────────────────────────────────

ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_id INT REFERENCES branches(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category VARCHAR(30) DEFAULT 'transfer';

-- ── RLS ─────────────────────────────────────────────────────────

ALTER TABLE branches        ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_public_branches"        ON branches        FOR ALL USING (false);
CREATE POLICY "deny_public_accounts"        ON accounts        FOR ALL USING (false);
CREATE POLICY "deny_public_daily_snapshots" ON daily_snapshots FOR ALL USING (false);

-- ══════════════════════════════════════════════════════════════
-- Generic RPC Functions
-- ══════════════════════════════════════════════════════════════

-- 1. nf_daily_trend: time series from daily_snapshots
CREATE OR REPLACE FUNCTION public.nf_daily_trend(
  p_metric_key TEXT,
  p_days INTEGER DEFAULT 30,
  p_dimension TEXT DEFAULT 'total',
  p_dimension_value TEXT DEFAULT '_all'
)
RETURNS TABLE (
  date DATE,
  metric_value NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days INTEGER := LEAST(GREATEST(COALESCE(p_days, 30), 1), 365);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT ds.date, ds.metric_value
  FROM daily_snapshots ds
  WHERE ds.metric_key = p_metric_key
    AND ds.dimension = COALESCE(p_dimension, 'total')
    AND ds.dimension_value = COALESCE(p_dimension_value, '_all')
    AND ds.date >= CURRENT_DATE - v_days
  ORDER BY ds.date;
END;
$$;

-- 2. nf_current_breakdown: breakdown by dimension for a given date
CREATE OR REPLACE FUNCTION public.nf_current_breakdown(
  p_metric_key TEXT,
  p_dimension TEXT,
  p_date DATE DEFAULT NULL
)
RETURNS TABLE (
  dimension_value TEXT,
  metric_value NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date DATE := COALESCE(p_date, CURRENT_DATE);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT ds.dimension_value::TEXT, ds.metric_value
  FROM daily_snapshots ds
  WHERE ds.metric_key = p_metric_key
    AND ds.dimension = p_dimension
    AND ds.date = v_date
    AND ds.dimension_value <> '_all'
  ORDER BY ds.metric_value DESC;
END;
$$;

-- 3. nf_top_n: ranked list by metric
CREATE OR REPLACE FUNCTION public.nf_top_n(
  p_metric_key TEXT,
  p_dimension TEXT,
  p_n INTEGER DEFAULT 10,
  p_date DATE DEFAULT NULL
)
RETURNS TABLE (
  dimension_value TEXT,
  metric_value NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date DATE := COALESCE(p_date, CURRENT_DATE);
  v_n INTEGER := LEAST(GREATEST(COALESCE(p_n, 10), 1), 100);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT ds.dimension_value::TEXT, ds.metric_value
  FROM daily_snapshots ds
  WHERE ds.metric_key = p_metric_key
    AND ds.dimension = p_dimension
    AND ds.date = v_date
    AND ds.dimension_value <> '_all'
  ORDER BY ds.metric_value DESC
  LIMIT v_n;
END;
$$;

-- 4. nf_period_compare: compare two date ranges
CREATE OR REPLACE FUNCTION public.nf_period_compare(
  p_metric_key TEXT,
  p_current_start DATE,
  p_current_end DATE,
  p_previous_start DATE,
  p_previous_end DATE
)
RETURNS TABLE (
  current_total NUMERIC,
  previous_total NUMERIC,
  change_pct NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current NUMERIC;
  v_previous NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(SUM(ds.metric_value), 0) INTO v_current
  FROM daily_snapshots ds
  WHERE ds.metric_key = p_metric_key
    AND ds.dimension = 'total'
    AND ds.dimension_value = '_all'
    AND ds.date >= p_current_start
    AND ds.date <= p_current_end;

  SELECT COALESCE(SUM(ds.metric_value), 0) INTO v_previous
  FROM daily_snapshots ds
  WHERE ds.metric_key = p_metric_key
    AND ds.dimension = 'total'
    AND ds.dimension_value = '_all'
    AND ds.date >= p_previous_start
    AND ds.date <= p_previous_end;

  RETURN QUERY
  SELECT
    v_current,
    v_previous,
    CASE WHEN v_previous = 0 THEN 0
         ELSE ROUND((v_current - v_previous) / v_previous * 100, 2)
    END;
END;
$$;

-- 5. nf_anomaly_check: flag metrics with unusual values
CREATE OR REPLACE FUNCTION public.nf_anomaly_check(
  p_date DATE DEFAULT NULL
)
RETURNS TABLE (
  metric_key TEXT,
  dimension TEXT,
  dimension_value TEXT,
  today_value NUMERIC,
  avg_7d NUMERIC,
  stddev_7d NUMERIC,
  z_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date DATE := COALESCE(p_date, CURRENT_DATE);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH today_vals AS (
    SELECT ds.metric_key, ds.dimension, ds.dimension_value, ds.metric_value
    FROM daily_snapshots ds
    WHERE ds.date = v_date
  ),
  hist AS (
    SELECT
      ds.metric_key, ds.dimension, ds.dimension_value,
      AVG(ds.metric_value) AS avg_val,
      STDDEV_POP(ds.metric_value) AS std_val
    FROM daily_snapshots ds
    WHERE ds.date >= v_date - 7 AND ds.date < v_date
    GROUP BY ds.metric_key, ds.dimension, ds.dimension_value
  )
  SELECT
    t.metric_key::TEXT,
    t.dimension::TEXT,
    t.dimension_value::TEXT,
    t.metric_value AS today_value,
    ROUND(h.avg_val, 2) AS avg_7d,
    ROUND(h.std_val, 2) AS stddev_7d,
    CASE WHEN h.std_val = 0 OR h.std_val IS NULL THEN 0
         ELSE ROUND((t.metric_value - h.avg_val) / h.std_val, 2)
    END AS z_score
  FROM today_vals t
  JOIN hist h ON h.metric_key = t.metric_key
    AND h.dimension = t.dimension
    AND h.dimension_value = t.dimension_value
  WHERE ABS(CASE WHEN h.std_val = 0 OR h.std_val IS NULL THEN 0
                 ELSE (t.metric_value - h.avg_val) / h.std_val
            END) > 2
  ORDER BY ABS(CASE WHEN h.std_val = 0 OR h.std_val IS NULL THEN 0
                    ELSE (t.metric_value - h.avg_val) / h.std_val
               END) DESC;
END;
$$;

-- 6. nf_generate_daily_snapshot: batch compute snapshots from raw tables
CREATE OR REPLACE FUNCTION public.nf_generate_daily_snapshot(
  p_date DATE DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date DATE := COALESCE(p_date, CURRENT_DATE);
  v_start TIMESTAMPTZ := v_date::TIMESTAMPTZ;
  v_end TIMESTAMPTZ := (v_date + 1)::TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  -- Clear existing snapshots for this date
  DELETE FROM daily_snapshots WHERE date = v_date;

  -- txn_count total
  INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
  SELECT v_date, 'txn_count', 'total', '_all', COUNT(*)
  FROM transactions WHERE created_at >= v_start AND created_at < v_end;

  -- txn_count by category
  INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
  SELECT v_date, 'txn_count', 'category', COALESCE(category, 'transfer'), COUNT(*)
  FROM transactions WHERE created_at >= v_start AND created_at < v_end
  GROUP BY COALESCE(category, 'transfer');

  -- txn_count by channel
  INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
  SELECT v_date, 'txn_count', 'channel', COALESCE(channel, 'web'), COUNT(*)
  FROM transactions WHERE created_at >= v_start AND created_at < v_end
  GROUP BY COALESCE(channel, 'web');

  -- txn_count by tier
  INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
  SELECT v_date, 'txn_count', 'tier', u.tier::TEXT, COUNT(*)
  FROM transactions t JOIN users u ON u.id = t.user_id
  WHERE t.created_at >= v_start AND t.created_at < v_end
  GROUP BY u.tier;

  -- txn_amount total
  INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
  SELECT v_date, 'txn_amount', 'total', '_all', COALESCE(SUM(amount), 0)
  FROM transactions WHERE created_at >= v_start AND created_at < v_end;

  -- txn_amount by category
  INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
  SELECT v_date, 'txn_amount', 'category', COALESCE(category, 'transfer'), COALESCE(SUM(amount), 0)
  FROM transactions WHERE created_at >= v_start AND created_at < v_end
  GROUP BY COALESCE(category, 'transfer');

  -- txn_amount by channel
  INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
  SELECT v_date, 'txn_amount', 'channel', COALESCE(channel, 'web'), COALESCE(SUM(amount), 0)
  FROM transactions WHERE created_at >= v_start AND created_at < v_end
  GROUP BY COALESCE(channel, 'web');

  -- txn_amount by tier
  INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
  SELECT v_date, 'txn_amount', 'tier', u.tier::TEXT, COALESCE(SUM(t.amount), 0)
  FROM transactions t JOIN users u ON u.id = t.user_id
  WHERE t.created_at >= v_start AND t.created_at < v_end
  GROUP BY u.tier;

  -- txn_amount by branch
  INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
  SELECT v_date, 'txn_amount', 'branch', COALESCE(b.name, '未分配'), COALESCE(SUM(t.amount), 0)
  FROM transactions t
  JOIN users u ON u.id = t.user_id
  LEFT JOIN branches b ON b.id = u.branch_id
  WHERE t.created_at >= v_start AND t.created_at < v_end
  GROUP BY COALESCE(b.name, '未分配');

  -- success_rate total
  INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
  SELECT v_date, 'success_rate', 'total', '_all',
    COALESCE(ROUND(COUNT(*) FILTER (WHERE status = 'success') * 100.0 / NULLIF(COUNT(*), 0), 2), 0)
  FROM transactions WHERE created_at >= v_start AND created_at < v_end;

  -- error_count total
  INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
  SELECT v_date, 'error_count', 'total', '_all',
    COUNT(*) FILTER (WHERE status = 'failed')
  FROM transactions WHERE created_at >= v_start AND created_at < v_end;

  -- error_count by error_code
  INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
  SELECT v_date, 'error_count', 'error_code', COALESCE(error_code, 'UNKNOWN'), COUNT(*)
  FROM transactions WHERE status = 'failed' AND created_at >= v_start AND created_at < v_end
  GROUP BY COALESCE(error_code, 'UNKNOWN');

  -- error_rate total
  INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
  SELECT v_date, 'error_rate', 'total', '_all',
    COALESCE(ROUND(COUNT(*) FILTER (WHERE status = 'failed') * 100.0 / NULLIF(COUNT(*), 0), 2), 0)
  FROM transactions WHERE created_at >= v_start AND created_at < v_end;

  -- login_count total
  INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
  SELECT v_date, 'login_count', 'total', '_all', COUNT(DISTINCT user_id)
  FROM events WHERE event_type = 'login' AND created_at >= v_start AND created_at < v_end;

  -- active_users total
  INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
  SELECT v_date, 'active_users', 'total', '_all', COUNT(DISTINCT user_id)
  FROM events WHERE created_at >= v_start AND created_at < v_end;
END;
$$;

-- ── Permissions ─────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.nf_daily_trend(TEXT, INTEGER, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.nf_current_breakdown(TEXT, TEXT, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.nf_top_n(TEXT, TEXT, INTEGER, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.nf_period_compare(TEXT, DATE, DATE, DATE, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.nf_anomaly_check(DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.nf_generate_daily_snapshot(DATE) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.nf_daily_trend(TEXT, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.nf_current_breakdown(TEXT, TEXT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.nf_top_n(TEXT, TEXT, INTEGER, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.nf_period_compare(TEXT, DATE, DATE, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.nf_anomaly_check(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.nf_generate_daily_snapshot(DATE) TO authenticated;
