-- ──────────────────────────────────────────────────────────────────────────────
-- Nexus Finance — Rich seed data (30-day historical)
-- Safe re-run sentinels:
--   transactions → channel = 'rich-seed-v1'
--   events       → metadata->>'seed' = 'rich-v1'
--   api_logs     → path LIKE '/api/rich/%'
-- ──────────────────────────────────────────────────────────────────────────────

-- ── Step 1: Additional users (14 new, varied tiers) ──────────────────────────

INSERT INTO users (name, email, phone, tier, rm_name, branch, status, created_at, last_login_at)
VALUES
  -- general (6 new)
  ('吳文凱', 'rich.general.1@nexus.local', '0921100001', 'general', '陳理專', '台北分行', 'active', NOW()-'90 days'::interval, NOW()-'3 hours'::interval),
  ('蔡雅婷', 'rich.general.2@nexus.local', '0921100002', 'general', '陳理專', '台北分行', 'active', NOW()-'85 days'::interval, NOW()-'5 hours'::interval),
  ('許建志', 'rich.general.3@nexus.local', '0921100003', 'general', '李理專', '高雄分行', 'active', NOW()-'70 days'::interval, NOW()-'1 day'::interval),
  ('洪玉珍', 'rich.general.4@nexus.local', '0921100004', 'general', '李理專', '高雄分行', 'active', NOW()-'65 days'::interval, NOW()-'2 days'::interval),
  ('鄭嘉豪', 'rich.general.5@nexus.local', '0921100005', 'general', '劉理專', '台南分行', 'active', NOW()-'55 days'::interval, NOW()-'4 hours'::interval),
  ('劉思穎', 'rich.general.6@nexus.local', '0921100006', 'general', '劉理專', '台南分行', 'active', NOW()-'50 days'::interval, NOW()-'6 hours'::interval),
  -- vip (4 new)
  ('朱國棟', 'rich.vip.1@nexus.local',     '0921200001', 'vip',     '林理專', '新竹分行', 'active', NOW()-'80 days'::interval, NOW()-'1 hour'::interval),
  ('簡美玲', 'rich.vip.2@nexus.local',     '0921200002', 'vip',     '林理專', '新竹分行', 'active', NOW()-'75 days'::interval, NOW()-'30 minutes'::interval),
  ('游志明', 'rich.vip.3@nexus.local',     '0921200003', 'vip',     '張理專', '桃園分行', 'active', NOW()-'60 days'::interval, NOW()-'2 hours'::interval),
  ('葉淑芬', 'rich.vip.4@nexus.local',     '0921200004', 'vip',     '張理專', '桃園分行', 'active', NOW()-'45 days'::interval, NOW()-'45 minutes'::interval),
  -- premium (4 new)
  ('徐承恩', 'rich.premium.1@nexus.local', '0921300001', 'premium', '王理專', '台中分行', 'active', NOW()-'100 days'::interval, NOW()-'20 minutes'::interval),
  ('謝雨柔', 'rich.premium.2@nexus.local', '0921300002', 'premium', '王理專', '台中分行', 'active', NOW()-'95 days'::interval, NOW()-'10 minutes'::interval),
  ('柯偉誠', 'rich.premium.3@nexus.local', '0921300003', 'premium', '趙理專', '台北南區分行', 'active', NOW()-'88 days'::interval, NOW()-'15 minutes'::interval),
  ('馬翠芳', 'rich.premium.4@nexus.local', '0921300004', 'premium', '趙理專', '台北南區分行', 'active', NOW()-'78 days'::interval, NOW()-'5 minutes'::interval)
ON CONFLICT (email) DO NOTHING;

-- ── Step 2: Bulk transactions (~600 over 30 days) ─────────────────────────────
-- Skip entirely if already seeded (safe re-run)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM transactions WHERE channel = 'rich-seed-v1' LIMIT 1) THEN
    RAISE NOTICE 'rich-seed-v1 transactions already exist, skipping.';
    RETURN;
  END IF;

  INSERT INTO transactions (
    user_id, amount, currency, from_account, to_account,
    status, error_code, error_message, channel, created_at
  )
  WITH raw AS (
    SELECT
      u.id        AS user_id,
      u.tier,
      s           AS series_n,
      random()    AS r_status,
      random()    AS r_amount,
      random()    AS r_jitter,
      random()    AS r_minute
    FROM users u
    CROSS JOIN generate_series(1, 30) s
    WHERE u.email LIKE '%@nexus.local'
  ),
  computed AS (
    SELECT
      user_id,
      -- amount ranges per tier
      CASE tier
        WHEN 'general' THEN (500  + floor(r_amount * 7500))::numeric
        WHEN 'vip'     THEN (5000 + floor(r_amount * 75000))::numeric
        ELSE                (50000 + floor(r_amount * 750000))::numeric
      END AS amount,
      -- 15% failure rate, spread across 4 error types
      CASE
        WHEN r_status < 0.04 THEN 'failed'::tx_status
        WHEN r_status < 0.08 THEN 'failed'::tx_status
        WHEN r_status < 0.11 THEN 'failed'::tx_status
        WHEN r_status < 0.15 THEN 'failed'::tx_status
        ELSE 'success'::tx_status
      END AS status,
      CASE
        WHEN r_status < 0.04 THEN 'E_TIMEOUT'
        WHEN r_status < 0.08 THEN 'E_BALANCE'
        WHEN r_status < 0.11 THEN 'E_ACCOUNT'
        WHEN r_status < 0.15 THEN 'E_FRAUD'
        ELSE NULL
      END AS error_code,
      CASE
        WHEN r_status < 0.04 THEN '上游核心系統逾時，請稍後再試'
        WHEN r_status < 0.08 THEN '餘額不足，請確認帳戶餘額後重新操作'
        WHEN r_status < 0.11 THEN '收款帳號不存在或已停用'
        WHEN r_status < 0.15 THEN '疑似異常交易，已暫時凍結，請聯繫客服'
        ELSE NULL
      END AS error_message,
      user_id     AS uid,
      series_n    AS s,
      r_jitter    AS rj,
      r_minute    AS rm
    FROM raw
  )
  SELECT
    c.user_id,
    c.amount,
    'TWD',
    '700-' || lpad(c.user_id::text, 6, '0'),
    '900-' || lpad(((c.user_id * 37 + c.s) % 9000 + 1000)::text, 6, '0'),
    c.status,
    c.error_code,
    c.error_message,
    'rich-seed-v1',
    -- spread evenly across 30 days, each series ~24h apart, with random jitter
    NOW() - INTERVAL '30 days'
      + (c.s * INTERVAL '24 hours')
      + (c.rj * INTERVAL '12 hours')
      + (c.rm * INTERVAL '50 minutes')
  FROM computed c;
