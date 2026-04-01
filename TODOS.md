# TODOS

## Security

### CopilotClient singleton 並發不安全

**What:** 加入 initPromise singleton，讓並行呼叫等待同一個初始化 Promise。

**Why:** client.start() 沒有 mutex，兩個同時進入的請求若同時發現 clientReady === false，會各自呼叫 start() 並覆寫同一個實例，導致未定義行為。

**Context:** server/services/copilotAgent.js 的 getClient() 函式。修正：加入 `let initPromise = null`，在 start() 前 `if (!initPromise) initPromise = clientInstance.start()`，所有呼叫者 await 同一個 promise。

**Effort:** S
**Priority:** P2
**Depends on:** None

---

### CopilotClient 沒有重連邏輯

**What:** 加入 Copilot CLI 連線錯誤偵測，自動重設 clientReady 並重連。

**Why:** 若 Copilot CLI 崩潰或斷線，clientReady 永遠不會重設為 false，後續所有 AI 查詢會持續失敗直到伺服器手動重啟。

**Context:** server/services/copilotAgent.js。應監聽 SDK 的 disconnect/error 事件，在錯誤時將 clientInstance = null、clientReady = false，讓下一次呼叫觸發重新初始化。

**Effort:** M
**Priority:** P2
**Depends on:** None

## Completed
