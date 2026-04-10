-- ============================================================
-- Seed: Executive Dashboard demo data
-- ============================================================

-- ── Revenue Daily (90 days × 5 products × 7 branches) ──
INSERT INTO revenue_daily (date, product_type, branch_id, interest_income, fee_income)
SELECT
  d::date,
  p.product_type,
  b.id,
  -- Interest income: base by product, vary by branch size and day
  ROUND((p.base_interest * b.size_factor * (0.85 + random() * 0.30))::numeric, 2),
  -- Fee income: base by product, vary similarly
  ROUND((p.base_fee * b.size_factor * (0.80 + random() * 0.40))::numeric, 2)
FROM generate_series(CURRENT_DATE - 89, CURRENT_DATE, '1 day') d
CROSS JOIN (VALUES
  ('lending',    180000, 12000),
  ('deposits',    45000, 8000),
  ('fees',         5000, 35000),
  ('fx',          15000, 22000),
  ('wealth_mgmt', 60000, 18000)
) AS p(product_type, base_interest, base_fee)
CROSS JOIN (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn,
    CASE
      WHEN name LIKE '%台北%' THEN 1.4
      WHEN name LIKE '%新竹%' THEN 1.1
      WHEN name LIKE '%桃園%' THEN 1.0
      WHEN name LIKE '%台中%' THEN 1.2
      WHEN name LIKE '%台南%' THEN 0.9
      WHEN name LIKE '%高雄%' THEN 1.05
      ELSE 0.8
    END AS size_factor
  FROM branches
) b;

-- ── Loans (40 loans across users and branches) ──
INSERT INTO loans (user_id, loan_type, principal, outstanding, interest_rate, status, days_past_due, next_payment_date, branch_id)
VALUES
  -- User 1 (王小明, general, 台北)
  (1, 'mortgage',    8500000, 7200000, 2.10, 'current', 0, CURRENT_DATE + 15, 1),
  (1, 'personal',     300000,  180000, 5.50, 'current', 0, CURRENT_DATE + 22, 1),
  -- User 2 (李小美, general, 台北)
  (2, 'auto',         650000,  420000, 3.80, 'current', 0, CURRENT_DATE + 8, 1),
  (2, 'credit_line',  200000,   85000, 7.20, 'current', 0, CURRENT_DATE + 30, 1),
  -- User 3 (張大華, VIP, 新竹)
  (3, 'mortgage',   15000000,12500000, 1.95, 'current', 0, CURRENT_DATE + 5, 2),
  (3, 'business',    5000000, 3800000, 3.20, 'current', 0, CURRENT_DATE + 18, 2),
  (3, 'personal',     800000,  650000, 4.80, 'overdue', 15, CURRENT_DATE - 15, 2),
  -- User 4 (陳志豪, VIP, 新竹)
  (4, 'mortgage',   12000000, 9800000, 2.05, 'current', 0, CURRENT_DATE + 12, 2),
  (4, 'auto',        1200000,  780000, 3.50, 'current', 0, CURRENT_DATE + 25, 2),
  -- User 5 (林佩珊, premium, 台中)
  (5, 'mortgage',   25000000,18000000, 1.85, 'current', 0, CURRENT_DATE + 3, 4),
  (5, 'business',   10000000, 7500000, 2.90, 'current', 0, CURRENT_DATE + 20, 4),
  (5, 'personal',    1500000, 1200000, 4.20, 'current', 0, CURRENT_DATE + 28, 4),
  -- User 6 (黃志誠, premium, 台中)
  (6, 'business',   20000000,16000000, 2.80, 'current', 0, CURRENT_DATE + 10, 4),
  (6, 'mortgage',   18000000,14500000, 1.90, 'current', 0, CURRENT_DATE + 7, 4),
  (6, 'credit_line', 3000000, 1200000, 6.50, 'overdue', 32, CURRENT_DATE - 32, 4);

