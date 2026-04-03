# Nexus Finance

Nexus Finance 是以 Supabase 為核心的 Next.js 儀表板專案。
目前架構已完成遷移，前端直接呼叫 Postgres RPC，不再依賴 Supabase Edge Functions。

## 架構總覽

| 層級     | 技術                                        |
| -------- | ------------------------------------------- |
| 前端     | Next.js 16 + React 19 + Tailwind + Chart.js |
| 資料存取 | Supabase JS (`rpc`)                         |
| 資料庫   | Supabase Postgres                           |
| 認證     | Supabase Auth                               |

## 目前資料流

1. 使用者在前端登入 Supabase Auth。
2. 前端從 [client/src/lib/api.ts](client/src/lib/api.ts) 呼叫 `supabase.rpc(...)`。
3. Supabase Postgres 執行 `nf_*` 函式並回傳聚合結果。
4. dashboard 與 ai-query 頁面直接渲染資料。

## 快速啟動

1. 安裝依賴

```bash
pnpm install
```

2. 設定前端環境變數（[client/.env.local](client/.env.local)）

```bash
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=YOUR_PUBLISHABLE_KEY
```

3. 套用 migration 到遠端 Supabase

```bash
supabase db push
```

4. 啟動前端

```bash
pnpm dev
```

## 關鍵檔案

1. 前端 RPC 資料層: [client/src/lib/api.ts](client/src/lib/api.ts)
2. Supabase client 初始化: [client/src/lib/supabase/client.ts](client/src/lib/supabase/client.ts)
3. Proxy/Auth session 更新: [client/src/proxy.ts](client/src/proxy.ts)
4. DB schema: [supabase/migrations/20260101000000_schema.sql](supabase/migrations/20260101000000_schema.sql)
5. RPC 函式 migration: [supabase/migrations/20260403000100_add_rpc_stats_functions.sql](supabase/migrations/20260403000100_add_rpc_stats_functions.sql)

## 遷移注意事項

1. 專案已改為純 RPC 架構，禁止再新增或部署 Supabase Edge Functions。
2. 若要新增後端能力，請優先新增 Postgres function（`nf_*`）並透過 migration 管理。
3. 若看到 `supabase functions deploy`，請視為舊流程，不再使用。
4. 所有資料邏輯變更都必須透過 migration 進版控與部署。

## 部署檢查

Vercel build 前請確認：

1. `npm run build` 在本地可通過。
2. `supabase db push` 已套用最新 migration。
3. 前端環境變數使用 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`。
