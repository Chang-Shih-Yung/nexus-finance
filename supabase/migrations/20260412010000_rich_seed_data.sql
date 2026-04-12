-- ============================================================
-- Rich Seed Data: 90 days of realistic banking demo data
-- Idempotent: uses ON CONFLICT / WHERE NOT EXISTS guards
-- Tags: channel='rich-seed-v2', metadata->>'seed'='rich-v2'
-- ============================================================
BEGIN;

-- ════════════════════════════════════════════════════════════════
-- 1. Additional Users (14 new → 20+ total)
-- ════════════════════════════════════════════════════════════════
INSERT INTO users (name, email, phone, tier, rm_name, branch, status, created_at, last_login_at)
VALUES
  -- general (5)
  ('黃俊傑', 'rich2.general.1@nexus.local', '0922100001', 'general', '陳理專', '台北分行',     'active', NOW()-'120 days'::interval, NOW()-'2 hours'::interval),
  ('張淑惠', 'rich2.general.2@nexus.local', '0922100002', 'general', '李理專', '高雄分行',     'active', NOW()-'110 days'::interval, NOW()-'4 hours'::interval),
  ('陳冠宇', 'rich2.general.3@nexus.local', '0922100003', 'general', '劉理專', '台南分行',     'active', NOW()-'105 days'::interval, NOW()-'1 day'::interval),
  ('楊雅琪', 'rich2.general.4@nexus.local', '0922100004', 'general', '林理專', '新竹分行',     'active', NOW()-'100 days'::interval, NOW()-'3 hours'::interval),
  ('王志豪', 'rich2.general.5@nexus.local', '0922100005', 'general', '張理專', '桃園分行',     'active', NOW()-'95 days'::interval,  NOW()-'6 hours'::interval),
  -- vip (5)
  ('林佳蓉', 'rich2.vip.1@nexus.local',     '0922200001', 'vip',     '王理專', '台中分行',     'active', NOW()-'115 days'::interval, NOW()-'1 hour'::interval),
  ('趙建宏', 'rich2.vip.2@nexus.local',     '0922200002', 'vip',     '趙理專', '台北南區分行', 'active', NOW()-'108 days'::interval, NOW()-'30 minutes'::interval),
  ('廖雅雯', 'rich2.vip.3@nexus.local',     '0922200003', 'vip',     '陳理專', '台北分行',     'active', NOW()-'100 days'::interval, NOW()-'2 hours'::interval),
  ('蕭偉倫', 'rich2.vip.4@nexus.local',     '0922200004', 'vip',     '李理專', '高雄分行',     'active', NOW()-'92 days'::interval,  NOW()-'45 minutes'::interval),
  ('呂美琳', 'rich2.vip.5@nexus.local',     '0922200005', 'vip',     '劉理專', '台南分行',     'active', NOW()-'88 days'::interval,  NOW()-'1 hour'::interval),
  -- premium (4)
  ('鄧宗翰', 'rich2.premium.1@nexus.local', '0922300001', 'premium', '王理專', '台中分行',     'active', NOW()-'118 days'::interval, NOW()-'15 minutes'::interval),
  ('曾雅芳', 'rich2.premium.2@nexus.local', '0922300002', 'premium', '張理專', '桃園分行',     'active', NOW()-'112 days'::interval, NOW()-'20 minutes'::interval),
  ('盧家銘', 'rich2.premium.3@nexus.local', '0922300003', 'premium', '趙理專', '台北南區分行', 'active', NOW()-'106 days'::interval, NOW()-'10 minutes'::interval),
  ('方淑芬', 'rich2.premium.4@nexus.local', '0922300004', 'premium', '林理專', '新竹分行',     'active', NOW()-'98 days'::interval,  NOW()-'5 minutes'::interval)
ON CONFLICT (email) DO NOTHING;