-- Additional loans across other branches
INSERT INTO loans (user_id, loan_type, principal, outstanding, interest_rate, status, days_past_due, next_payment_date, branch_id)
SELECT
  (ARRAY[1,2,3,4,5,6])[1 + floor(random()*6)::int],
  (ARRAY['mortgage','personal','business','auto','credit_line'])[1 + floor(random()*5)::int],
  ROUND((1000000 + random() * 20000000)::numeric, -4),
  ROUND((500000 + random() * 15000000)::numeric, -4),
  ROUND((1.5 + random() * 6)::numeric, 2),
  CASE WHEN random() < 0.85 THEN 'current' WHEN random() < 0.95 THEN 'overdue' ELSE 'default' END,
  CASE WHEN random() < 0.85 THEN 0 ELSE (5 + floor(random()*60))::int END,
  CURRENT_DATE + (floor(random()*30))::int,
  (ARRAY[1,2,3,4,5,6,7])[1 + floor(random()*7)::int]
FROM generate_series(1, 25);

-- ── Deposits (50 deposit accounts) ──
INSERT INTO deposits (user_id, product_type, balance, interest_rate, maturity_date, branch_id)
VALUES
  (1, 'checking',     125000, 0.10, NULL, 1),
  (1, 'savings',      580000, 1.20, NULL, 1),
  (2, 'checking',      85000, 0.10, NULL, 1),
  (2, 'time_deposit', 1000000, 1.85, CURRENT_DATE + 180, 1),
  (3, 'checking',     350000, 0.15, NULL, 2),
  (3, 'savings',     2500000, 1.35, NULL, 2),
  (3, 'money_market', 5000000, 1.60, NULL, 2),
  (4, 'checking',     280000, 0.15, NULL, 2),
  (4, 'time_deposit', 3000000, 2.00, CURRENT_DATE + 365, 2),
  (5, 'checking',     800000, 0.20, NULL, 4),
  (5, 'savings',     5000000, 1.50, NULL, 4),
  (5, 'money_market',10000000, 1.75, NULL, 4),
  (5, 'time_deposit', 8000000, 2.10, CURRENT_DATE + 90, 4),
  (6, 'checking',     650000, 0.20, NULL, 4),
  (6, 'savings',     3500000, 1.50, NULL, 4),
  (6, 'time_deposit',12000000, 2.15, CURRENT_DATE + 270, 4);

-- Additional deposits across branches
INSERT INTO deposits (user_id, product_type, balance, interest_rate, maturity_date, branch_id)
SELECT
  (ARRAY[1,2,3,4,5,6])[1 + floor(random()*6)::int],
  (ARRAY['savings','checking','time_deposit','money_market'])[1 + floor(random()*4)::int],
  ROUND((50000 + random() * 8000000)::numeric, -3),
  ROUND((0.1 + random() * 2.2)::numeric, 2),
  CASE WHEN random() < 0.4 THEN CURRENT_DATE + (90 + floor(random()*275))::int ELSE NULL END,
  (ARRAY[1,2,3,4,5,6,7])[1 + floor(random()*7)::int]
FROM generate_series(1, 34);

