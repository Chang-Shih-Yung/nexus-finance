-- ============================================================
-- Fix dashboard data gaps:
-- 1. Update nf_stats_api_health to accept date range params
-- 2. Add missing daily_snapshot dimensions (branch, category, user)
-- 3. Ensure api_logs covers recent date range
-- ============================================================
BEGIN;

-- ════════════════════════════════════════════════════════════════
-- 1. Update nf_stats_api_health: accept p_from / p_to timestamps
--    Falls back to p_minutes when date params are NULL
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.nf_stats_api_health(
  p_minutes integer DEFAULT 60,
  p_from timestamptz DEFAULT NULL,
  p_to   timestamptz DEFAULT NULL
)
RETURNS TABLE (
  minute timestamptz,
  avg_latency numeric,
  total_requests bigint,
  error_count bigint,
  error_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from timestamptz;
  v_to   timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  -- If explicit date range provided, use it; otherwise fall back to minutes
  IF p_from IS NOT NULL AND p_to IS NOT NULL THEN
    v_from := p_from;
    v_to   := p_to;
  ELSE
    v_to   := NOW();
    v_from := NOW() - (LEAST(GREATEST(COALESCE(p_minutes, 60), 1), 44640)::text || ' minutes')::interval;
  END IF;

  RETURN QUERY
  SELECT
    date_trunc('minute', a.created_at) AS minute,
    ROUND(AVG(a.response_time_ms)::numeric, 2) AS avg_latency,
    COUNT(*)::bigint AS total_requests,
    COUNT(*) FILTER (WHERE a.status_code >= 500)::bigint AS error_count,
    COALESCE(ROUND(COUNT(*) FILTER (WHERE a.status_code >= 500) * 100.0 / NULLIF(COUNT(*), 0), 2), 0) AS error_rate
  FROM api_logs a
  WHERE a.created_at >= v_from AND a.created_at <= v_to
  GROUP BY date_trunc('minute', a.created_at)
  ORDER BY minute;
END;
$$;

-- ════════════════════════════════════════════════════════════════
-- 2. Add missing daily_snapshot dimensions for 90 days
-- ════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_date  DATE;
  v_day   INT;
  v_base  NUMERIC;
  v_dow   INT;
  v_branches TEXT[] := ARRAY['台北分行','高雄分行','台中分行','台南分行','新竹分行','桃園分行','台北南區分行'];
  v_categories TEXT[] := ARRAY['transfer','payment','withdrawal','deposit','investment'];
  v_users TEXT[];
  v_user TEXT;
  v_branch TEXT;
  v_cat TEXT;
  v_remaining NUMERIC;
  v_slice NUMERIC;
  v_total_amount NUMERIC;
  v_total_count NUMERIC;
  v_i INT;
BEGIN
  -- Guard: skip if branch dimension already seeded
  IF (SELECT COUNT(*) FROM daily_snapshots
      WHERE metric_key = 'txn_amount' AND dimension = 'branch'
        AND date >= CURRENT_DATE - 7) > 10 THEN
    RAISE NOTICE 'branch snapshots already exist, skipping dimension fill.';
    RETURN;
  END IF;

  -- Get user names for top-n
  SELECT ARRAY_AGG(name ORDER BY random()) INTO v_users
  FROM (SELECT name FROM users WHERE status = 'active' LIMIT 15) sub;

  FOR v_day IN 0..89 LOOP
    v_date := CURRENT_DATE - v_day;
    v_dow  := EXTRACT(DOW FROM v_date);
    v_base := 1.0 + (90 - v_day) * 0.003;

    -- ── txn_amount by branch ──
    v_total_amount := CASE WHEN v_dow IN (0,6)
      THEN 4500000 * v_base + random() * 1500000
      ELSE 8200000 * v_base + random() * 3000000 END;
    v_remaining := v_total_amount;

    FOR v_i IN 1..array_length(v_branches, 1) LOOP
      v_branch := v_branches[v_i];
      IF v_i = array_length(v_branches, 1) THEN
        v_slice := v_remaining;
      ELSE
        -- Distribute with some randomness (larger branches get more)
        v_slice := floor(v_total_amount * (0.08 + random() * 0.12));
        v_remaining := v_remaining - v_slice;
      END IF;
      INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
      VALUES (v_date, 'txn_amount', 'branch', v_branch, GREATEST(v_slice, 100000))
      ON CONFLICT DO NOTHING;
    END LOOP;

    -- ── txn_amount by category ──
    v_remaining := v_total_amount;
    FOR v_i IN 1..array_length(v_categories, 1) LOOP
      v_cat := v_categories[v_i];
      IF v_i = array_length(v_categories, 1) THEN
        v_slice := v_remaining;
      ELSE
        v_slice := floor(v_total_amount * (0.12 + random() * 0.15));
        v_remaining := v_remaining - v_slice;
      END IF;
      INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
      VALUES (v_date, 'txn_amount', 'category', v_cat, GREATEST(v_slice, 50000))
      ON CONFLICT DO NOTHING;
    END LOOP;

    -- ── txn_count by category ──
    v_total_count := CASE WHEN v_dow IN (0,6)
      THEN 85 * v_base + random() * 30
      ELSE 150 * v_base + random() * 60 END;
    v_remaining := v_total_count;
    FOR v_i IN 1..array_length(v_categories, 1) LOOP
      v_cat := v_categories[v_i];
      IF v_i = array_length(v_categories, 1) THEN
        v_slice := v_remaining;
      ELSE
        v_slice := floor(v_total_count * (0.12 + random() * 0.15));
        v_remaining := v_remaining - v_slice;
      END IF;
      INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
      VALUES (v_date, 'txn_count', 'category', v_cat, GREATEST(v_slice, 5))
      ON CONFLICT DO NOTHING;
    END LOOP;

    -- ── txn_amount by user (top customers) ──
    IF v_users IS NOT NULL AND array_length(v_users, 1) > 0 THEN
      FOR v_i IN 1..LEAST(array_length(v_users, 1), 10) LOOP
        v_user := v_users[v_i];
        -- VIP/premium users have higher amounts; add variability
        v_slice := floor((800000 - v_i * 50000) * v_base + random() * 400000);
        INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
        VALUES (v_date, 'txn_amount', 'user', v_user, GREATEST(v_slice, 10000))
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;

  END LOOP;
END $$;

-- ════════════════════════════════════════════════════════════════
-- 3. Ensure api_logs has data for today (won't duplicate if present)
-- ════════════════════════════════════════════════════════════════
DO $$
BEGIN
  -- Only insert if today has very few entries
  IF (SELECT COUNT(*) FROM api_logs
      WHERE created_at >= CURRENT_DATE
        AND created_at < CURRENT_DATE + 1) < 10 THEN

    INSERT INTO api_logs (method, path, status_code, response_time_ms, created_at)
    SELECT
      CASE WHEN random() < 0.3 THEN 'POST' ELSE 'GET' END,
      CASE floor(random() * 4)
        WHEN 0 THEN '/api/v2/transfer'
        WHEN 1 THEN '/api/v2/balance'
        WHEN 2 THEN '/api/v2/login'
        ELSE        '/api/v2/accounts'
      END,
      CASE
        WHEN r_err < 0.95 THEN 200
        WHEN r_err < 0.98 THEN 500
        ELSE                    502
      END,
      CASE
        WHEN r_err >= 0.95 THEN (500 + floor(random() * 1500))::int
        ELSE (50 + floor(random() * 250))::int
      END,
      -- Spread across today's hours (00:00 to NOW)
      CURRENT_DATE + (random() * EXTRACT(EPOCH FROM (NOW() - CURRENT_DATE::timestamptz)) * interval '1 second')
    FROM (
      SELECT s, random() AS r_err
      FROM generate_series(1, 480) s
    ) reqs;

  END IF;
END $$;

COMMIT;
