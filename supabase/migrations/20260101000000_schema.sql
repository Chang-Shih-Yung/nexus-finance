-- Nexus Finance — Supabase Migration
-- PostgreSQL 14+ / Supabase

-- ── Extensions ──────────────────────────────────────────────────
-- pg_cron: 定期清除 api_logs（需在 Supabase dashboard 的 Database > Extensions 啟用）
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ── Enums ───────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE event_type AS ENUM (
    'login', 'logout', 'transfer_init', 'transfer_success',
    'transfer_failed', 'click', 'view_account', 'view_statement'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE tx_status AS ENUM ('pending', 'success', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE user_tier AS ENUM ('general', 'vip', 'premium');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Tables ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  phone         VARCHAR(30),
  tier          user_tier NOT NULL DEFAULT 'general',
  rm_name       VARCHAR(100),
  branch        VARCHAR(100),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  status        VARCHAR(20) NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS events (
  id            SERIAL PRIMARY KEY,
  user_id       INT NOT NULL REFERENCES users(id),
  event_type    event_type NOT NULL,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id            SERIAL PRIMARY KEY,
  user_id       INT NOT NULL REFERENCES users(id),
  amount        NUMERIC(15,2) NOT NULL,
  currency      VARCHAR(3) NOT NULL DEFAULT 'TWD',
  from_account  VARCHAR(20) NOT NULL,
  to_account    VARCHAR(20) NOT NULL,
  status        tx_status NOT NULL DEFAULT 'pending',
  error_code    VARCHAR(50),
  error_message VARCHAR(255),
  channel       VARCHAR(20) DEFAULT 'web',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_logs (
  id               SERIAL PRIMARY KEY,
  method           VARCHAR(10) NOT NULL,
  path             VARCHAR(255) NOT NULL,
  status_code      INT NOT NULL,
  response_time_ms INT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_events_user_type_time ON events(user_id, event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_events_created_at     ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_type           ON events(event_type);

CREATE INDEX IF NOT EXISTS idx_tx_user_status_time ON transactions(user_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_tx_created_at       ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_tx_status           ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_tx_error_code       ON transactions(error_code);

CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_logs_path       ON api_logs(path);

CREATE INDEX IF NOT EXISTS idx_users_tier   ON users(tier);
CREATE INDEX IF NOT EXISTS idx_users_rm     ON users(rm_name);
CREATE INDEX IF NOT EXISTS idx_users_branch ON users(branch);

-- ── Row Level Security ──────────────────────────────────────────
-- 全部表格啟用 RLS，Edge Functions 使用 service_role key 可繞過 RLS
ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_logs     ENABLE ROW LEVEL SECURITY;

-- 拒絕所有透過 PostgREST 的直接公開存取（只允許 Edge Functions via service_role）
CREATE POLICY "deny_public_users"        ON users        FOR ALL USING (false);
CREATE POLICY "deny_public_events"       ON events       FOR ALL USING (false);
CREATE POLICY "deny_public_transactions" ON transactions FOR ALL USING (false);
CREATE POLICY "deny_public_api_logs"     ON api_logs     FOR ALL USING (false);

-- ── api_logs 自動清理（pg_cron）────────────────────────────────
-- 在 Supabase dashboard 啟用 pg_cron extension 後，執行以下語句：
--
-- SELECT cron.schedule(
--   'cleanup-api-logs',
--   '0 3 * * *',  -- 每天凌晨 3 點
--   $$DELETE FROM api_logs WHERE created_at < NOW() - INTERVAL '7 days'$$
-- );