-- ── Compliance Checks (20 items across categories) ──
INSERT INTO compliance_checks (category, item_name, status, score, details, due_date, checked_at)
VALUES
  ('KYC', '客戶身份驗證完成率', 'compliant', 98.5, '本月完成 1,247/1,266 筆 KYC 驗證', CURRENT_DATE + 30, NOW() - interval '2 hours'),
  ('KYC', '高風險客戶複審', 'warning', 82.0, '3 位高風險客戶待複審，超過期限 5 天', CURRENT_DATE - 5, NOW() - interval '1 hour'),
  ('KYC', 'PEP 名單比對', 'compliant', 100.0, '所有新客戶已完成 PEP 比對', CURRENT_DATE + 7, NOW() - interval '30 minutes'),
  ('AML', '可疑交易報告 (STR)', 'compliant', 95.0, '本月提交 12 筆 STR，均在 48 小時內完成', CURRENT_DATE + 14, NOW() - interval '3 hours'),
  ('AML', '大額交易監控', 'compliant', 99.2, '超過 50 萬元交易均已標記審查', CURRENT_DATE + 7, NOW() - interval '1 hour'),
  ('AML', '跨境匯款審查', 'warning', 78.0, '2 筆跨境匯款待人工複核', CURRENT_DATE + 1, NOW() - interval '4 hours'),
  ('capital_adequacy', '資本適足率 (CAR)', 'compliant', 14.2, '目前 CAR 14.2%，高於法定最低 10.5%', CURRENT_DATE + 90, NOW() - interval '6 hours'),
  ('capital_adequacy', '第一類資本比率', 'compliant', 12.8, 'Tier 1 比率 12.8%，超過 8.5% 門檻', CURRENT_DATE + 90, NOW() - interval '6 hours'),
  ('capital_adequacy', '槓桿比率', 'compliant', 6.5, '槓桿比率 6.5%，高於 3% 最低要求', CURRENT_DATE + 90, NOW() - interval '6 hours'),
  ('liquidity', '流動性覆蓋率 (LCR)', 'compliant', 135.0, 'LCR 135%，遠高於 100% 最低要求', CURRENT_DATE + 30, NOW() - interval '12 hours'),
  ('liquidity', '淨穩定資金比率 (NSFR)', 'compliant', 118.0, 'NSFR 118%，高於 100% 門檻', CURRENT_DATE + 30, NOW() - interval '12 hours'),
  ('liquidity', '存放比率 (LDR)', 'warning', 88.5, 'LDR 88.5%，接近 90% 內部警戒線', CURRENT_DATE + 7, NOW() - interval '2 hours'),
  ('reporting', '月報提交 - 金管會', 'compliant', 100.0, '3 月份報表已準時提交', CURRENT_DATE + 25, NOW() - interval '48 hours'),
  ('reporting', '季報準備 - Q1', 'pending_review', 75.0, 'Q1 季報 75% 完成，待最終審核', CURRENT_DATE + 15, NOW() - interval '24 hours'),
  ('reporting', '年度壓力測試', 'compliant', 92.0, '2025 壓力測試結果：所有情境均通過', CURRENT_DATE + 180, NOW() - interval '720 hours'),
  ('data_privacy', '個資保護法遵循', 'compliant', 96.0, '資料加密覆蓋率 96%，目標 98%', CURRENT_DATE + 60, NOW() - interval '168 hours'),
  ('data_privacy', '客戶同意書管理', 'compliant', 99.1, '99.1% 客戶已簽署最新同意書', CURRENT_DATE + 30, NOW() - interval '72 hours'),
  ('data_privacy', '資料存取稽核', 'warning', 85.0, '3 筆異常存取記錄待調查', CURRENT_DATE + 3, NOW() - interval '6 hours'),
  ('AML', '制裁名單篩檢', 'compliant', 100.0, '所有交易對象已通過 OFAC/EU 制裁名單篩檢', CURRENT_DATE + 1, NOW() - interval '1 hour'),
  ('reporting', 'IFRS 9 預期信用損失', 'compliant', 94.0, 'ECL 模型已按季更新，撥備率符合要求', CURRENT_DATE + 45, NOW() - interval '240 hours');

-- ── Customer Feedback (80 responses over 30 days) ──
INSERT INTO customer_feedback (user_id, channel, score, category, comment, created_at)
SELECT
  (ARRAY[1,2,3,4,5,6])[1 + floor(random()*6)::int],
  (ARRAY['app','branch','call_center','web'])[1 + floor(random()*4)::int],
  -- NPS scores: skew toward 7-9 (realistic bank NPS)
  CASE
    WHEN random() < 0.15 THEN (floor(random()*5))::int         -- 0-4 detractors
    WHEN random() < 0.45 THEN (7 + floor(random()*2))::int      -- 7-8 passives
    ELSE (9 + floor(random()*2))::int                            -- 9-10 promoters
  END,
  (ARRAY['service','product','app_ux','wait_time','fees'])[1 + floor(random()*5)::int],
  (ARRAY[
    '轉帳速度很快，滿意',
    'App 介面很直覺',
    '等待時間太長',
    '理專服務態度很好',
    '手續費偏高',
    '線上開戶流程順暢',
    'ATM 有時候會當機',
    '信用卡回饋不錯',
    '客服電話等很久',
    '網銀功能齊全',
    '分行環境舒適',
    '定存利率有競爭力',
    '外幣兌換手續費合理',
    '理財建議很專業',
    'APP 偶爾閃退'
  ])[1 + floor(random()*15)::int],
  NOW() - (random() * interval '30 days')
