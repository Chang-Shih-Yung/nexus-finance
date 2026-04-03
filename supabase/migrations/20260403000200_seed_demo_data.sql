-- Demo seed data for Nexus Finance dashboards.
-- Safe re-run strategy:
-- 1) users are upserted by unique email
-- 2) events are tagged by metadata.seed = 'demo-v1'
-- 3) transactions are tagged by channel = 'demo-seed-v1'
-- 4) api_logs use path '/seed/demo' sentinel

WITH user_seed(name, email, phone, tier, rm_name, branch, status) AS (
  VALUES
    ('王小明', 'demo.general.1@nexus.local', '0912000111', 'general'::user_tier, '陳理專', '台北分行', 'active'),
    ('李小美', 'demo.general.2@nexus.local', '0912000222', 'general'::user_tier, '陳理專', '台北分行', 'active'),
    ('張大華', 'demo.vip.1@nexus.local',     '0912000333', 'vip'::user_tier,     '林理專', '新竹分行', 'active'),
    ('陳志豪', 'demo.vip.2@nexus.local',     '0912000444', 'vip'::user_tier,     '林理專', '新竹分行', 'active'),
    ('林佩珊', 'demo.premium.1@nexus.local', '0912000555', 'premium'::user_tier, '王理專', '台中分行', 'active'),
    ('黃志誠', 'demo.premium.2@nexus.local', '0912000666', 'premium'::user_tier, '王理專', '台中分行', 'active')
)
INSERT INTO users (name, email, phone, tier, rm_name, branch, status, created_at, last_login_at)
SELECT
  us.name,
  us.email,
  us.phone,
  us.tier,
  us.rm_name,
  us.branch,
  us.status,
  NOW() - INTERVAL '40 days',
  NOW() - INTERVAL '20 minutes'
FROM user_seed us
ON CONFLICT (email) DO UPDATE
SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  tier = EXCLUDED.tier,
  rm_name = EXCLUDED.rm_name,
  branch = EXCLUDED.branch,
  status = EXCLUDED.status;

WITH demo_users AS (
  SELECT id, email
  FROM users
  WHERE email LIKE 'demo.%@nexus.local'
),
event_seed(email, event_type, created_at, metadata) AS (
  VALUES
    ('demo.general.1@nexus.local', 'login'::event_type, CURRENT_DATE::timestamptz + INTERVAL '08 hour', '{"seed":"demo-v1","day":"today"}'::jsonb),
    ('demo.general.2@nexus.local', 'login'::event_type, CURRENT_DATE::timestamptz + INTERVAL '09 hour', '{"seed":"demo-v1","day":"today"}'::jsonb),
    ('demo.vip.1@nexus.local', 'login'::event_type, CURRENT_DATE::timestamptz + INTERVAL '10 hour', '{"seed":"demo-v1","day":"today"}'::jsonb),
    ('demo.vip.2@nexus.local', 'login'::event_type, CURRENT_DATE::timestamptz + INTERVAL '11 hour', '{"seed":"demo-v1","day":"today"}'::jsonb),
    ('demo.premium.1@nexus.local', 'login'::event_type, CURRENT_DATE::timestamptz + INTERVAL '12 hour', '{"seed":"demo-v1","day":"today"}'::jsonb),
    ('demo.premium.2@nexus.local', 'login'::event_type, CURRENT_DATE::timestamptz + INTERVAL '13 hour', '{"seed":"demo-v1","day":"today"}'::jsonb),
    ('demo.vip.1@nexus.local', 'transfer_init'::event_type, CURRENT_DATE::timestamptz + INTERVAL '10 hour 10 minute', '{"seed":"demo-v1"}'::jsonb),
    ('demo.vip.1@nexus.local', 'transfer_success'::event_type, CURRENT_DATE::timestamptz + INTERVAL '10 hour 20 minute', '{"seed":"demo-v1"}'::jsonb),
    ('demo.vip.2@nexus.local', 'transfer_init'::event_type, CURRENT_DATE::timestamptz + INTERVAL '11 hour 15 minute', '{"seed":"demo-v1"}'::jsonb),
    ('demo.vip.2@nexus.local', 'transfer_failed'::event_type, CURRENT_DATE::timestamptz + INTERVAL '11 hour 25 minute', '{"seed":"demo-v1"}'::jsonb),
    ('demo.premium.1@nexus.local', 'transfer_init'::event_type, CURRENT_DATE::timestamptz + INTERVAL '12 hour 10 minute', '{"seed":"demo-v1"}'::jsonb),
    ('demo.premium.1@nexus.local', 'transfer_success'::event_type, CURRENT_DATE::timestamptz + INTERVAL '12 hour 18 minute', '{"seed":"demo-v1"}'::jsonb),

    ('demo.general.1@nexus.local', 'login'::event_type, (CURRENT_DATE - INTERVAL '1 day')::timestamptz + INTERVAL '09 hour', '{"seed":"demo-v1","day":"-1"}'::jsonb),
    ('demo.vip.1@nexus.local', 'login'::event_type, (CURRENT_DATE - INTERVAL '2 day')::timestamptz + INTERVAL '10 hour', '{"seed":"demo-v1","day":"-2"}'::jsonb),
    ('demo.vip.2@nexus.local', 'login'::event_type, (CURRENT_DATE - INTERVAL '3 day')::timestamptz + INTERVAL '11 hour', '{"seed":"demo-v1","day":"-3"}'::jsonb),
    ('demo.premium.1@nexus.local', 'login'::event_type, (CURRENT_DATE - INTERVAL '4 day')::timestamptz + INTERVAL '12 hour', '{"seed":"demo-v1","day":"-4"}'::jsonb),
    ('demo.premium.2@nexus.local', 'login'::event_type, (CURRENT_DATE - INTERVAL '5 day')::timestamptz + INTERVAL '13 hour', '{"seed":"demo-v1","day":"-5"}'::jsonb),
    ('demo.general.2@nexus.local', 'login'::event_type, (CURRENT_DATE - INTERVAL '6 day')::timestamptz + INTERVAL '08 hour', '{"seed":"demo-v1","day":"-6"}'::jsonb)
)
INSERT INTO events (user_id, event_type, metadata, created_at)
SELECT du.id, es.event_type, es.metadata, es.created_at
FROM event_seed es
JOIN demo_users du ON du.email = es.email
WHERE NOT EXISTS (
  SELECT 1 FROM events e
  WHERE e.user_id = du.id
    AND e.event_type = es.event_type
    AND e.metadata @> '{"seed":"demo-v1"}'::jsonb
    AND e.created_at = es.created_at
);

