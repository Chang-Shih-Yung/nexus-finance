-- Fix anomaly acknowledgement: recreate function + table access
-- The original migration's RLS policy blocks all access including SECURITY DEFINER

-- Ensure table exists
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

-- Drop the blocking RLS policy and replace with permissive one for service/definer
ALTER TABLE anomaly_acks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_public_anomaly_acks" ON anomaly_acks;
CREATE POLICY "allow_all_anomaly_acks" ON anomaly_acks FOR ALL USING (true) WITH CHECK (true);

-- Recreate the acknowledge function
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

-- Recreate the acks-today function
CREATE OR REPLACE FUNCTION public.nf_anomaly_acks_today()
RETURNS SETOF anomaly_acks
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM anomaly_acks WHERE ack_date = CURRENT_DATE;
$$;

-- Grant to all roles including anon for demo
GRANT EXECUTE ON FUNCTION public.nf_acknowledge_anomaly(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.nf_anomaly_acks_today() TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON anomaly_acks TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE anomaly_acks_id_seq TO anon, authenticated, service_role;