-- Link new users to branches
UPDATE users SET branch_id = (SELECT id FROM branches WHERE name = users.branch LIMIT 1)
WHERE branch_id IS NULL AND branch IS NOT NULL;

-- ════════════════════════════════════════════════════════════════
-- 2. Events (~2500+ rows): logins, transfers for 90 days
-- ════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM events WHERE metadata @> '{"seed":"rich-v2"}' LIMIT 1) THEN
    RAISE NOTICE 'rich-v2 events already exist, skipping.';
    RETURN;
  END IF;

  -- Login events: variable per user per day (more weekdays, fewer weekends)
  INSERT INTO events (user_id, event_type, metadata, created_at)
  SELECT
    u.id,
    'login'::event_type,
    '{"seed":"rich-v2"}'::jsonb,
    (CURRENT_DATE - d) + (interval '7 hours' + random() * interval '14 hours')
  FROM users u
  CROSS JOIN generate_series(0, 89) d
  -- Generate variable number of logins per user-day using a lateral unnest trick
  CROSS JOIN generate_series(1, 6) login_n
  WHERE u.email LIKE '%@nexus.local'
    -- Weekday users have more logins; weekend users fewer
    AND login_n <= CASE
      WHEN EXTRACT(DOW FROM CURRENT_DATE - d) IN (0,6) THEN 2 + (u.id % 3)        -- 2-4 weekend
      ELSE 3 + (u.id % 5)                                                           -- 3-7 weekday
    END;

  -- Transfer init events: 1-3 per active user per day
  INSERT INTO events (user_id, event_type, metadata, created_at)
  SELECT
    u.id,
    'transfer_init'::event_type,
    '{"seed":"rich-v2"}'::jsonb,
    (CURRENT_DATE - d) + (interval '8 hours' + random() * interval '10 hours')
  FROM users u
  CROSS JOIN generate_series(0, 89) d
  CROSS JOIN generate_series(1, 3) tx_n
  WHERE u.email LIKE '%@nexus.local'
    AND tx_n <= CASE
      WHEN EXTRACT(DOW FROM CURRENT_DATE - d) IN (0,6) THEN 1
      ELSE 1 + (u.id % 3)
    END
    -- not every user is active every day
    AND (u.id + d) % 4 <> 0;

  -- Transfer success/failed mirroring inits (approx 80% success)
  INSERT INTO events (user_id, event_type, metadata, created_at)
  SELECT
    e.user_id,
    CASE WHEN random() < 0.80 THEN 'transfer_success'::event_type
         ELSE 'transfer_failed'::event_type
    END,
    '{"seed":"rich-v2"}'::jsonb,
    e.created_at + interval '5 seconds' + random() * interval '30 seconds'
  FROM events e
  WHERE e.event_type = 'transfer_init'
    AND e.metadata @> '{"seed":"rich-v2"}';
END $$;

