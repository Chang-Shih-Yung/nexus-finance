-- ============================================================
-- Executive Dashboard: New tables for bank VP morning report
-- ============================================================

-- 1. Revenue tracking (daily by product & branch)
CREATE TABLE IF NOT EXISTS revenue_daily (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  product_type VARCHAR(30) NOT NULL,        -- lending, deposits, fees, fx, wealth_mgmt
  branch_id INT REFERENCES branches(id),
  interest_income NUMERIC(15,2) DEFAULT 0,
  fee_income NUMERIC(15,2) DEFAULT 0,
  total_revenue NUMERIC(15,2) GENERATED ALWAYS AS (interest_income + fee_income) STORED
);
ALTER TABLE revenue_daily ENABLE ROW LEVEL SECURITY;

-- 2. Loan portfolio
CREATE TABLE IF NOT EXISTS loans (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  loan_type VARCHAR(30) NOT NULL,           -- mortgage, personal, business, auto, credit_line
  principal NUMERIC(15,2) NOT NULL,
  outstanding NUMERIC(15,2) NOT NULL,
  interest_rate NUMERIC(5,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'current',     -- current, overdue, default, paid_off
  days_past_due INT DEFAULT 0,
  next_payment_date DATE,
  branch_id INT REFERENCES branches(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

-- 3. Deposit products
CREATE TABLE IF NOT EXISTS deposits (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  product_type VARCHAR(30) NOT NULL,        -- savings, checking, time_deposit, money_market
  balance NUMERIC(15,2) NOT NULL,
  interest_rate NUMERIC(5,2) DEFAULT 0,
  maturity_date DATE,
  branch_id INT REFERENCES branches(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;

-- 4. Compliance checks
CREATE TABLE IF NOT EXISTS compliance_checks (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50) NOT NULL,            -- KYC, AML, capital_adequacy, liquidity, reporting, data_privacy
  item_name VARCHAR(200) NOT NULL,
  status VARCHAR(20) DEFAULT 'compliant',   -- compliant, warning, violation, pending_review
  score NUMERIC(5,2),
  details TEXT,
  due_date DATE,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE compliance_checks ENABLE ROW LEVEL SECURITY;

-- 5. Customer feedback / NPS
CREATE TABLE IF NOT EXISTS customer_feedback (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  channel VARCHAR(20) NOT NULL,             -- app, branch, call_center, web
  score INT NOT NULL CHECK (score BETWEEN 0 AND 10),
  category VARCHAR(50),                     -- service, product, app_ux, wait_time, fees
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE customer_feedback ENABLE ROW LEVEL SECURITY;

-- 6. Fraud / suspicious activity alerts
CREATE TABLE IF NOT EXISTS fraud_alerts (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  alert_type VARCHAR(50) NOT NULL,          -- unusual_amount, unusual_location, rapid_succession, new_device, after_hours
  severity VARCHAR(10) DEFAULT 'medium',    -- low, medium, high, critical
  description TEXT,
  status VARCHAR(20) DEFAULT 'open',        -- open, investigating, resolved, false_positive
  amount NUMERIC(15,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE fraud_alerts ENABLE ROW LEVEL SECURITY;

-- 7. System component health
CREATE TABLE IF NOT EXISTS system_components (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,            -- core_banking, payment_gateway, mobile_app, web_portal, atm_network, api_gateway
  status VARCHAR(20) DEFAULT 'operational', -- operational, degraded, outage, maintenance
  uptime_pct NUMERIC(5,2) DEFAULT 99.99,
  avg_response_ms INT DEFAULT 0,
  last_incident TEXT,
  last_check TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE system_components ENABLE ROW LEVEL SECURITY;

-- 8. FX rates
CREATE TABLE IF NOT EXISTS fx_rates (
  id SERIAL PRIMARY KEY,
  currency_pair VARCHAR(10) NOT NULL,       -- USD/TWD, EUR/TWD, JPY/TWD, CNY/TWD, GBP/TWD
  buy_rate NUMERIC(10,4) NOT NULL,
  sell_rate NUMERIC(10,4) NOT NULL,
  change_pct NUMERIC(5,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE fx_rates ENABLE ROW LEVEL SECURITY;

-- 9. Investment / wealth management products
CREATE TABLE IF NOT EXISTS investment_products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL,            -- fund, bond, structured, insurance, etf
  risk_level VARCHAR(10) NOT NULL,          -- low, medium, high
  return_ytd NUMERIC(6,2) DEFAULT 0,
  aum NUMERIC(15,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'TWD',
  status VARCHAR(20) DEFAULT 'active'
);
ALTER TABLE investment_products ENABLE ROW LEVEL SECURITY;

-- 10. Budget / KPI targets
CREATE TABLE IF NOT EXISTS budget_targets (
  id SERIAL PRIMARY KEY,
  metric_key VARCHAR(50) NOT NULL,
  period_label VARCHAR(20) NOT NULL,        -- 2026-Q1, 2026-Q2, 2026-04
  target_value NUMERIC(15,2) NOT NULL,
  actual_value NUMERIC(15,2) DEFAULT 0,
  branch_id INT REFERENCES branches(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE budget_targets ENABLE ROW LEVEL SECURITY;
