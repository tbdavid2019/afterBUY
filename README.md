# afterBuy 該換囉 🛒

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](./LICENSE)
[![GitHub Repository](https://img.shields.io/badge/GitHub-tbdavid2019%2FafterBUY-black.svg?logo=github)](https://github.com/tbdavid2019/afterBUY)
[![llms.txt](https://img.shields.io/badge/llms.txt-Standard-green.svg)](./public/llms.txt)

> **買了之後，別再忘記換！該換的時候，一眼就知道！**
> 一款手機優先的 Cloudflare 邊緣原生 PWA 生活耗材週期更換、保存期限、保固與備品庫存管理工具。

---

## 🌟 核心特色

1. **耗材週期與壽命追蹤**：
   - 週期更換：牙刷（90 天）、淨水器濾芯（180 天）、隱形眼鏡、冷氣濾網等。
   - 開封保存期（PAO）：化妝品、保養品、眼藥水等開封後倒數。
   - 保存期限與保固：家電保固到期日、食品藥品有效期限。
   - 擴充常備品項：貼身內褲（90~180 天淘汰換新）、貼身內衣（180~365 天）、棉襪、機車安全帽（3 年交安換新）、印表機墨水、維他命C/保健品、乾電池等。
   - 屬性擴充：支援記錄「購買金額（Price）」與「規格型號（Spec/Model）」。
2. **「先存放」未拆封管理與「延後提醒 (Snooze)」**：
   - **存放模式 (Stored Mode)**：買了先囤著？勾選「先存放，還沒有要開始使用」，暫不啟動倒數計時。等拆封當天點擊「✨ 開始使用」，自動以當天為起始日啟動追蹤。
   - **延後提醒 (Snooze)**：目前暫時還不想更換？點擊選單「延後 3 天」或「延後 7 天」，貼心守護生活節奏不造成通知疲勞。
   - **存放位置標籤 (Location)**：支援標註衛浴、廚房、臥室、客廳等空間位置，並支援按位置快速篩選。
   - **Inbox Zero 成就卡片**：所有物品都處於最佳狀態時，自動呈現「100% 最佳狀態」祝賀卡片。
3. **多備品庫（Stock Spaces）協作、RBAC 與擁有權轉移**：
   - **空間解耦與多庫管理**：使用者可建立多個獨立的 Stock（例如「甜蜜的家」、「電子木工坊」、「露營設備」），每位使用者可身兼多個空間的擁有者或成員。
   - **「全部備品 (All Stocks)」預設彙整**：首頁與通知預設聚合所有可存取之備品庫，掌握全局狀態，無需頻繁切換導致遺漏更換提醒。
   - **4 級嚴密角色權限控制 (RBAC)**：`owner`（擁有者）、`admin`（管理員）、`member`（一般成員）、`viewer`（僅檢視），杜絕誤觸破壞數據。
   - **原子化轉移擁有權 (Transfer Ownership)**：支援在多成員間移交最高擁有權，移交後原擁有者平滑轉為管理員（Admin），不移出空間。
   - **8 碼邀請碼與分享連結**：管理者一鍵生成 8 碼英數字邀請代碼，支援設定使用上限與有效天數，點擊連結秒加入。
4. **手機拍照建檔（單品直拍 + 批次智慧標籤 + 訪客即開即用）與多選批次操作**：
   - **單品拍照屬性**：新增與編輯物品時支援「相機直拍（`capture="environment"`）」與「相簿選圖」，可即時預覽縮圖與移除。
   - **批次連續拍照建檔**：支援手機後鏡頭連續拍或相簿多選，提供常用範本標籤（內褲、安全帽、墨水等）一鍵秒填，多圖並行上傳至 R2。
   - **訪客零阻礙體驗**：訪客無須登入即可暢玩拍照建檔與本地新增，即開即用零網路報錯。
   - **多選批次打卡**：首頁多選模式結合浮動操作列，支援「🔥 一鍵全部換新（批次更換扣庫存）」、「📦 批次 +1 備品」與「🗑️ 批次刪除」。
   - **採購清單一鍵補貨**：在備品採購頁支援一鍵為所有急需補貨物品批次補庫存。
   - **訪客資料保存與登入帶入**：示範資料可單獨清空或恢復；訪客自行新增的物品（含照片）會保存在本機。登入後可選擇帶入有編輯權限的備品庫，匯入成功的項目不會重複，失敗項目會保留供稍後重試。
5. **字體系統與極速中英雙語系切換**：
   - **原生行動系統字體與等寬數字符號**：採用 iOS / Android 原生系統字型階層（San Francisco / Roboto / PingFang SC / 蘋方黑體），數字與日期全面啟用 `tabular-nums`，排版對齊穩定不再跳動，杜絕外包字型造成的網路阻塞與文字跳閃。
   - **雙語系支援**：原生支援繁體中文（`zh-TW`）與英文（`en`），頂部導覽列與設定頁一鍵切換，零依賴極致輕量，持久化記憶至 `localStorage`。
6. **無密碼雙軌登入（Passwordless）**：
   - **Passkey**：支援 Face ID / Touch ID / Windows Hello 生物辨識一秒極速登入。
   - **Email OTP**：6 位數一次性驗證碼，具備 Cloudflare KV 頻率限制（1 次/分、5 次/天）與新舊帳號自動 Provisioning。
7. **全覆蓋分階段通知管道（Multi-Channel Alerts）**：
   - **Phase 1 (MVP)**：
     - **PWA Web Push**：Service Worker 背景系統通知（桌面 / Android / iOS 16.4+ 加入主畫面）。
     - **WebCal 日曆同步（推薦）**：RFC 5545 標準 `.ics` 訂閱流，透過穩定 `UID`、遞增 `SEQUENCE`、`STATUS:CANCELLED` 墓碑機制與 **Calendar Token 安全輪替**，確保 Apple/Google 日曆精準更新，絕無舊事件殘留。
     - **Email 提醒**：每日晨間摘要與即將到期提醒。
   - **Phase 2 (VIP 加值)**：
     - **VIP SMS**：高優先級緊急耗材缺貨與到期簡訊（排除 LINE / Telegram）。
8. **行動優先與嚴謹設計系統（Mobile-First & Design Tokens）**：
   - **嚴謹排版階層規範（Typographic Scale）**：嚴格收斂全站字級（頁面標題 22px、區塊標題 17px、內文 15px、按鈕 14px、輔助資訊 13px、徽章 12px），杜絕任意像素與字體忽大忽小，所有按鈕具備 >= 44×44pt 拇指操作舒適熱區。
   - **語意化雙色主題系統（Theme Design Tokens）**：全站樣式全面綁定語意化 CSS 設計代碼（`--app-*`），淺色主題採日系無印暖石風格（MUJI Warm Paper），深色主題採青花瓷藍風格（Qinghua Porcelain），光暗對比分明溫潤，杜絕色塊錯亂或文字辨識不清。
   - **單手舒適操作與峰值體驗反饋**：專為單手操作設計的底部導覽列（含 iOS 安全邊界 `pb-safe`）、頂層 Portal 模態抽屜、清楚的生命週期進度條，以及更換與啟用時的愉悅成就感微動效。
   - 常用物品範本提供統一的無品牌生活物品圖片，並支援在物品卡片中顯示自訂實體照片。

---

## ⚡ 技術架構（Cloudflare Edge Native + 地端相容）

* **後端 API**：**Hono** 運行於 **Cloudflare Workers**（冷啟動 0ms，體積 <15KB）。
* **前端 PWA**：**Vite + React 19 + TypeScript + Tailwind CSS**（`vite-plugin-pwa` 離線快取）。
  - 導覽頁採 NetworkFirst，`index.html` 與必要資源可離線使用；新版更新會先提示，避免強制重整中斷表單或訪客照片編輯。
  - 生命週期日期以 `Asia/Taipei` 業務日計算，跨日或回到前景時會重新計算訪客狀態。
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
SESSION_SECRET=your_32_character_session_secret_here
CRON_SECRET=your_cron_trigger_secret_here

# 郵件服務 (可選填 Resend，未填寫時系統會在終端機自動輸出 [DEV OTP] 供本地測試)
RESEND_API_KEY=
EMAIL_FROM=afterBUY <notifications@afterbuy.app>

# Web Push VAPID 金鑰
VAPID_PUBLIC_KEY=your_vapid_public_key_here
VAPID_PRIVATE_KEY=your_vapid_private_key_here
VAPID_SUBJECT=mailto:support@afterbuy.app

# 本地端資料庫
DATABASE_URL=local.db
```

---

## ☁️ Cloudflare 雙帳號部署架構（wrangler.toml）

專案支援多帳號與多環境部署。根目錄的 `wrangler.toml` 已配置原生 Workers Static Assets，並針對兩大獨立 Cloudflare 帳戶（`ai360` 與 `david`）分別綁定專屬之 D1 資料庫、KV 快取與 R2 儲存桶：

```toml
name = "afterbuy"
main = "src/api/index.ts"
compatibility_date = "2024-11-01"
compatibility_flags = ["nodejs_compat"]

# 前端靜態資源託管 (React PWA SPA)
[assets]
directory = "./dist"
not_found_handling = "single-page-application"

[triggers]
crons = ["0 0 * * *"]

# 帳號 1: ai360
[env.ai360]
name = "afterbuy"
account_id = "aa3bf2b79b8bbdbf05b4e289bd7c4d91"
[[env.ai360.d1_databases]]
binding = "DB"
database_name = "afterbuy-db"
database_id = "c682ad96-a780-4428-b7db-b3807dc7e24e"

# 帳號 2: david (DAVID江江江)
[env.david]
name = "afterbuy"
account_id = "379570860738dd1757ba7f67ef2bdffe"
[[env.david.d1_databases]]
binding = "DB"
database_name = "afterbuy-db"
database_id = "d86afa44-8870-44c7-b28d-fc88e1868d01"
```

---

## 🚀 常用指令與雙帳號部署

```bash
# 1. 執行全系統真實端對端整合驗證 (E2E Verification)
pnpm verify

# 2. 執行單元測試
pnpm test

# 3. 啟動前端 Vite 開發伺服器 (包含 PWA 與 API 代理)
pnpm dev

# 4. 建置前端 PWA 生產環境 Bundle
pnpm build

# 5. 部署至指定帳號 (自動先建置前端再發布)
pnpm deploy:ai360   # 部署至 ai360 帳號
pnpm deploy:david   # 部署至 david 帳號
pnpm deploy:all     # 同時部署至兩個帳號

# 6. 遠端 D1 資料庫遷移
pnpm db:migrate:ai360
pnpm db:migrate:david
```

---

## 📜 開源授權

本專案採用 **[GNU Affero General Public License v3.0 (AGPL-3.0)](./LICENSE)** 授權開源。

---

## 📋 專案開發守則

所有參與本專案的 Agent 均需遵守 [`AGENTS.md`](./AGENTS.md) 之鐵律：
- 每次修改必須更新 [`CHANGELOG.md`](./CHANGELOG.md)（以日期 `## YYYY-MM-DD` 為標題，不使用版本號）。
- 重大改進必須同步修訂本 [`README.md`](./README.md)。