-- ════════════════════════════════════════════════════════════════
-- 3. Transactions (~1800+ rows) over 90 days
-- ════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM transactions WHERE channel LIKE '%rich-seed-v2%' LIMIT 1) THEN
    RAISE NOTICE 'rich-seed-v2 transactions already exist, skipping.';
    RETURN;
  END IF;

  INSERT INTO transactions (
    user_id, amount, currency, from_account, to_account,
    status, error_code, error_message, channel, category, created_at
  )
  WITH day_series AS (
    SELECT d, EXTRACT(DOW FROM CURRENT_DATE - d) AS dow FROM generate_series(0, 89) d
  ),
  user_days AS (
    SELECT u.id AS uid, u.tier, ds.d, ds.dow,
           generate_series(1, CASE
             WHEN ds.dow IN (0,6) THEN 8 + (u.id % 5)   -- 8-12 weekend
             ELSE 15 + (u.id % 11)                        -- 15-25 weekday
           END) AS tx_n
    FROM users u CROSS JOIN day_series ds
    WHERE u.email LIKE '%@nexus.local'
      -- not every user transacts every day
      AND (u.id + ds.d) % 3 <> 0
  ),
  raw_tx AS (
    SELECT
      uid, tier, d, tx_n,
      random() AS r_status,
      random() AS r_amount,
      random() AS r_chan,
      random() AS r_cat,
      random() AS r_hour
    FROM user_days
    -- limit to roughly 20 tx per day across all users by sampling
    WHERE tx_n <= 2
  )
  SELECT
    uid,
    CASE tier
      WHEN 'general' THEN (5000  + floor(r_amount * 45000))::numeric
      WHEN 'vip'     THEN (20000 + floor(r_amount * 280000))::numeric
      ELSE                (50000 + floor(r_amount * 750000))::numeric
    END,
    'TWD',
    '700-' || lpad(uid::text, 6, '0'),
    '900-' || lpad(((uid * 37 + d * 13 + tx_n) % 9000 + 1000)::text, 6, '0'),
    CASE WHEN r_status < 0.12 THEN 'failed'::tx_status ELSE 'success'::tx_status END,
    CASE
      WHEN r_status < 0.03 THEN 'E_TIMEOUT'
      WHEN r_status < 0.06 THEN 'E_BALANCE'
      WHEN r_status < 0.08 THEN 'E_FRAUD'
      WHEN r_status < 0.10 THEN 'E_ACCOUNT'
      WHEN r_status < 0.12 THEN 'E_SYSTEM'
      ELSE NULL
    END,
    CASE
      WHEN r_status < 0.03 THEN '上游核心系統逾時'
      WHEN r_status < 0.06 THEN '餘額不足'
      WHEN r_status < 0.08 THEN '疑似異常交易已凍結'
      WHEN r_status < 0.10 THEN '收款帳號不存在'
      WHEN r_status < 0.12 THEN '系統維護中'
      ELSE NULL
    END,
    -- channel: mobile 40%, web 30%, atm 15%, branch 15%
    CASE
      WHEN r_chan < 0.40 THEN 'mobile|rich-seed-v2'
      WHEN r_chan < 0.70 THEN 'web|rich-seed-v2'
      WHEN r_chan < 0.85 THEN 'atm|rich-seed-v2'
      ELSE                    'branch|rich-seed-v2'
    END,
    CASE
      WHEN r_cat < 0.35 THEN 'transfer'
      WHEN r_cat < 0.60 THEN 'payment'
      WHEN r_cat < 0.80 THEN 'deposit'
      ELSE                    'withdrawal'
    END,
    (CURRENT_DATE - d) + (interval '6 hours' + r_hour * interval '15 hours')
  FROM raw_tx;
END $$;

-- ════════════════════════════════════════════════════════════════
-- 4. Daily Snapshots (~900+ rows)
-- ════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_date DATE;
  v_day  INT;
  v_base NUMERIC;
  v_dow  INT;
