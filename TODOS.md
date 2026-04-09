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

**What:** ~~前端自動刷新 + AI 查詢無 debounce，需要評估限速方案。~~
已透過 React Query (@tanstack/react-query) 解決大部分問題：staleTime 30s 去重複、refetchOnWindowFocus 取代 setInterval、背景 tab 自動暫停。

**Status:** 大部分已解決。剩餘：AI 查詢 debounce（P3）。

**Effort:** S
**Priority:** P4
**Depends on:** None

## Completed
