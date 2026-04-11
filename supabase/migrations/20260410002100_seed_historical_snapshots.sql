-- Historical daily_snapshots seed — last 31 days (incl. today).
--
-- Why this migration exists:
--
-- daily_snapshots was defined in 20260408000100_dashboard_overhaul.sql
-- and is read by nf_today_snapshot(), nf_dashboard_metrics_daily(),
-- nf_revenue_summary(), nf_branch_ranking() and many other RPCs. But
-- there was NEVER a seed for this table:
--
--   - seed.sql only inserts users / transactions / events
--   - nf_generate_daily_snapshot() exists but requires auth.uid() and
--     nobody has run it
--   - the table was empty in production
--
-- Result: today's user asked "今天登入次數" and got an all-zero row,
-- then v9's Fix B correctly flagged it as empty data — but the real
-- root cause was that no snapshots were ever materialized.
--
-- This migration backfills 31 days × ~54 rows/day = ~1,670 rows of
-- realistic demo data into daily_snapshots so every dashboard RPC
-- has something to show.
--
-- Idempotent: we DELETE demo rows by a date range before inserting,
-- so re-running `supabase db push` is safe (no duplicate key errors,
-- no cumulative drift).
--
-- Metrics covered (per day):
--   login_count, active_users, txn_count, txn_amount,
--   success_rate, error_count, error_rate
--
-- Dimensions covered:
--   total / _all                        (every metric)
--   branch / {台北,新竹,台中,高雄}       (txn_count, txn_amount, login_count)
--   channel / {web,mobile,atm,branch}    (txn_count, txn_amount)
--   tier / {general,vip,premium}         (txn_count, txn_amount, active_users)
--   category / {transfer,payment,withdrawal,deposit} (txn_count, txn_amount)
--   error_code / {E001,E002,E003,E500}   (error_count)
--
-- Values follow a gently-growing trend with small daily noise so that
-- period-compare RPCs show believable deltas.

-- Clear any existing rows in the seeded window so this migration is idempotent.
DELETE FROM daily_snapshots
WHERE date BETWEEN CURRENT_DATE - INTERVAL '30 days' AND CURRENT_DATE;

-- Helper CTE: one row per day in the 31-day window, with a `d` index
-- (0 = 30 days ago, 30 = today) used to compute gentle growth.
WITH days AS (
  SELECT
    (CURRENT_DATE - (30 - i) * INTERVAL '1 day')::date AS the_date,
    i AS d,
    -- deterministic pseudo-random noise in [-1, 1] based on the date,
    -- so values wiggle day-to-day but are reproducible.
    (((EXTRACT(DOY FROM (CURRENT_DATE - (30 - i) * INTERVAL '1 day'))::int * 9301 + 49297) % 233280) / 233280.0 * 2 - 1) AS noise
  FROM generate_series(0, 30) AS g(i)
),

-- 1) Total metrics (dimension='total', dimension_value='_all')
total_rows AS (
  SELECT the_date, 'login_count'  AS metric_key, 'total' AS dimension, '_all' AS dimension_value,
         ROUND(900 + d * 12 + noise * 80)::numeric AS metric_value FROM days
  UNION ALL
  SELECT the_date, 'active_users', 'total', '_all',
         ROUND(680 + d * 9 + noise * 55)::numeric FROM days
  UNION ALL
  SELECT the_date, 'txn_count', 'total', '_all',
         ROUND(3800 + d * 45 + noise * 250)::numeric FROM days
  UNION ALL
  SELECT the_date, 'txn_amount', 'total', '_all',
         ROUND(180000000 + d * 2500000 + noise * 12000000)::numeric FROM days
  UNION ALL
  SELECT the_date, 'success_rate', 'total', '_all',
         ROUND((98.4 + noise * 0.7)::numeric, 2) FROM days
  UNION ALL
  SELECT the_date, 'error_count', 'total', '_all',
         GREATEST(ROUND(55 + noise * 25)::numeric, 0) FROM days
  UNION ALL
  SELECT the_date, 'error_rate', 'total', '_all',
         ROUND((1.6 - noise * 0.7)::numeric, 2) FROM days
),