BEGIN
  -- Guard: skip if snapshots for 90 days ago already exist with rich data density
  IF (SELECT COUNT(*) FROM daily_snapshots
      WHERE date = CURRENT_DATE - 89
        AND metric_key = 'txn_count' AND dimension = 'channel') > 2 THEN
    RAISE NOTICE 'rich-v2 snapshots likely exist, skipping.';
    RETURN;
  END IF;

  FOR v_day IN 0..89 LOOP
    v_date := CURRENT_DATE - v_day;
    v_dow  := EXTRACT(DOW FROM v_date);
    -- growth factor: older days have lower base (slight uptrend)
    v_base := 1.0 + (90 - v_day) * 0.003;

    -- Delete any existing snapshots for this date to avoid duplication
    DELETE FROM daily_snapshots WHERE date = v_date;

    -- txn_count total
    INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
    VALUES (v_date, 'txn_count', 'total', '_all',
      CASE WHEN v_dow IN (0,6)
        THEN floor(85 * v_base + random() * 30)
        ELSE floor(150 * v_base + random() * 60)
      END);

    -- txn_count by tier
    INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
    VALUES
      (v_date, 'txn_count', 'tier', 'general', floor(60 * v_base + random() * 20)),
      (v_date, 'txn_count', 'tier', 'vip',     floor(40 * v_base + random() * 15)),
      (v_date, 'txn_count', 'tier', 'premium', floor(25 * v_base + random() * 10));

    -- txn_count by channel
    INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
    VALUES
      (v_date, 'txn_count', 'channel', 'mobile', floor(55 * v_base + random() * 20)),
      (v_date, 'txn_count', 'channel', 'web',    floor(40 * v_base + random() * 15)),
      (v_date, 'txn_count', 'channel', 'atm',    floor(18 * v_base + random() * 8)),
      (v_date, 'txn_count', 'channel', 'branch', floor(15 * v_base + random() * 8));

    -- txn_amount total
    INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
    VALUES (v_date, 'txn_amount', 'total', '_all',
      CASE WHEN v_dow IN (0,6)
        THEN floor(4500000 * v_base + random() * 1500000)
        ELSE floor(8200000 * v_base + random() * 3000000)
      END);

    -- txn_amount by tier
    INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
    VALUES
      (v_date, 'txn_amount', 'tier', 'general', floor(1200000 * v_base + random() * 500000)),
      (v_date, 'txn_amount', 'tier', 'vip',     floor(2800000 * v_base + random() * 1000000)),
      (v_date, 'txn_amount', 'tier', 'premium', floor(4500000 * v_base + random() * 2000000));

    -- success_rate total
    INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
    VALUES (v_date, 'success_rate', 'total', '_all',
      round((87 + random() * 8)::numeric, 2));

    -- error_count total + by error_code
    INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
    VALUES
      (v_date, 'error_count', 'total',      '_all',       floor(8 + random() * 12)),
      (v_date, 'error_count', 'error_code', 'E_TIMEOUT',  floor(2 + random() * 4)),
      (v_date, 'error_count', 'error_code', 'E_BALANCE',  floor(2 + random() * 3)),
      (v_date, 'error_count', 'error_code', 'E_FRAUD',    floor(1 + random() * 2)),
      (v_date, 'error_count', 'error_code', 'E_ACCOUNT',  floor(1 + random() * 2)),
      (v_date, 'error_count', 'error_code', 'E_SYSTEM',   floor(0 + random() * 2));

    -- error_rate total
    INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
    VALUES (v_date, 'error_rate', 'total', '_all',
      round((5 + random() * 8)::numeric, 2));

    -- login_count total + by channel
    INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
    VALUES
      (v_date, 'login_count', 'total',   '_all',    CASE WHEN v_dow IN (0,6) THEN floor(120 + random()*40) ELSE floor(220 + random()*60) END),
      (v_date, 'login_count', 'channel', 'mobile',  floor(90 * v_base + random() * 30)),
      (v_date, 'login_count', 'channel', 'web',     floor(60 * v_base + random() * 20));

    -- active_users total
    INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
    VALUES (v_date, 'active_users', 'total', '_all',
      CASE WHEN v_dow IN (0,6) THEN floor(12 + random()*4) ELSE floor(18 + random()*5) END);

    -- avg_balance total
    INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
    VALUES (v_date, 'avg_balance', 'total', '_all',
      floor(185000 * v_base + random() * 30000));
  END LOOP;
END $$;

