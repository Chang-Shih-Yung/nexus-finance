# Nexus Finance — 銀行數據監控 + AI 查詢平台

全端銀行數據監控平台，整合 GitHub Copilot SDK 實現自然語言數據查詢。

## 技術棧

| 層級   | 技術                                           |
| ------ | ---------------------------------------------- |
| 前端   | Vue 3 + TypeScript + Tailwind CSS 4 + Chart.js |
| 後端   | Node.js + Express 5                            |
| 資料庫 | PostgreSQL 14                                  |
| AI     | GitHub Copilot SDK (`@github/copilot-sdk`)     |

## 功能

- **即時總覽** — 今日登入、交易筆數、成功率、活躍用戶
- **使用者漏斗** — login → transfer_init → transfer_success 轉換分析
- **錯誤監控** — 錯誤代碼分佈 + 失敗交易明細
- **API 監控** — 延遲、錯誤率即時追蹤
- **AI 查詢** — 用自然語言（理專用語）查詢數據，自動產生 SQL + 圖表

## 快速開始

### 前置需求

- Node.js 18+
- PostgreSQL 14+
- GitHub Copilot CLI（已登入）

### 安裝

```bash
# 1. 建立資料庫
createdb nexus_finance

# 2. 複製環境變數
cp .env.example .env
# 編輯 .env 填入你的 DB 設定

# 3. 後端
cd server
npm install
npm run db:schema    # 建表
npm run seed         # 塞入模擬資料（500 users / 10K events / 5K transactions）

# 4. 前端
cd ../client
npm install
```

### 啟動

```bash
# 終端 1：啟動 Copilot CLI headless server（AI 查詢需要）
copilot --headless --port 4321

# 終端 2：啟動後端 API（預設 port 3001）
cd server && npm start

# 終端 3：啟動前端（預設 port 5173）
cd client && npm run dev
```

開啟 http://localhost:5173 查看儀表板。

### 模擬即時流量

```bash
cd server && node scripts/simulate-traffic.js
```

## 專案結構

```
Nexus_Finance/
├── .env                          # 環境變數
├── client/                       # Vue 3 前端
│   ├── src/
│   │   ├── views/                # 頁面元件
│   │   │   ├── DashboardHome.vue   # 即時總覽
│   │   │   ├── FunnelView.vue      # 使用者漏斗
│   │   │   ├── ErrorMonitor.vue    # 錯誤監控
│   │   │   ├── MonitorView.vue     # API 監控
│   │   │   └── AiQueryView.vue     # AI 查詢
│   │   ├── components/           # 共用元件（StatCard, ChartCard）
│   │   ├── composables/          # useStats API hooks
│   │   └── router/               # Vue Router
│   └── vite.config.ts            # Vite + Tailwind + API proxy
├── server/                       # Express 後端
│   ├── db/
│   │   ├── schema.sql              # DDL（4 tables, 12 indexes）
│   │   └── connection.js           # pg Pool
│   ├── routes/
│   │   ├── stats.js                # 8 個統計 API
│   │   ├── events.js               # POST /api/log-event
│   │   └── ai.js                   # POST /api/ai/query
│   ├── services/
│   │   ├── copilotAgent.js         # Copilot SDK 整合 + 3 custom tools
│   │   └── sqlSanitizer.js         # SQL 安全檢查
│   ├── middleware/
│   │   └── apiLogger.js            # API 延遲記錄
│   └── scripts/
│       ├── seed.js                 # 種子資料產生器
│       └── simulate-traffic.js     # 即時流量模擬
└── README.md
```

## AI 查詢範例（理專用語）

| 查詢                              | 功能                            |
| --------------------------------- | ------------------------------- |
| 這個月 VIP 客戶的轉帳成功率多少？ | 客戶分級分析                    |
| 昨天哪些客戶轉帳失敗了？          | 失敗交易明細                    |
| 過去一週每天登入人數趨勢          | 趨勢圖表（自動產生 Line Chart） |
| 上個月轉帳金額最高的前 10 位客戶  | Top-N 排名                      |
| 最近 30 天哪個錯誤代碼最常出現？  | 錯誤分析（自動 Bar Chart）      |
| 哪些客戶超過 7 天沒有登入了？     | 流失預警                        |

## API 端點

| Method | Path                               | 說明              |
| ------ | ---------------------------------- | ----------------- |
| GET    | `/api/stats/overview`              | 今日總覽          |
| GET    | `/api/stats/daily-logins`          | 每日登入人數      |
| GET    | `/api/stats/transfer-success-rate` | 轉帳成功率        |
| GET    | `/api/stats/funnel`                | 漏斗分析          |
| GET    | `/api/stats/error-breakdown`       | 錯誤代碼分佈      |
| GET    | `/api/stats/trend`                 | 7 日登入趨勢      |
| GET    | `/api/stats/api-health`            | API 延遲 / 錯誤率 |
| GET    | `/api/stats/failed-transactions`   | 失敗交易列表      |
| POST   | `/api/log-event`                   | 記錄使用者事件    |
| POST   | `/api/ai/query`                    | AI 自然語言查詢   |
| GET    | `/api/health`                      | 健康檢查          |

## 環境變數

| 變數              | 說明                    | 預設值           |
| ----------------- | ----------------------- | ---------------- |
| `DB_HOST`         | PostgreSQL 主機         | `localhost`      |
| `DB_PORT`         | PostgreSQL 埠號         | `5432`           |
| `DB_NAME`         | 資料庫名稱              | `nexus_finance`  |
| `DB_USER`         | 資料庫使用者            | -                |
| `DB_PASSWORD`     | 資料庫密碼              | -                |
| `PORT`            | 後端 API 埠號           | `3000`           |
| `COPILOT_CLI_URL` | Copilot CLI server 位址 | `localhost:4321` |

## License

MIT
