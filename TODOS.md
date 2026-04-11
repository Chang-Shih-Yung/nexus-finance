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

## Design Debt (from /plan-design-review 2026-04-10)

### AppShell i18n 漏洞

**What:** `client/src/components/AppShell.tsx` 裡的 section 標籤、`today` 日期 locale、登出按鈕、aria-label 都寫死中文。

**Why:** 剛剛那波 i18n 大搬家把所有卡片翻譯完了，卻完全沒碰 shell。切換到英文時 header 還是中文，看起來很破。

**Where:**
- Line 13-18: `sections` array 的 label 寫死
- Line 44: `today` 用 `'zh-TW'` locale 寫死
- Line 108: `aria-label="導航選單"`
- Line 169: `'登出中...' : '登出'`

**Effort:** S
**Priority:** P2
**Depends on:** None（可以獨立做）

---

### Section 元件的剩餘硬編碼中文

**What:** `RiskSection.tsx` 和 `CustomerSection.tsx` 還有一堆寫死中文的 CardTitle、table headers、空狀態訊息、local label map。

**Why:** 先前的 i18n 搬家只處理了 Chart titles 和 labels.ts 能涵蓋的東西，section 裡面的靜態標題和表格欄位都沒翻譯。

**Where (RiskSection.tsx):**
- Line 89: `title="錯誤類型分佈"`
- Line 116: `失敗交易明細`
- Line 122-127: Table headers（時間/客戶/等級/金額/錯誤）
- Line 152-153: `異常偵測`
- Line 157: `今日未偵測到異常指標`
- Line 171: `今日 / 均值`
- Line 182: `每日錯誤率趨勢 (30天)`
- Line 33-37: `METRIC_LABELS` 是單語系 map，應搬到 `labels.ts`

**Where (CustomerSection.tsx):**
- Line 80, 105, 125, 163: CardTitle 硬編碼
- Line 24-30, 32-34: `TIER_LABELS`, `stepLabels` 應搬到 `labels.ts`
- Line 152-154: `轉換 %` / `流失 %` 硬編碼
- Line 170-173: Table headers

**Effort:** M
**Priority:** P2
**Depends on:** None

---

### Mobile ThemeCustomizer 缺失

**What:** `<1024px` 的螢幕 sidebar 被隱藏，但 ThemeCustomizer 只存在於 sidebar。所以手機/平板使用者沒辦法客製主題。

**Why:** 目前的 AppShell 把 ThemeCustomizer 綁死在 desktop sidebar 裡。Mobile 使用者只能看預設主題。

**Context:** 解法可能是在 header 加一個「調色盤」icon button，開啟 Popover 版本的 ThemeCustomizer。和既有的 Theme sacred rule 一致（不改 ThemeCustomizerContent 本身，只改容器）。

**Effort:** M
**Priority:** P3
**Depends on:** None

---

### Dashboard toggle 按鈕觸控目標過小

**What:** `client/src/app/dashboard/page.tsx` 的 01/02 toggle 按鈕是 `min-w-8 h-8`（32px），低於 WCAG 建議的最小觸控目標 44px。

**Why:** 手機使用者容易誤點。加入 03 的時候順手改掉。

**Effort:** XS
**Priority:** P3
**Depends on:** Preview03 implementation

---

## Completed