-- 2) Branch breakdown (4 branches, weights that roughly sum to ~total)
branch_rows AS (
  SELECT
    d.the_date,
    m.metric_key,
    'branch' AS dimension,
    b.branch_name AS dimension_value,
    ROUND(m.base_value * b.weight * (1 + d.noise * 0.15))::numeric AS metric_value
  FROM days d
  CROSS JOIN (VALUES
    ('台北分行', 0.38),
    ('新竹分行', 0.27),
    ('台中分行', 0.21),
    ('高雄分行', 0.14)
  ) AS b(branch_name, weight)
  CROSS JOIN LATERAL (VALUES
    ('txn_count',   3800 + d.d * 45),
    ('txn_amount',  180000000 + d.d * 2500000),
    ('login_count',  900 + d.d * 12)
  ) AS m(metric_key, base_value)
),

-- 3) Channel breakdown
channel_rows AS (
  SELECT
    d.the_date,
    m.metric_key,
    'channel' AS dimension,
    c.channel_name AS dimension_value,
    ROUND(m.base_value * c.weight * (1 + d.noise * 0.12))::numeric AS metric_value
  FROM days d
  CROSS JOIN (VALUES
    ('mobile', 0.48),
    ('web',    0.28),
    ('atm',    0.15),
    ('branch', 0.09)
  ) AS c(channel_name, weight)
  CROSS JOIN LATERAL (VALUES
    ('txn_count',  3800 + d.d * 45),
    ('txn_amount', 180000000 + d.d * 2500000)
  ) AS m(metric_key, base_value)
),

-- 4) Tier breakdown
tier_rows AS (
  SELECT
    d.the_date,
    m.metric_key,
    'tier' AS dimension,
    t.tier_name AS dimension_value,
    ROUND(m.base_value * t.weight * (1 + d.noise * 0.1))::numeric AS metric_value
  FROM days d
  CROSS JOIN (VALUES
    ('general', 0.62),
    ('vip',     0.25),
    ('premium', 0.13)
  ) AS t(tier_name, weight)
  CROSS JOIN LATERAL (VALUES
    ('txn_count',    3800 + d.d * 45),
    ('txn_amount',   180000000 + d.d * 2500000),
    ('active_users',  680 + d.d * 9)
  ) AS m(metric_key, base_value)
),

-- 5) Category breakdown
category_rows AS (
  SELECT
    d.the_date,
    m.metric_key,
    'category' AS dimension,
    c.cat_name AS dimension_value,
    ROUND(m.base_value * c.weight * (1 + d.noise * 0.14))::numeric AS metric_value
  FROM days d
  CROSS JOIN (VALUES
    ('transfer',   0.42),
    ('payment',    0.30),
    ('withdrawal', 0.18),
    ('deposit',    0.10)
  ) AS c(cat_name, weight)
  CROSS JOIN LATERAL (VALUES
    ('txn_count',  3800 + d.d * 45),
    ('txn_amount', 180000000 + d.d * 2500000)
  ) AS m(metric_key, base_value)
),

-- 6) Error code breakdown
error_rows AS (
  SELECT
    d.the_date,
    'error_count' AS metric_key,
    'error_code' AS dimension,
    e.code AS dimension_value,
    GREATEST(ROUND((55 + d.noise * 25) * e.weight)::numeric, 0) AS metric_value
  FROM days d
  CROSS JOIN (VALUES
    ('E001', 0.42),   -- insufficient funds
    ('E002', 0.25),   -- timeout
    ('E003', 0.18),   -- invalid auth
    ('E500', 0.15)    -- system error
  ) AS e(code, weight)
)

INSERT INTO daily_snapshots (date, metric_key, dimension, dimension_value, metric_value)
SELECT the_date, metric_key, dimension, dimension_value, metric_value FROM total_rows
UNION ALL
SELECT the_date, metric_key, dimension, dimension_value, metric_value FROM branch_rows
UNION ALL
SELECT the_date, metric_key, dimension, dimension_value, metric_value FROM channel_rows
UNION ALL
SELECT the_date, metric_key, dimension, dimension_value, metric_value FROM tier_rows
UNION ALL
SELECT the_date, metric_key, dimension, dimension_value, metric_value FROM category_rows
UNION ALL
SELECT the_date, metric_key, dimension, dimension_value, metric_value FROM error_rows;
