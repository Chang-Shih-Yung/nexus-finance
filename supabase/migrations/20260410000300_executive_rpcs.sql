-- ============================================================
-- RPCs for Executive Dashboard cards
-- ============================================================

-- ── Revenue ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION nf_revenue_summary(p_days INT DEFAULT 30)
RETURNS TABLE(
  total_revenue NUMERIC, interest_income NUMERIC, fee_income NUMERIC,
  daily_avg NUMERIC, prev_total NUMERIC, change_pct NUMERIC
) LANGUAGE sql SECURITY DEFINER AS $$
  WITH curr AS (
    SELECT COALESCE(SUM(total_revenue),0) AS tr, COALESCE(SUM(interest_income),0) AS ii, COALESCE(SUM(fee_income),0) AS fi
    FROM revenue_daily WHERE date > CURRENT_DATE - p_days
  ),
  prev AS (
    SELECT COALESCE(SUM(total_revenue),0) AS tr
    FROM revenue_daily WHERE date BETWEEN CURRENT_DATE - p_days*2 AND CURRENT_DATE - p_days
  )
  SELECT curr.tr, curr.ii, curr.fi,
    ROUND(curr.tr / GREATEST(p_days,1), 2),
    prev.tr,
    CASE WHEN prev.tr > 0 THEN ROUND(((curr.tr - prev.tr)/prev.tr)*100, 1) ELSE 0 END
  FROM curr, prev;
$$;
GRANT EXECUTE ON FUNCTION nf_revenue_summary TO authenticated;

CREATE OR REPLACE FUNCTION nf_revenue_by_product(p_days INT DEFAULT 30)
RETURNS TABLE(product_type TEXT, total_revenue NUMERIC, pct_of_total NUMERIC)
LANGUAGE sql SECURITY DEFINER AS $$
  WITH raw AS (
    SELECT product_type, SUM(total_revenue) AS tr
    FROM revenue_daily WHERE date > CURRENT_DATE - p_days
    GROUP BY product_type
  ),
  grand AS (SELECT SUM(tr) AS gt FROM raw)
  SELECT raw.product_type, raw.tr, ROUND((raw.tr / GREATEST(grand.gt,1))*100, 1)
  FROM raw, grand ORDER BY raw.tr DESC;
$$;
GRANT EXECUTE ON FUNCTION nf_revenue_by_product TO authenticated;

CREATE OR REPLACE FUNCTION nf_revenue_trend(p_days INT DEFAULT 30)
RETURNS TABLE(date DATE, total_revenue NUMERIC)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT date, SUM(total_revenue) FROM revenue_daily
  WHERE date > CURRENT_DATE - p_days
  GROUP BY date ORDER BY date;
$$;
GRANT EXECUTE ON FUNCTION nf_revenue_trend TO authenticated;

