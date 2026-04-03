# TODOS

## Operations

### pg_cron 清理 api_logs

**What:** 在 Supabase dashboard 啟用 pg_cron extension，設定每天凌晨 3 點清除 7 天前的 api_logs。

**Why:** api_logs 表沒有自動清理機制，生產環境資料會無限增長，影響查詢效能。

**Context:** schema.sql 底部已有註解的 cron.schedule() 語句。在 Supabase dashboard > Database > Extensions 啟用 pg_cron 後，手動執行該 SQL 即可。

**Effort:** S
**Priority:** P2
**Depends on:** 生產環境部署

---

### Rate limiting 策略

**What:** 前端自動刷新（dashboard 30s、monitor 15s）+ AI 查詢無 debounce，需要評估限速方案。

**Why:** 開多 tab 或用戶數增加時，RPC 呼叫率會很高。目前每個 tab 每分鐘最多 6 次 RPC（overview + trend 各 2 次/分鐘），10 個 tab = 60 RPC/min。

**Context:** 可考慮：1) 前端 tab visibility API 暫停背景 tab 的刷新；2) Supabase rate limiting（需 Pro plan）；3) 前端 debounce AI 查詢輸入。

**Effort:** M
**Priority:** P3
**Depends on:** None

## Completed
