-- Grant anon access to anomaly check (matches other dashboard RPCs)
GRANT EXECUTE ON FUNCTION public.nf_anomaly_check(DATE) TO anon;
GRANT EXECUTE ON FUNCTION public.nf_anomaly_acks_today() TO anon;

-- Seed 90 days of daily_snapshots for anomaly detection.
-- Normal baseline with periodic spikes to trigger z > 2.
DO $$
DECLARE
  d DATE;
  base_txn_count   NUMERIC;
  base_txn_amount  NUMERIC;
  base_error_count NUMERIC;
  base_login       NUMERIC;
  day_offset       INT;
  noise            NUMERIC;
  is_spike         BOOLEAN;
BEGIN
  FOR day_offset IN 0..89 LOOP
    d := CURRENT_DATE - day_offset;

    -- Decide if this day is a spike day (roughly every 12-18 days)
    is_spike := (day_offset IN (0, 3, 14, 27, 41, 55, 68, 82));

    -- Base values with small daily noise (±5%)
    noise := 0.95 + random()::NUMERIC * 0.10;

    IF is_spike THEN
      -- Spike: 2.5-4x deviation on one or more metrics
      base_txn_count   := ROUND((5200 + random()::NUMERIC * 600) * noise);        -- normal ~5000
      base_txn_amount  := ROUND((850000 + random()::NUMERIC * 100000) * noise, 2);  -- normal ~680k
      base_error_count := ROUND((280 + random()::NUMERIC * 60) * noise);            -- normal ~120
      base_login       := ROUND((2800 + random()::NUMERIC * 400) * noise);          -- normal ~2200
    ELSE
      -- Normal day
      base_txn_count   := ROUND((4800 + random()::NUMERIC * 400) * noise);
      base_txn_amount  := ROUND((650000 + random()::NUMERIC * 60000) * noise, 2);
      base_error_count := ROUND((100 + random()::NUMERIC * 40) * noise);
      base_login       := ROUND((2100 + random()::NUMERIC * 200) * noise);
    END IF;

    -- txn_count total
    INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
    VALUES (d, 'txn_count', 'total', '_all', base_txn_count)
    ON CONFLICT DO NOTHING;

    -- txn_amount total
    INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
    VALUES (d, 'txn_amount', 'total', '_all', base_txn_amount)
    ON CONFLICT DO NOTHING;

    -- error_count total
    INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
    VALUES (d, 'error_count', 'total', '_all', base_error_count)
    ON CONFLICT DO NOTHING;

    -- login_count total
    INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
    VALUES (d, 'login_count', 'total', '_all', base_login)
    ON CONFLICT DO NOTHING;

    -- txn_count by user dimension (spike on specific user)
    INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
    VALUES (d, 'txn_count', 'user', '吳文凱',
            CASE WHEN is_spike THEN ROUND((320 + random()::NUMERIC * 40) * noise) ELSE ROUND((140 + random()::NUMERIC * 30) * noise) END)
    ON CONFLICT DO NOTHING;

    INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
    VALUES (d, 'txn_count', 'user', '李小美',
            ROUND((160 + random()::NUMERIC * 30) * noise))
    ON CONFLICT DO NOTHING;

    -- txn_amount by user dimension
    INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
    VALUES (d, 'txn_amount', 'user', '吳文凱',
            CASE WHEN is_spike THEN ROUND((890000 + random()::NUMERIC * 50000) * noise, 2) ELSE ROUND((650000 + random()::NUMERIC * 40000) * noise, 2) END)
    ON CONFLICT DO NOTHING;

    INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
    VALUES (d, 'txn_amount', 'user', '李小美',
            ROUND((720000 + random()::NUMERIC * 40000) * noise, 2))
    ON CONFLICT DO NOTHING;

    -- txn_count by category
    INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
    VALUES (d, 'txn_count', 'category', 'investment',
            CASE WHEN is_spike THEN ROUND((380 + random()::NUMERIC * 50) * noise) ELSE ROUND((150 + random()::NUMERIC * 30) * noise) END)
    ON CONFLICT DO NOTHING;

    INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
    VALUES (d, 'txn_count', 'category', 'payment',
            ROUND((1800 + random()::NUMERIC * 200) * noise))
    ON CONFLICT DO NOTHING;

    -- error_rate total (percentage)
    INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
    VALUES (d, 'error_rate', 'total', '_all',
            CASE WHEN is_spike THEN ROUND((8.5 + random()::NUMERIC * 3.0) * noise, 4) ELSE ROUND((2.5 + random()::NUMERIC * 1.5) * noise, 4) END)
    ON CONFLICT DO NOTHING;

    -- success_rate total
    INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
    VALUES (d, 'success_rate', 'total', '_all',
            CASE WHEN is_spike THEN ROUND((91.0 + random()::NUMERIC * 2.0) * noise, 4) ELSE ROUND((96.5 + random()::NUMERIC * 1.5) * noise, 4) END)
    ON CONFLICT DO NOTHING;

    -- active_users total
    INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
    VALUES (d, 'active_users', 'total', '_all',
            CASE WHEN is_spike THEN ROUND((3800 + random()::NUMERIC * 400) * noise) ELSE ROUND((2800 + random()::NUMERIC * 300) * noise) END)
    ON CONFLICT DO NOTHING;

  END LOOP;
END $$;