-- ════════════════════════════════════════════════════════════════
-- 5. Revenue Daily (~500+ rows): 90 days x 7 branches x 5 products
-- ════════════════════════════════════════════════════════════════
DO $$
BEGIN
  -- Guard: skip if rich-v2 era revenue already present
  IF (SELECT COUNT(*) FROM revenue_daily
      WHERE date >= CURRENT_DATE - 89 AND date <= CURRENT_DATE) > 400 THEN
    RAISE NOTICE 'rich-v2 revenue_daily likely exists, skipping.';
    RETURN;
  END IF;

  INSERT INTO revenue_daily (date, product_type, branch_id, interest_income, fee_income)
  SELECT
    (CURRENT_DATE - d)          AS date,
    pt.product_type,
    b.id                        AS branch_id,
    -- interest income: base varies by product, grows slightly over time
    round((pt.int_base * (1 + (90 - d) * 0.002) * (0.8 + random() * 0.4))::numeric, 2),
    round((pt.fee_base * (1 + (90 - d) * 0.002) * (0.7 + random() * 0.6))::numeric, 2)
  FROM generate_series(0, 89) d
  CROSS JOIN branches b
  CROSS JOIN (VALUES
    ('lending',    85000, 12000),
    ('deposits',   45000, 8000),
    ('fees',       5000,  35000),
    ('fx',         15000, 18000),
    ('wealth_mgmt',30000, 25000)
  ) AS pt(product_type, int_base, fee_base)
  -- Sample ~15% to keep row count manageable (~470 rows)
  WHERE (b.id + d) % 3 = 0 OR d % 7 = 0;
END $$;

-- ════════════════════════════════════════════════════════════════
-- 6. API Logs (~3000+ rows): focused on last 7 days
-- ════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM api_logs WHERE path LIKE '/api/v2/%' LIMIT 1) THEN
    RAISE NOTICE 'rich-v2 api_logs already exist, skipping.';
    RETURN;
  END IF;

  INSERT INTO api_logs (method, path, status_code, response_time_ms, created_at)
  SELECT
    CASE WHEN random() < 0.3 THEN 'POST' ELSE 'GET' END,
    CASE floor(random() * 4)
      WHEN 0 THEN '/api/v2/transfer'
      WHEN 1 THEN '/api/v2/balance'
      WHEN 2 THEN '/api/v2/login'
      ELSE        '/api/v2/accounts'
    END,
    -- 95% 200, 3% 500, 2% 502
    CASE
      WHEN r_err < 0.95 THEN 200
      WHEN r_err < 0.98 THEN 500
      ELSE                    502
    END,
    CASE
      WHEN r_err >= 0.95 THEN (500 + floor(random() * 1500))::int  -- errors are slow
      ELSE (50 + floor(random() * 250))::int                        -- normal
    END,
    -- Spread across 7 days; more during business hours
    (CURRENT_DATE - d) + (
      CASE
        WHEN random() < 0.7 THEN interval '8 hours' + random() * interval '10 hours'  -- 8am-6pm
        ELSE random() * interval '24 hours'
      END
    )
  FROM generate_series(0, 6) d
  CROSS JOIN (
    SELECT s, random() AS r_err
    FROM generate_series(1, 450) s
  ) reqs;
END $$;

-- ════════════════════════════════════════════════════════════════
-- 7. Customer Feedback (~120 rows) spread over 90 days
-- ════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM customer_feedback WHERE created_at >= CURRENT_DATE - 90) > 80 THEN
    RAISE NOTICE 'rich-v2 feedback likely exists, skipping.';
    RETURN;
  END IF;

  INSERT INTO customer_feedback (user_id, channel, score, category, comment, created_at)
  SELECT
    u.id,
    (ARRAY['app','branch','call_center','web'])[1 + floor(random()*4)],
    -- NPS: weighted toward 7-9; occasional low scores
    CASE
      WHEN random() < 0.08 THEN floor(random() * 4)::int          -- 0-3 detractor
      WHEN random() < 0.25 THEN (5 + floor(random() * 2))::int    -- 5-6 passive
      ELSE                      (7 + floor(random() * 3))::int    -- 7-9 promoter
    END,
    (ARRAY['service','product','app_ux','wait_time','fees'])[1 + floor(random()*5)],
    CASE floor(random() * 6)
      WHEN 0 THEN '轉帳速度很快，很滿意'
      WHEN 1 THEN 'APP偶爾會閃退，希望改善'
      WHEN 2 THEN '分行服務態度很好'
      WHEN 3 THEN '等待時間太長'
      WHEN 4 THEN '手續費希望能再降低'
      ELSE        '整體使用體驗不錯'
    END,
    (CURRENT_DATE - floor(random() * 90)::int) + random() * interval '12 hours'
  FROM users u
  CROSS JOIN generate_series(1, 6) n
  WHERE u.email LIKE '%@nexus.local'
    -- sample ~40% of user-repeat combos to get ~120 rows
    AND (u.id + n) % 3 = 0;