FROM generate_series(1, 80);

-- ── Fraud Alerts (15 alerts over 7 days) ──
INSERT INTO fraud_alerts (user_id, alert_type, severity, description, status, amount, created_at)
VALUES
  (2, 'unusual_amount', 'high', '單筆轉帳 NT$890,000 超過日常均值 3 倍', 'investigating', 890000, NOW() - interval '2 hours'),
  (4, 'rapid_succession', 'critical', '10 分鐘內連續 5 筆轉帳，總額 NT$2,500,000', 'open', 2500000, NOW() - interval '45 minutes'),
  (1, 'new_device', 'medium', '新裝置首次登入後立即發起大額轉帳', 'investigating', 350000, NOW() - interval '5 hours'),
  (3, 'after_hours', 'low', '凌晨 3:42 執行國際匯款', 'resolved', 180000, NOW() - interval '18 hours'),
  (6, 'unusual_location', 'high', '同一帳戶 30 分鐘內從台北和高雄登入', 'open', NULL, NOW() - interval '1 hour'),
  (5, 'unusual_amount', 'medium', '信用額度使用率突然從 15% 升至 85%', 'investigating', 2550000, NOW() - interval '8 hours'),
  (2, 'rapid_succession', 'medium', '1 小時內 8 筆小額轉帳至不同帳戶', 'resolved', 160000, NOW() - interval '36 hours'),
  (1, 'new_device', 'low', '新 IP 位址登入，已通過 OTP 驗證', 'false_positive', NULL, NOW() - interval '48 hours'),
  (4, 'unusual_amount', 'high', '企業帳戶異常大額提領 NT$5,000,000', 'open', 5000000, NOW() - interval '30 minutes'),
  (3, 'after_hours', 'medium', '週日深夜批量轉帳 12 筆', 'investigating', 720000, NOW() - interval '12 hours'),
  (6, 'unusual_location', 'low', 'VPN 連線登入，地理位置異常', 'false_positive', NULL, NOW() - interval '72 hours'),
  (5, 'rapid_succession', 'critical', '信用卡在 3 個不同國家同時消費', 'open', 85000, NOW() - interval '15 minutes'),
  (2, 'unusual_amount', 'medium', '定存提前解約並全額轉出', 'investigating', 3000000, NOW() - interval '24 hours'),
  (1, 'after_hours', 'low', '凌晨 4:15 查詢帳戶餘額', 'false_positive', NULL, NOW() - interval '96 hours'),
  (4, 'new_device', 'medium', '平板裝置首次登入，瀏覽器指紋不匹配', 'resolved', NULL, NOW() - interval '60 hours');

-- ── System Components (8 components) ──
INSERT INTO system_components (name, category, status, uptime_pct, avg_response_ms, last_incident, last_check)
VALUES
  ('核心銀行系統', 'core_banking', 'operational', 99.97, 45, '2026-03-15: 計畫性維護 2 小時', NOW() - interval '5 minutes'),
  ('支付閘道', 'payment_gateway', 'operational', 99.95, 120, '2026-04-01: SSL 憑證更新', NOW() - interval '5 minutes'),
  ('行動銀行 App', 'mobile_app', 'operational', 99.90, 200, '2026-04-05: v3.2.1 熱修復', NOW() - interval '5 minutes'),
  ('網路銀行入口', 'web_portal', 'degraded', 99.85, 380, '2026-04-09: CDN 延遲升高，調查中', NOW() - interval '2 minutes'),
  ('ATM 網路', 'atm_network', 'operational', 99.92, 85, '2026-03-28: 3 台 ATM 離線修復', NOW() - interval '10 minutes'),
  ('API 閘道', 'api_gateway', 'operational', 99.98, 32, '2026-02-20: 限流規則調整', NOW() - interval '1 minute'),
  ('資料倉儲 / ETL', 'data_warehouse', 'operational', 99.80, 1500, '2026-04-08: 批次作業延遲 15 分鐘', NOW() - interval '15 minutes'),
  ('簡訊 / OTP 服務', 'notification', 'operational', 99.88, 250, '2026-04-03: 電信商短暫斷線', NOW() - interval '3 minutes');

