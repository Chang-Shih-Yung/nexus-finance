-- Fix nf_current_breakdown and nf_top_n: fallback to most recent date with data
-- when CURRENT_DATE has no breakdown rows (e.g. no transactions today yet)

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
  v_date DATE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  -- Use provided date, or today, or fallback to latest date with actual breakdown data
  v_date := COALESCE(p_date, CURRENT_DATE);

  IF NOT EXISTS (
    SELECT 1 FROM daily_snapshots ds
    WHERE ds.metric_key = p_metric_key
      AND ds.dimension = p_dimension
      AND ds.date = v_date
      AND ds.dimension_value <> '_all'
  ) THEN
    SELECT MAX(ds.date) INTO v_date
    FROM daily_snapshots ds
    WHERE ds.metric_key = p_metric_key
      AND ds.dimension = p_dimension
      AND ds.dimension_value <> '_all';
  END IF;

  IF v_date IS NULL THEN
    RETURN;
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
  v_date DATE;
  v_n INTEGER := LEAST(GREATEST(COALESCE(p_n, 10), 1), 100);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  v_date := COALESCE(p_date, CURRENT_DATE);

  IF NOT EXISTS (
    SELECT 1 FROM daily_snapshots ds
    WHERE ds.metric_key = p_metric_key
      AND ds.dimension = p_dimension
      AND ds.date = v_date
      AND ds.dimension_value <> '_all'
  ) THEN
    SELECT MAX(ds.date) INTO v_date
    FROM daily_snapshots ds
    WHERE ds.metric_key = p_metric_key
      AND ds.dimension = p_dimension
      AND ds.dimension_value <> '_all';
  END IF;

  IF v_date IS NULL THEN
    RETURN;
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

-- Also seed txn_amount by user dimension (for Top 10 customers)
-- so nf_top_n has data for dimension='user'
DO $$
DECLARE
  v_date DATE;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
BEGIN
  FOR v_date IN SELECT d::DATE FROM generate_series(CURRENT_DATE - 30, CURRENT_DATE, '1 day'::INTERVAL) AS d
  LOOP
    v_start := v_date::TIMESTAMPTZ;
    v_end := (v_date + 1)::TIMESTAMPTZ;

    -- Delete old user dimension data for this date to allow re-run
    DELETE FROM daily_snapshots
    WHERE date = v_date AND metric_key = 'txn_amount' AND dimension = 'user';

    -- txn_amount by user (using display_name)
    INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
    SELECT v_date, 'txn_amount', 'user', u.name, COALESCE(SUM(t.amount), 0)
    FROM transactions t JOIN users u ON u.id = t.user_id
    WHERE t.created_at >= v_start AND t.created_at < v_end
    GROUP BY u.name
    HAVING SUM(t.amount) > 0;
  END LOOP;
END $$;
