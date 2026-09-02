# afterBUY 🛒

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](./LICENSE)
[![GitHub Repository](https://img.shields.io/badge/GitHub-tbdavid2019%2FafterBUY-black.svg?logo=github)](https://github.com/tbdavid2019/afterBUY)
[![llms.txt](https://img.shields.io/badge/llms.txt-Standard-green.svg)](./public/llms.txt)

> **買了之後，別再忘記換！**
> 一款手機優先的 Cloudflare 邊緣原生 PWA 生活耗材週期更換、保存期限、保固與備品庫存管理工具。

---

## 🌟 核心特色

1. **耗材週期與壽命追蹤**：
   - 週期更換：牙刷（90 天）、淨水器濾芯（180 天）、隱形眼鏡、冷氣濾網等。
   - 開封保存期（PAO）：化妝品、保養品、眼藥水等開封後倒數。
   - 保存期限與保固：家電保固到期日、食品藥品有效期限。
2. **一鍵「今天已換」與備品庫存扣減**：
   - 更換後一鍵重置計時器，自動扣減備品庫存；庫存歸零時自動提示採購補貨。
3. **無密碼雙軌登入（Passwordless）**：
   - **Passkey**：支援 Face ID / Touch ID / Windows Hello 生物辨識一秒極速登入。
   - **Email OTP**：6 位數一次性驗證碼，具備 Cloudflare KV 頻率限制（1 次/分、5 次/天）與新舊帳號自動 Provisioning。
4. **全覆蓋分階段通知管道（Multi-Channel Alerts）**：
   - **Phase 1 (MVP)**：
     - **PWA Web Push**：Service Worker 背景系統通知（桌面 / Android / iOS 16.4+ 加入主畫面）。
     - **WebCal 日曆同步（推薦）**：RFC 5545 標準 `.ics` 訂閱流，透過穩定 `UID`、遞增 `SEQUENCE`、`STATUS:CANCELLED` 墓碑機制與 **Calendar Token 安全輪替**，確保 Apple/Google 日曆精準更新，絕無舊事件殘留。
     - **Email 提醒**：每日晨間摘要與即將到期提醒。
   - **Phase 2 (VIP 加值)**：
     - **VIP SMS**：高優先級緊急耗材缺貨與到期簡訊（排除 LINE / Telegram）。
5. **行動優先設計（Mobile-First RWD）**：
   - 專為單手操作設計的底部導覽列（含 iOS 安全邊界 `pb-safe`）與清楚的生命週期進度條。
   - 淺色主題採無印良品風格；深色主題採青花瓷藍風格，可在右上角切換並自動保存偏好。
   - 10 種常用物品範本提供 11 張統一的無品牌生活物品圖片，並支援在物品卡片中顯示自訂圖片。

---

## ⚡ 技術架構（Cloudflare Edge Native + 地端相容）

* **後端 API**：**Hono** 運行於 **Cloudflare Workers**（冷啟動 0ms，體積 <15KB）。
* **前端 PWA**：**Vite + React 19 + TypeScript + Tailwind CSS**（`vite-plugin-pwa` 離線快取）。
* **儲存與邊緣服務**：
  - **Cloudflare D1**：關聯式資料庫（SQLite 核心資料）。
  - **Cloudflare KV**：OTP 暫存與防刷 Rate Limiter、Passkey Challenge、Session 快取。
  - **Cloudflare R2**：物品照片、保固單據、自訂圖示（零流量費出口）。
  - **Cloudflare Scheduled**：每日晨間 08:00 定時排程通知。
* **資料庫 ORM & 地端相容**：
  - **Drizzle ORM**：在 Cloudflare 生產環境綁定 `env.DB`（D1），地端開發環境可無縫切換為本地 SQLite（`local.db`）或 PostgreSQL。

---

## 🤖 LLMs.txt 規範支援

本專案原生支援 [llmstxt.org](https://llmstxt.org/) 規範，提供結構化的 Markdown 摘要與完整規格：
- **快速導覽**：[`/llms.txt`](./public/llms.txt)
- **完整規格與 API 手冊**：[`/llms-full.txt`](./public/llms-full.txt)

---

## 🖼️ OpenGraph 社群分享

已支援 [OpenGraph](https://www.opengraph.to/) 與 Twitter Card 標準：
- **社群分享預覽圖**：[`/og.svg`](./public/og.svg) (1200x630)
- **網頁標籤**：`index.html` 內建完整 `og:title`、`og:description`、`og:image` 與 `twitter:card`。

---

## ⚙️ 已自動初始化的環境變數（.env）

專案根目錄已自動生成具備真實加密金鑰的 [`.env`](./.env) 檔案：

```ini
APP_NAME=afterBUY
APP_ORIGIN=http://localhost:5173
SESSION_SECRET=1c2f93fdc2e64effc349fc68f36f2d9558808897ec60203b866caa6908924481
CRON_SECRET=e76a6aa08212339bb971260296ebe211

# 郵件服務 (可選填 Resend，未填寫時系統會在終端機自動輸出 [DEV OTP] 供本地測試)
RESEND_API_KEY=
EMAIL_FROM=afterBUY <notifications@afterbuy.app>

# Web Push VAPID 金鑰 (已自動產生可用之一對公私鑰)
VAPID_PUBLIC_KEY=BFAkih4zSmmMr8lh7tyUvm8-C-GZ5-vtggY2Tig9KS-Z6JN2vtGoFhAuJmwuyn2QsMZnFX19Gf4nExKChPkLOFY
VAPID_PRIVATE_KEY=41Avt2-IWCIpsR0dVq6JE17KH4XdGlhRy7ni-lNpOLk
VAPID_SUBJECT=mailto:support@afterbuy.app

# 本地端資料庫
DATABASE_URL=local.db
```

---

## ☁️ Cloudflare 設定檔（wrangler.toml）

專案根目錄的 `wrangler.toml` 定義了 Cloudflare Workers 與 D1 / KV / R2 綁定：

```toml
name = "afterbuy"
main = "src/api/index.ts"
compatibility_date = "2024-11-01"
compatibility_flags = ["nodejs_compat"]

# 1. Cloudflare D1 關聯資料庫
[[d1_databases]]
binding = "DB"
database_name = "afterbuy-db"
database_id = "afterbuy-d1-local"
migrations_dir = "drizzle/migrations"

# 2. Cloudflare KV 快速快取 (OTP / 頻率限制 / Passkey 挑戰)
[[kv_namespaces]]
binding = "KV"
id = "afterbuy-kv-local"

# 3. Cloudflare R2 物件儲存 (照片 / 單據)
[[r2_buckets]]
binding = "R2"
bucket_name = "afterbuy-r2-local"

# 4. 每日晨間定時提醒 (UTC 00:00 = 台灣時間 08:00 AM)
[triggers]
crons = ["0 0 * * *"]
```

---

## 🚀 常用指令與端對端驗證

```bash
# 1. 執行全系統真實端對端整合驗證 (E2E Verification)
pnpm verify

# 2. 執行單元測試
pnpm test

# 3. 啟動前端 Vite 開發伺服器 (包含 PWA 與 API 代理)
pnpm dev

# 4. 建置 PWA 生產環境 Bundle
pnpm build
```

---

## 📜 開源授權

本專案採用 **[GNU Affero General Public License v3.0 (AGPL-3.0)](./LICENSE)** 授權開源。

---

## 📋 專案開發守則

所有參與本專案的 Agent 均需遵守 [`AGENTS.md`](./AGENTS.md) 之鐵律：
- 每次修改必須更新 [`CHANGELOG.md`](./CHANGELOG.md)（以日期 `## YYYY-MM-DD` 為標題，不使用版本號）。
- 重大改進必須同步修訂本 [`README.md`](./README.md)。