-- ── FX Rates (5 major pairs) ──
INSERT INTO fx_rates (currency_pair, buy_rate, sell_rate, change_pct, updated_at)
VALUES
  ('USD/TWD', 32.150, 32.450, -0.23, NOW() - interval '5 minutes'),
  ('EUR/TWD', 35.280, 35.680, 0.15, NOW() - interval '5 minutes'),
  ('JPY/TWD', 0.2135, 0.2185, -0.42, NOW() - interval '5 minutes'),
  ('CNY/TWD', 4.420, 4.520, 0.08, NOW() - interval '5 minutes'),
  ('GBP/TWD', 40.850, 41.350, 0.31, NOW() - interval '5 minutes');

-- ── Investment Products (12 products) ──
INSERT INTO investment_products (name, category, risk_level, return_ytd, aum, currency, status)
VALUES
  ('全球股票基金 A', 'fund', 'high', 8.50, 2500000000, 'TWD', 'active'),
  ('亞洲高收益債券基金', 'bond', 'medium', 4.20, 1800000000, 'TWD', 'active'),
  ('台灣 50 ETF', 'etf', 'medium', 12.30, 5200000000, 'TWD', 'active'),
  ('美元計價結構型商品', 'structured', 'high', 6.80, 800000000, 'USD', 'active'),
  ('穩健收益保險', 'insurance', 'low', 2.50, 3200000000, 'TWD', 'active'),
  ('新興市場股票基金', 'fund', 'high', -2.10, 650000000, 'TWD', 'active'),
  ('投資等級公司債基金', 'bond', 'low', 3.80, 4100000000, 'TWD', 'active'),
  ('科技產業 ETF', 'etf', 'high', 15.60, 1200000000, 'USD', 'active'),
  ('多元資產配置基金', 'fund', 'medium', 5.40, 2900000000, 'TWD', 'active'),
  ('綠能永續 ESG 基金', 'fund', 'medium', 7.20, 780000000, 'TWD', 'active'),
  ('人民幣固定收益', 'bond', 'medium', 3.10, 420000000, 'CNY', 'active'),
  ('全球 REITs 基金', 'fund', 'medium', 4.90, 1500000000, 'TWD', 'active');

-- ── Budget Targets (Q2 2026, by metric × branch) ──
INSERT INTO budget_targets (metric_key, period_label, target_value, actual_value, branch_id, updated_at)
SELECT
  m.key,
  '2026-Q2',
  ROUND((m.base_target * b.size_factor)::numeric, 0),
  ROUND((m.base_target * b.size_factor * (0.70 + random() * 0.45))::numeric, 0),
  b.id,
  NOW()
FROM (VALUES
  ('revenue',      5000000),
  ('new_accounts',     150),
  ('loan_volume',  30000000),
  ('deposit_growth', 8000000),
  ('nps_score',         80),
  ('digital_adoption',  85)
) AS m(key, base_target)
CROSS JOIN (
  SELECT id,
    CASE
      WHEN name LIKE '%台北%' THEN 1.4
      WHEN name LIKE '%新竹%' THEN 1.1
      WHEN name LIKE '%桃園%' THEN 1.0
      WHEN name LIKE '%台中%' THEN 1.2
      WHEN name LIKE '%台南%' THEN 0.9
      WHEN name LIKE '%高雄%' THEN 1.05
      ELSE 0.8
    END AS size_factor
  FROM branches
) b;
