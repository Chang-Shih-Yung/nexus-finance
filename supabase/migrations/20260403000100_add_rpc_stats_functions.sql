-- Replace Edge Function data endpoints with Postgres RPC functions.
-- These functions run as SECURITY DEFINER and require an authenticated Supabase user.

CREATE OR REPLACE FUNCTION public.nf_stats_overview()
RETURNS TABLE (
  today_logins bigint,
  today_transactions bigint,
  today_success_rate numeric,
  today_active_users bigint
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
  WITH day_bounds AS (
    SELECT date_trunc('day', now()) AS day_start, date_trunc('day', now()) + interval '1 day' AS day_end
  )
  SELECT
    (
      SELECT COUNT(DISTINCT e.user_id)
      FROM events e, day_bounds d
      WHERE e.event_type = 'login' AND e.created_at >= d.day_start AND e.created_at < d.day_end
    ) AS today_logins,
    (
      SELECT COUNT(*)
      FROM transactions t, day_bounds d
      WHERE t.created_at >= d.day_start AND t.created_at < d.day_end
    ) AS today_transactions,
    (
      SELECT COALESCE(
        ROUND(COUNT(*) FILTER (WHERE t.status = 'success') * 100.0 / NULLIF(COUNT(*), 0), 2),
        0
      )
      FROM transactions t, day_bounds d
      WHERE t.created_at >= d.day_start AND t.created_at < d.day_end
    ) AS today_success_rate,
    (
      SELECT COUNT(DISTINCT e.user_id)
      FROM events e, day_bounds d
      WHERE e.created_at >= d.day_start AND e.created_at < d.day_end
    ) AS today_active_users;
END;
$$;

CREATE OR REPLACE FUNCTION public.nf_stats_trend(p_days integer DEFAULT 7)
RETURNS TABLE (
  date date,
  logins bigint,
  transactions bigint,
  success_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days integer := LEAST(GREATEST(COALESCE(p_days, 7), 1), 90);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    d.date::date,
    COALESCE(login_counts.count, 0) AS logins,
    COALESCE(tx_counts.total, 0) AS transactions,
    COALESCE(tx_counts.success_rate, 0) AS success_rate
  FROM generate_series(CURRENT_DATE - v_days * INTERVAL '1 day', CURRENT_DATE, INTERVAL '1 day') AS d(date)
  LEFT JOIN (
    SELECT DATE(e.created_at) AS date, COUNT(DISTINCT e.user_id) AS count
    FROM events e
    WHERE e.event_type = 'login'
    GROUP BY DATE(e.created_at)
  ) login_counts ON d.date::date = login_counts.date
  LEFT JOIN (
    SELECT
      DATE(t.created_at) AS date,
      COUNT(*) AS total,
      ROUND(COUNT(*) FILTER (WHERE t.status = 'success') * 100.0 / NULLIF(COUNT(*), 0), 2) AS success_rate
    FROM transactions t
    GROUP BY DATE(t.created_at)
  ) tx_counts ON d.date::date = tx_counts.date
  ORDER BY d.date;
END;
$$;

CREATE OR REPLACE FUNCTION public.nf_stats_daily_logins(
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL
)
RETURNS TABLE (
  date date,
  count bigint
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
  SELECT DATE(e.created_at) AS date, COUNT(DISTINCT e.user_id) AS count
  FROM events e
  WHERE e.event_type = 'login'
    AND (p_from IS NULL OR e.created_at >= p_from)
    AND (p_to IS NULL OR e.created_at <= p_to)
  GROUP BY DATE(e.created_at)
  ORDER BY date;
END;
$$;

CREATE OR REPLACE FUNCTION public.nf_stats_transfer_success_rate(
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL
)
RETURNS TABLE (
  date date,
  total bigint,
  success_count bigint,
  success_rate numeric
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
    DATE(t.created_at) AS date,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE t.status = 'success') AS success_count,
    COALESCE(ROUND(COUNT(*) FILTER (WHERE t.status = 'success') * 100.0 / NULLIF(COUNT(*), 0), 2), 0) AS success_rate
  FROM transactions t
  WHERE (p_from IS NULL OR t.created_at >= p_from)
    AND (p_to IS NULL OR t.created_at <= p_to)
  GROUP BY DATE(t.created_at)
  ORDER BY date;
END;
$$;

CREATE OR REPLACE FUNCTION public.nf_stats_funnel(
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL,
  p_window_hours integer DEFAULT 24
)
RETURNS TABLE (
  step text,
  users bigint,
  conversion_rate numeric,
  drop_off_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_hours integer := LEAST(GREATEST(COALESCE(p_window_hours, 24), 1), 168);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH session_window AS (
    SELECT
      e.user_id,
      MAX(CASE WHEN e.event_type = 'login' THEN e.created_at END) AS last_login,
      MAX(CASE WHEN e.event_type = 'transfer_init' THEN e.created_at END) AS last_init,
      MAX(CASE WHEN e.event_type = 'transfer_success' THEN e.created_at END) AS last_success
    FROM events e
    WHERE e.event_type IN ('login', 'transfer_init', 'transfer_success')
      AND (p_from IS NULL OR e.created_at >= p_from)
      AND (p_to IS NULL OR e.created_at <= p_to)
    GROUP BY e.user_id
  ),
  counts AS (
    SELECT
      COUNT(DISTINCT user_id)::bigint AS login_users,
      COUNT(DISTINCT CASE
        WHEN last_init IS NOT NULL AND last_init - last_login <= (v_window_hours::text || ' hours')::interval
        THEN user_id END)::bigint AS init_users,
      COUNT(DISTINCT CASE
        WHEN last_success IS NOT NULL AND last_success - last_login <= (v_window_hours::text || ' hours')::interval
        THEN user_id END)::bigint AS success_users
    FROM session_window
    WHERE last_login IS NOT NULL
  ),
  rows AS (
    SELECT 1 AS ord, 'login'::text AS step, login_users AS users, NULL::numeric AS prev_users FROM counts
    UNION ALL
    SELECT 2 AS ord, 'transfer_init'::text AS step, init_users AS users, login_users::numeric AS prev_users FROM counts
    UNION ALL
    SELECT 3 AS ord, 'transfer_success'::text AS step, success_users AS users, init_users::numeric AS prev_users FROM counts
  )
  SELECT
    rows.step,
    rows.users,
    CASE WHEN rows.prev_users IS NULL OR rows.prev_users = 0 THEN 0
         ELSE ROUND(rows.users * 100.0 / rows.prev_users, 2)
    END AS conversion_rate,
    CASE WHEN rows.prev_users IS NULL OR rows.prev_users = 0 THEN 0
         ELSE ROUND((1 - rows.users / rows.prev_users) * 100.0, 2)
    END AS drop_off_rate
  FROM rows
  ORDER BY rows.ord;
END;
$$;

CREATE OR REPLACE FUNCTION public.nf_stats_error_breakdown(
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL
)
RETURNS TABLE (
  error_code text,
  count bigint
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
  SELECT COALESCE(t.error_code, 'UNKNOWN')::text AS error_code, COUNT(*)::bigint AS count
  FROM transactions t
  WHERE t.status = 'failed'
    AND (p_from IS NULL OR t.created_at >= p_from)
    AND (p_to IS NULL OR t.created_at <= p_to)
  GROUP BY COALESCE(t.error_code, 'UNKNOWN')
  ORDER BY count DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.nf_stats_failed_transactions(
  p_limit integer DEFAULT 50,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL
)
RETURNS TABLE (
  id integer,
  user_name text,
  tier user_tier,
  amount numeric,
  currency varchar,
  from_account varchar,
  to_account varchar,
  error_code varchar,
  error_message varchar,
  channel varchar,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    u.name::text AS user_name,
    u.tier,
    t.amount,
    t.currency,
    t.from_account,
    t.to_account,
    t.error_code,
    t.error_message,
    t.channel,
    t.created_at
  FROM transactions t
  JOIN users u ON u.id = t.user_id
  WHERE t.status = 'failed'
    AND (p_from IS NULL OR t.created_at >= p_from)
    AND (p_to IS NULL OR t.created_at <= p_to)
  ORDER BY t.created_at DESC
  LIMIT v_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.nf_stats_api_health(p_minutes integer DEFAULT 60)
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
  v_minutes integer := LEAST(GREATEST(COALESCE(p_minutes, 60), 1), 1440);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    date_trunc('minute', a.created_at) AS minute,
    ROUND(AVG(a.response_time_ms)::numeric, 2) AS avg_latency,
    COUNT(*)::bigint AS total_requests,
    COUNT(*) FILTER (WHERE a.status_code >= 500)::bigint AS error_count,
    COALESCE(ROUND(COUNT(*) FILTER (WHERE a.status_code >= 500) * 100.0 / NULLIF(COUNT(*), 0), 2), 0) AS error_rate
  FROM api_logs a
  WHERE a.created_at >= NOW() - (v_minutes::text || ' minutes')::interval
  GROUP BY date_trunc('minute', a.created_at)
  ORDER BY minute;
END;
$$;

CREATE OR REPLACE FUNCTION public.nf_ai_top_transfer_users(
  p_from timestamptz,
  p_to timestamptz,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  user_name text,
  tx_count bigint,
  total_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 10), 1), 100);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    u.name::text AS user_name,
    COUNT(*)::bigint AS tx_count,
    COALESCE(SUM(t.amount), 0) AS total_amount
  FROM transactions t
  JOIN users u ON u.id = t.user_id
  WHERE t.created_at >= p_from
    AND t.created_at < p_to
    AND t.status = 'success'
  GROUP BY u.name
  ORDER BY total_amount DESC
  LIMIT v_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.nf_ai_dormant_users(
  p_days integer DEFAULT 7,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  user_name text,
  tier user_tier,
  last_login_at timestamptz,
  inactive_days integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days integer := LEAST(GREATEST(COALESCE(p_days, 7), 1), 365);
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH last_login AS (
    SELECT e.user_id, MAX(e.created_at) AS last_login_at
    FROM events e
    WHERE e.event_type = 'login'
    GROUP BY e.user_id
  )
  SELECT
    u.name::text AS user_name,
    u.tier,
    l.last_login_at,
    GREATEST(FLOOR(EXTRACT(EPOCH FROM (NOW() - l.last_login_at)) / 86400)::integer, 0) AS inactive_days
  FROM users u
  JOIN last_login l ON l.user_id = u.id
  WHERE l.last_login_at < NOW() - (v_days::text || ' days')::interval
  ORDER BY l.last_login_at ASC
  LIMIT v_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.nf_stats_overview() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.nf_stats_trend(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.nf_stats_daily_logins(timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.nf_stats_transfer_success_rate(timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.nf_stats_funnel(timestamptz, timestamptz, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.nf_stats_error_breakdown(timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.nf_stats_failed_transactions(integer, timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.nf_stats_api_health(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.nf_ai_top_transfer_users(timestamptz, timestamptz, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.nf_ai_dormant_users(integer, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.nf_stats_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.nf_stats_trend(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.nf_stats_daily_logins(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.nf_stats_transfer_success_rate(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.nf_stats_funnel(timestamptz, timestamptz, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.nf_stats_error_breakdown(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.nf_stats_failed_transactions(integer, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.nf_stats_api_health(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.nf_ai_top_transfer_users(timestamptz, timestamptz, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.nf_ai_dormant_users(integer, integer) TO authenticated;