-- ── Loans ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION nf_loan_portfolio()
RETURNS TABLE(
  total_outstanding NUMERIC, loan_count BIGINT, avg_rate NUMERIC,
  overdue_count BIGINT, overdue_amount NUMERIC, npl_ratio NUMERIC,
  default_count BIGINT
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    SUM(outstanding),
    COUNT(*),
    ROUND(AVG(interest_rate),2),
    COUNT(*) FILTER (WHERE status='overdue'),
    COALESCE(SUM(outstanding) FILTER (WHERE status='overdue'),0),
    ROUND(COALESCE(SUM(outstanding) FILTER (WHERE status IN ('overdue','default')),0) / GREATEST(SUM(outstanding),1) * 100, 2),
    COUNT(*) FILTER (WHERE status='default')
  FROM loans WHERE status != 'paid_off';
$$;
GRANT EXECUTE ON FUNCTION nf_loan_portfolio TO authenticated;

CREATE OR REPLACE FUNCTION nf_loan_by_type()
RETURNS TABLE(loan_type TEXT, loan_count BIGINT, total_outstanding NUMERIC, avg_rate NUMERIC, overdue_count BIGINT)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT loan_type, COUNT(*), SUM(outstanding), ROUND(AVG(interest_rate),2),
    COUNT(*) FILTER (WHERE status='overdue')
  FROM loans WHERE status != 'paid_off'
  GROUP BY loan_type ORDER BY SUM(outstanding) DESC;
$$;
GRANT EXECUTE ON FUNCTION nf_loan_by_type TO authenticated;

-- ── Deposits ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION nf_deposit_summary()
RETURNS TABLE(total_deposits NUMERIC, account_count BIGINT, avg_balance NUMERIC, weighted_rate NUMERIC)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT SUM(balance), COUNT(*), ROUND(AVG(balance),0),
    ROUND(SUM(balance * interest_rate) / GREATEST(SUM(balance),1), 2)
  FROM deposits;
$$;
GRANT EXECUTE ON FUNCTION nf_deposit_summary TO authenticated;

CREATE OR REPLACE FUNCTION nf_deposit_by_product()
RETURNS TABLE(product_type TEXT, account_count BIGINT, total_balance NUMERIC, avg_rate NUMERIC)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT product_type, COUNT(*), SUM(balance), ROUND(AVG(interest_rate),2)
  FROM deposits GROUP BY product_type ORDER BY SUM(balance) DESC;
$$;
GRANT EXECUTE ON FUNCTION nf_deposit_by_product TO authenticated;

-- ── Compliance ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION nf_compliance_status()
RETURNS TABLE(
  category TEXT, total_items BIGINT, compliant BIGINT, warning BIGINT,
  violation BIGINT, pending BIGINT, avg_score NUMERIC
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT category, COUNT(*),
    COUNT(*) FILTER (WHERE status='compliant'),
    COUNT(*) FILTER (WHERE status='warning'),
    COUNT(*) FILTER (WHERE status='violation'),
    COUNT(*) FILTER (WHERE status='pending_review'),
    ROUND(AVG(score),1)
  FROM compliance_checks GROUP BY category ORDER BY category;
$$;
GRANT EXECUTE ON FUNCTION nf_compliance_status TO authenticated;

CREATE OR REPLACE FUNCTION nf_compliance_items(p_status TEXT DEFAULT NULL)
RETURNS TABLE(
  id INT, category TEXT, item_name TEXT, status TEXT, score NUMERIC,
  details TEXT, due_date DATE, checked_at TIMESTAMPTZ
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id, category, item_name, status, score, details, due_date, checked_at
  FROM compliance_checks
  WHERE (p_status IS NULL OR compliance_checks.status = p_status)
  ORDER BY
    CASE compliance_checks.status
      WHEN 'violation' THEN 0 WHEN 'warning' THEN 1
      WHEN 'pending_review' THEN 2 ELSE 3
    END, due_date;
$$;
GRANT EXECUTE ON FUNCTION nf_compliance_items TO authenticated;

-- ── Customer NPS ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION nf_customer_nps(p_days INT DEFAULT 30)
RETURNS TABLE(
  avg_score NUMERIC, total_responses BIGINT,
  promoters BIGINT, passives BIGINT, detractors BIGINT,
  nps_score NUMERIC
) LANGUAGE sql SECURITY DEFINER AS $$
  WITH scores AS (
    SELECT score FROM customer_feedback
    WHERE created_at > NOW() - (p_days || ' days')::interval
  )
  SELECT
    ROUND(AVG(score),1),
    COUNT(*),
    COUNT(*) FILTER (WHERE score >= 9),
    COUNT(*) FILTER (WHERE score BETWEEN 7 AND 8),
    COUNT(*) FILTER (WHERE score <= 6),
    ROUND(
      (COUNT(*) FILTER (WHERE score >= 9)::numeric / GREATEST(COUNT(*),1) -
       COUNT(*) FILTER (WHERE score <= 6)::numeric / GREATEST(COUNT(*),1)) * 100
    , 1)
  FROM scores;
$$;
GRANT EXECUTE ON FUNCTION nf_customer_nps TO authenticated;

CREATE OR REPLACE FUNCTION nf_customer_feedback_recent(p_limit INT DEFAULT 10)
RETURNS TABLE(
  user_name TEXT, channel TEXT, score INT, category TEXT, comment TEXT, created_at TIMESTAMPTZ
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT u.name, cf.channel, cf.score, cf.category, cf.comment, cf.created_at
  FROM customer_feedback cf JOIN users u ON u.id = cf.user_id
  ORDER BY cf.created_at DESC LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION nf_customer_feedback_recent TO authenticated;

-- ── Fraud Alerts ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION nf_fraud_summary()
RETURNS TABLE(
  total_alerts BIGINT, open_count BIGINT, investigating BIGINT,
  resolved BIGINT, false_positive BIGINT,
  critical_count BIGINT, high_count BIGINT, total_amount NUMERIC
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COUNT(*),
    COUNT(*) FILTER (WHERE status='open'),
    COUNT(*) FILTER (WHERE status='investigating'),
    COUNT(*) FILTER (WHERE status='resolved'),
    COUNT(*) FILTER (WHERE status='false_positive'),
    COUNT(*) FILTER (WHERE severity='critical'),
    COUNT(*) FILTER (WHERE severity='high'),
    COALESCE(SUM(amount) FILTER (WHERE status IN ('open','investigating')),0)
  FROM fraud_alerts WHERE created_at > NOW() - interval '7 days';
$$;
GRANT EXECUTE ON FUNCTION nf_fraud_summary TO authenticated;

CREATE OR REPLACE FUNCTION nf_fraud_alerts_list(p_limit INT DEFAULT 10)
RETURNS TABLE(
  id INT, user_name TEXT, alert_type TEXT, severity TEXT,
  description TEXT, status TEXT, amount NUMERIC, created_at TIMESTAMPTZ
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT fa.id, u.name, fa.alert_type, fa.severity, fa.description, fa.status, fa.amount, fa.created_at
  FROM fraud_alerts fa JOIN users u ON u.id = fa.user_id
  WHERE fa.created_at > NOW() - interval '7 days'
  ORDER BY
    CASE fa.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
    fa.created_at DESC
  LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION nf_fraud_alerts_list TO authenticated;

-- ── System Health ────────────────────────────────────────

CREATE OR REPLACE FUNCTION nf_system_status()
RETURNS TABLE(
  name TEXT, category TEXT, status TEXT, uptime_pct NUMERIC,
  avg_response_ms INT, last_incident TEXT, last_check TIMESTAMPTZ
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT name, category, status, uptime_pct, avg_response_ms, last_incident, last_check
  FROM system_components ORDER BY
    CASE status WHEN 'outage' THEN 0 WHEN 'degraded' THEN 1 WHEN 'maintenance' THEN 2 ELSE 3 END,
    name;
$$;
GRANT EXECUTE ON FUNCTION nf_system_status TO authenticated;

CREATE OR REPLACE FUNCTION nf_system_overview()
RETURNS TABLE(
  total_components BIGINT, operational BIGINT, degraded BIGINT,
  outage BIGINT, avg_uptime NUMERIC
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COUNT(*),
    COUNT(*) FILTER (WHERE status='operational'),
    COUNT(*) FILTER (WHERE status='degraded'),
    COUNT(*) FILTER (WHERE status='outage'),
    ROUND(AVG(uptime_pct),2)
  FROM system_components;
$$;
GRANT EXECUTE ON FUNCTION nf_system_overview TO authenticated;

-- ── FX Rates ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION nf_fx_rates()
RETURNS TABLE(
  currency_pair TEXT, buy_rate NUMERIC, sell_rate NUMERIC,
  change_pct NUMERIC, updated_at TIMESTAMPTZ
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT currency_pair, buy_rate, sell_rate, change_pct, updated_at
  FROM fx_rates ORDER BY currency_pair;
$$;
GRANT EXECUTE ON FUNCTION nf_fx_rates TO authenticated;

-- ── Investment Products ──────────────────────────────────

CREATE OR REPLACE FUNCTION nf_investment_products(p_category TEXT DEFAULT NULL, p_limit INT DEFAULT 20)
RETURNS TABLE(
  name TEXT, category TEXT, risk_level TEXT, return_ytd NUMERIC,
  aum NUMERIC, currency TEXT
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT name, category, risk_level, return_ytd, aum, currency
  FROM investment_products
  WHERE status = 'active' AND (p_category IS NULL OR investment_products.category = p_category)
  ORDER BY aum DESC LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION nf_investment_products TO authenticated;

CREATE OR REPLACE FUNCTION nf_investment_summary()
RETURNS TABLE(
  total_aum NUMERIC, product_count BIGINT, avg_return NUMERIC,
  high_risk_count BIGINT, medium_risk_count BIGINT, low_risk_count BIGINT
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT SUM(aum), COUNT(*), ROUND(AVG(return_ytd),2),
    COUNT(*) FILTER (WHERE risk_level='high'),
    COUNT(*) FILTER (WHERE risk_level='medium'),
    COUNT(*) FILTER (WHERE risk_level='low')
  FROM investment_products WHERE status = 'active';
$$;
GRANT EXECUTE ON FUNCTION nf_investment_summary TO authenticated;

-- ── Budget / KPI Targets ─────────────────────────────────

CREATE OR REPLACE FUNCTION nf_budget_vs_actual(p_period TEXT DEFAULT '2026-Q2')
RETURNS TABLE(
  metric_key TEXT, target_total NUMERIC, actual_total NUMERIC, achievement_pct NUMERIC
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT metric_key, SUM(target_value), SUM(actual_value),
    ROUND(SUM(actual_value) / GREATEST(SUM(target_value),1) * 100, 1)
  FROM budget_targets WHERE period_label = p_period
  GROUP BY metric_key ORDER BY metric_key;
$$;
GRANT EXECUTE ON FUNCTION nf_budget_vs_actual TO authenticated;

CREATE OR REPLACE FUNCTION nf_branch_ranking(p_metric TEXT DEFAULT 'revenue', p_period TEXT DEFAULT '2026-Q2')
RETURNS TABLE(
  branch_name TEXT, target_value NUMERIC, actual_value NUMERIC,
  achievement_pct NUMERIC, rank BIGINT
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT b.name, bt.target_value, bt.actual_value,
    ROUND(bt.actual_value / GREATEST(bt.target_value,1) * 100, 1),
    ROW_NUMBER() OVER (ORDER BY bt.actual_value / GREATEST(bt.target_value,1) DESC)
  FROM budget_targets bt JOIN branches b ON b.id = bt.branch_id
  WHERE bt.metric_key = p_metric AND bt.period_label = p_period
  ORDER BY bt.actual_value / GREATEST(bt.target_value,1) DESC;
$$;
GRANT EXECUTE ON FUNCTION nf_branch_ranking TO authenticated;

-- ── RM Performance (derived from existing transactions + users) ──

CREATE OR REPLACE FUNCTION nf_rm_performance(p_days INT DEFAULT 30)
RETURNS TABLE(
  rm_name TEXT, client_count BIGINT, total_txn_amount NUMERIC,
  txn_count BIGINT, avg_client_balance NUMERIC
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    u.rm_name,
    COUNT(DISTINCT u.id),
    COALESCE(SUM(t.amount),0),
    COUNT(t.id),
    ROUND(AVG(a.balance),0)
  FROM users u
  LEFT JOIN transactions t ON t.user_id = u.id AND t.created_at > NOW() - (p_days || ' days')::interval
  LEFT JOIN accounts a ON a.user_id = u.id
  WHERE u.rm_name IS NOT NULL
  GROUP BY u.rm_name
  ORDER BY COALESCE(SUM(t.amount),0) DESC;
$$;
GRANT EXECUTE ON FUNCTION nf_rm_performance TO authenticated;

-- ── Channel Distribution (derived from existing events) ──

CREATE OR REPLACE FUNCTION nf_channel_distribution(p_days INT DEFAULT 7)
RETURNS TABLE(channel TEXT, event_count BIGINT, pct NUMERIC)
LANGUAGE sql SECURITY DEFINER AS $$
  WITH raw AS (
    SELECT
      COALESCE(metadata->>'channel', 'web') AS channel,
      COUNT(*) AS cnt
    FROM events
    WHERE created_at > NOW() - (p_days || ' days')::interval
    GROUP BY COALESCE(metadata->>'channel', 'web')
  ),
  total AS (SELECT SUM(cnt) AS t FROM raw)
  SELECT raw.channel, raw.cnt, ROUND(raw.cnt::numeric / GREATEST(total.t,1) * 100, 1)
  FROM raw, total ORDER BY raw.cnt DESC;
$$;
GRANT EXECUTE ON FUNCTION nf_channel_distribution TO authenticated;

-- ── Digital Adoption Metrics ─────────────────────────────

CREATE OR REPLACE FUNCTION nf_digital_adoption(p_days INT DEFAULT 30)
RETURNS TABLE(
  total_logins BIGINT, mobile_logins BIGINT, web_logins BIGINT,
  mobile_pct NUMERIC, unique_digital_users BIGINT
) LANGUAGE sql SECURITY DEFINER AS $$
  WITH logins AS (
    SELECT
      user_id,
      COALESCE(metadata->>'channel', 'web') AS ch
    FROM events
    WHERE event_type = 'login' AND created_at > NOW() - (p_days || ' days')::interval
  )
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE ch = 'mobile'),
    COUNT(*) FILTER (WHERE ch IN ('web','desktop')),
    ROUND(COUNT(*) FILTER (WHERE ch = 'mobile')::numeric / GREATEST(COUNT(*),1) * 100, 1),
    COUNT(DISTINCT user_id)
  FROM logins;
$$;
GRANT EXECUTE ON FUNCTION nf_digital_adoption TO authenticated;