END $$;

-- ════════════════════════════════════════════════════════════════
-- 8. Fraud Alerts (18 rows) — past 14 days
-- ════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM fraud_alerts WHERE created_at >= CURRENT_DATE - 14) > 10 THEN
    RAISE NOTICE 'rich-v2 fraud_alerts likely exist, skipping.';
    RETURN;
  END IF;

  INSERT INTO fraud_alerts (user_id, alert_type, severity, description, status, amount, created_at)
  SELECT
    u_id,
    alert_t,
    sev,
    descr,
    stat,
    amt,
    (CURRENT_DATE - d) + interval '9 hours' + random() * interval '10 hours'
  FROM (VALUES
    -- critical (2)
    (1, 'unusual_amount',    'critical', '單筆交易金額異常偏高，超過歷史平均10倍',          'investigating', 2850000, 1),
    (2, 'rapid_succession',  'critical', '5分鐘內連續發起12筆跨行轉帳',                      'open',          1200000, 0),
    -- high (3)
    (3, 'after_hours',       'high',     '凌晨3點大額轉帳至境外帳戶',                        'investigating', 980000,  2),
    (4, 'new_device',        'high',     '從未知裝置登入並立即變更密碼與轉帳',                'resolved',      450000,  4),
    (5, 'unusual_location',  'high',     '同一帳號於台北與高雄同時登入',                      'investigating', 320000,  3),
    -- medium (5)
    (6, 'unusual_amount',    'medium',   '交易金額超過月均值3倍',                              'resolved',      185000,  5),
    (7, 'rapid_succession',  'medium',   '短時間內多次小額轉帳至不同帳戶',                    'false_positive', 95000,  6),
    (8, 'new_device',        'medium',   '新裝置首次登入，已觸發簡訊驗證',                    'resolved',      0,       7),
    (9, 'after_hours',       'medium',   '非營業時間嘗試大額提款',                            'false_positive', 250000, 8),
    (10,'unusual_location',  'medium',   'VPN連線偵測，登入地點與常用地不符',                  'investigating', 0,       9),
    -- low (5)
    (11,'new_device',        'low',      '平板裝置首次登入網銀',                              'false_positive', 0,      10),
    (12,'unusual_amount',    'low',      '轉帳金額略高於日常範圍',                            'resolved',       78000, 11),
    (13,'after_hours',       'low',      '晚間11點行動銀行轉帳',                              'false_positive', 35000, 12),
    (14,'unusual_location',  'low',      '出差地點登入，已通過雙因素驗證',                    'resolved',       0,     13),
    (1, 'rapid_succession',  'low',      '連續查詢餘額5次',                                    'open',          0,      7),
    -- extra (3)
    (3, 'unusual_amount',    'medium',   '信用卡單筆消費異常',                                'open',          125000,  1),
    (5, 'new_device',        'high',     '海外IP登入嘗試',                                    'investigating', 0,       0),
    (7, 'after_hours',       'low',      '深夜自動扣款觸發警示',                              'resolved',      42000,   2)
  ) AS v(u_idx, alert_t, sev, descr, stat, amt, d)
  CROSS JOIN LATERAL (
    SELECT id AS u_id FROM users WHERE email LIKE '%@nexus.local' ORDER BY id OFFSET v.u_idx - 1 LIMIT 1
  ) usr;
END $$;

COMMIT;
