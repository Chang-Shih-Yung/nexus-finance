-- Remove auth.uid() check from nf_anomaly_check so anon can call it
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
  RETURN QUERY
  WITH today_vals AS (
    SELECT s.metric_key, s.dimension, s.dimension_value, s.metric_value
    FROM daily_snapshots s
    WHERE s.date = v_date
  ),
  hist AS (
    SELECT s.metric_key, s.dimension, s.dimension_value,
           AVG(s.metric_value)        AS avg_val,
           STDDEV_POP(s.metric_value)  AS sd_val
    FROM daily_snapshots s
    WHERE s.date >= v_date - 7 AND s.date < v_date
    GROUP BY s.metric_key, s.dimension, s.dimension_value
  )
  SELECT
    t.metric_key::TEXT,
    t.dimension::TEXT,
    t.dimension_value::TEXT,
    ROUND(t.metric_value, 2)  AS today_value,
    ROUND(h.avg_val, 2)       AS avg_7d,
    ROUND(h.sd_val, 2)        AS stddev_7d,
    CASE WHEN h.sd_val IS NULL OR h.sd_val = 0 THEN 0
         ELSE ROUND((t.metric_value - h.avg_val) / h.sd_val, 2)
    END                        AS z_score
  FROM today_vals t
  JOIN hist h USING (metric_key, dimension, dimension_value)
  WHERE ABS(
    CASE WHEN h.sd_val IS NULL OR h.sd_val = 0 THEN 0
         ELSE (t.metric_value - h.avg_val) / h.sd_val
    END
  ) > 2
  ORDER BY ABS(
    CASE WHEN h.sd_val IS NULL OR h.sd_val = 0 THEN 0
         ELSE (t.metric_value - h.avg_val) / h.sd_val
    END
  ) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.nf_anomaly_check(DATE) TO anon, authenticated, service_role;