END $$;

-- ── Step 3: Login + transfer events (mirrors transaction activity) ─────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM events WHERE metadata @> '{"seed":"rich-v1"}' LIMIT 1) THEN
    RAISE NOTICE 'rich-v1 events already exist, skipping.';
    RETURN;
  END IF;

  -- login events: one per user per day for the past 30 days
  INSERT INTO events (user_id, event_type, metadata, created_at)
  SELECT
    u.id,
    'login'::event_type,
    jsonb_build_object('seed', 'rich-v1', 'day', -s),
    NOW() - (s * INTERVAL '1 day') - (random() * INTERVAL '8 hours')
  FROM users u
  CROSS JOIN generate_series(0, 29) s
  WHERE u.email LIKE '%@nexus.local';

  -- transfer_init for each transaction from rich-seed-v1
  INSERT INTO events (user_id, event_type, metadata, created_at)
  SELECT
    t.user_id,
    'transfer_init'::event_type,
    jsonb_build_object('seed', 'rich-v1', 'tx_id', t.id),
    t.created_at - INTERVAL '2 minutes'
  FROM transactions t
  WHERE t.channel = 'rich-seed-v1';

  -- transfer_success or transfer_failed mirroring each transaction
  INSERT INTO events (user_id, event_type, metadata, created_at)
  SELECT
    t.user_id,
    CASE t.status
      WHEN 'success' THEN 'transfer_success'::event_type
      ELSE 'transfer_failed'::event_type
    END,
    jsonb_build_object('seed', 'rich-v1', 'tx_id', t.id, 'amount', t.amount),
    t.created_at
  FROM transactions t
  WHERE t.channel = 'rich-seed-v1';
END $$;

-- ── Step 4: API logs — last 60 min high-density + 30 days sparse ─────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM api_logs WHERE path LIKE '/api/rich/%' LIMIT 1) THEN
    RAISE NOTICE 'rich api_logs already exist, skipping.';
    RETURN;
  END IF;

  -- Last 60 minutes: 8 requests/minute → 480 rows (powers the health chart)
  INSERT INTO api_logs (method, path, status_code, response_time_ms, created_at)
  SELECT
    CASE (s * 7 + r) % 3 WHEN 0 THEN 'POST' ELSE 'GET' END,
    CASE (s * 3 + r) % 5
      WHEN 0 THEN '/api/rich/transfer'
      WHEN 1 THEN '/api/rich/accounts'
      WHEN 2 THEN '/api/rich/balance'
      WHEN 3 THEN '/api/rich/history'
      ELSE '/api/rich/auth'
    END,
    -- ~5% error rate: 500 (2%), 502 (2%), 400 (1%)
    CASE (s + r * 13) % 100
      WHEN 3  THEN 500
      WHEN 17 THEN 502
      WHEN 31 THEN 500
      WHEN 47 THEN 502
      WHEN 61 THEN 400
      ELSE 200
    END,
    -- latency: mostly 80-300ms, spikes to 400-700ms ~10% of time
    CASE WHEN (s + r) % 10 = 0
      THEN (400 + ((s * r) % 300))
      ELSE (80  + ((s * 19 + r * 7) % 220))
    END,
    NOW() - (s * INTERVAL '1 minute') - (r * INTERVAL '7 seconds')
  FROM generate_series(0, 59) s
  CROSS JOIN generate_series(0, 7)  r;

  -- Past 30 days: 2 requests/hour → fills trend context without bloat
  INSERT INTO api_logs (method, path, status_code, response_time_ms, created_at)
  SELECT
    CASE (h + d) % 3 WHEN 0 THEN 'POST' ELSE 'GET' END,
    CASE (h * 3 + d) % 4
      WHEN 0 THEN '/api/rich/transfer'
      WHEN 1 THEN '/api/rich/accounts'
      WHEN 2 THEN '/api/rich/balance'
      ELSE '/api/rich/history'
    END,
    CASE (h + d * 7) % 25 WHEN 0 THEN 500 WHEN 12 THEN 502 ELSE 200 END,
    (80 + ((h * 17 + d * 11) % 420)),
    NOW() - (d * INTERVAL '1 day') - (h * INTERVAL '1 hour')
  FROM generate_series(1, 30)  d
  CROSS JOIN generate_series(0, 23) h;
END $$;