WITH demo_users AS (
  SELECT id, email
  FROM users
  WHERE email LIKE 'demo.%@nexus.local'
),
tx_seed(email, amount, status, error_code, error_message, created_at) AS (
  VALUES
    ('demo.vip.1@nexus.local', 250000.00::numeric, 'success'::tx_status, NULL::varchar, NULL::varchar, CURRENT_DATE::timestamptz + INTERVAL '10 hour 20 minute'),
    ('demo.vip.2@nexus.local', 320000.00::numeric, 'failed'::tx_status, 'E_TIMEOUT', '上游核心系統逾時', CURRENT_DATE::timestamptz + INTERVAL '11 hour 25 minute'),
    ('demo.premium.1@nexus.local', 450000.00::numeric, 'success'::tx_status, NULL::varchar, NULL::varchar, CURRENT_DATE::timestamptz + INTERVAL '12 hour 18 minute'),
    ('demo.general.1@nexus.local', 12000.00::numeric, 'success'::tx_status, NULL::varchar, NULL::varchar, (CURRENT_DATE - INTERVAL '1 day')::timestamptz + INTERVAL '09 hour 30 minute'),
    ('demo.general.2@nexus.local', 8900.00::numeric, 'failed'::tx_status, 'E_BALANCE', '餘額不足', (CURRENT_DATE - INTERVAL '2 day')::timestamptz + INTERVAL '08 hour 50 minute'),
    ('demo.vip.1@nexus.local', 98000.00::numeric, 'success'::tx_status, NULL::varchar, NULL::varchar, (CURRENT_DATE - INTERVAL '3 day')::timestamptz + INTERVAL '10 hour 40 minute'),
    ('demo.premium.2@nexus.local', 150000.00::numeric, 'failed'::tx_status, 'E_ACCOUNT', '收款帳號不存在', (CURRENT_DATE - INTERVAL '4 day')::timestamptz + INTERVAL '13 hour 15 minute')
)
INSERT INTO transactions (
  user_id,
  amount,
  currency,
  from_account,
  to_account,
  status,
  error_code,
  error_message,
  channel,
  created_at
)
SELECT
  du.id,
  ts.amount,
  'TWD',
  '700-' || LPAD(du.id::text, 6, '0'),
  '900-' || LPAD((du.id + 1000)::text, 6, '0'),
  ts.status,
  ts.error_code,
  ts.error_message,
  'demo-seed-v1',
  ts.created_at
FROM tx_seed ts
JOIN demo_users du ON du.email = ts.email
WHERE NOT EXISTS (
  SELECT 1 FROM transactions t
  WHERE t.user_id = du.id
    AND t.channel = 'demo-seed-v1'
    AND t.created_at = ts.created_at
    AND t.amount = ts.amount
);

WITH log_seed AS (
  SELECT
    NOW() - make_interval(mins => s) AS created_at,
    CASE WHEN s % 13 = 0 THEN 502 WHEN s % 17 = 0 THEN 500 ELSE 200 END AS status_code,
    85 + ((s * 19) % 220) AS response_time_ms
  FROM generate_series(1, 60) AS s
)
INSERT INTO api_logs (method, path, status_code, response_time_ms, created_at)
SELECT
  'GET',
  '/seed/demo',
  ls.status_code,
  ls.response_time_ms,
  ls.created_at
FROM log_seed ls
WHERE NOT EXISTS (
  SELECT 1 FROM api_logs a
  WHERE a.path = '/seed/demo'
    AND a.created_at = ls.created_at
);
