-- Dashboard overhaul seed: branches, accounts, user-branch links, tx categories, daily_snapshots
-- Safe re-run: uses IF NOT EXISTS / ON CONFLICT patterns

-- ── Step 1: Branches ────────────────────────────────────────────

INSERT INTO branches (name, region) VALUES
  ('台北分行',     '北區'),
  ('新竹分行',     '北區'),
  ('桃園分行',     '北區'),
  ('台中分行',     '中區'),
  ('台南分行',     '南區'),
  ('高雄分行',     '南區'),
  ('台北南區分行', '北區')
ON CONFLICT DO NOTHING;

-- ── Step 2: Link users to branches ──────────────────────────────

UPDATE users SET branch_id = (SELECT id FROM branches WHERE name = users.branch LIMIT 1)
WHERE branch_id IS NULL AND branch IS NOT NULL;

-- ── Step 3: Accounts for all users ──────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM accounts LIMIT 1) THEN
    RAISE NOTICE 'accounts already exist, skipping.';
    RETURN;
  END IF;

  INSERT INTO accounts (user_id, account_type, balance, currency, opened_at)
  SELECT
    u.id,
    CASE
      WHEN u.tier = 'premium' THEN 'wealth'
      WHEN u.tier = 'vip' THEN 'savings'
      ELSE 'checking'
    END,
    CASE
      WHEN u.tier = 'premium' THEN 500000 + (u.id * 73 % 300000)
      WHEN u.tier = 'vip' THEN 150000 + (u.id * 53 % 100000)
      ELSE 20000 + (u.id * 37 % 50000)
    END,
    'TWD',
    u.created_at
  FROM users u;
END $$;

-- ── Step 4: Add categories to existing transactions ─────────────

UPDATE transactions
SET category = CASE
  WHEN (id % 5) = 0 THEN 'deposit'
  WHEN (id % 5) = 1 THEN 'withdrawal'
  WHEN (id % 5) = 2 THEN 'payment'
  WHEN (id % 5) = 3 THEN 'loan'
  ELSE 'transfer'
END
WHERE category IS NULL OR category = 'transfer';

-- ── Step 5: Generate daily_snapshots for 30 days ────────────────

DO $$
DECLARE
  v_date DATE;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_txn_count BIGINT;
BEGIN
  IF EXISTS (SELECT 1 FROM daily_snapshots LIMIT 1) THEN
    RAISE NOTICE 'daily_snapshots already exist, skipping.';
    RETURN;
  END IF;

  FOR v_date IN SELECT d::DATE FROM generate_series(CURRENT_DATE - 30, CURRENT_DATE, '1 day'::INTERVAL) AS d
  LOOP
    v_start := v_date::TIMESTAMPTZ;
    v_end := (v_date + 1)::TIMESTAMPTZ;

    -- Check if there's data for this day
    SELECT COUNT(*) INTO v_txn_count FROM transactions WHERE created_at >= v_start AND created_at < v_end;

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

    -- txn_amount by channel
    INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
    SELECT v_date, 'txn_amount', 'channel', COALESCE(channel, 'web'), COALESCE(SUM(amount), 0)
    FROM transactions WHERE created_at >= v_start AND created_at < v_end
    GROUP BY COALESCE(channel, 'web');

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

  END LOOP;
END $$;
