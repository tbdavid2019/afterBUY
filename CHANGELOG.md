# Changelog

本專案所有重要更新紀錄。依據 `AGENTS.md` 鐵律，記錄格式一律以**日期（YYYY-MM-DD）**排序，不使用版本號。

---

## 2026-09-02

### Added
- 建立專案規範 `AGENTS.md`，明定每次修改必記 CHANGELOG（以日期為標題）與重大改進修訂 README 之鐵律。
- 完成 OpenSpec 提案與完整規格文件 `init-afterbuy-pwa`（6 大階段共 23 項任務全部實作完成）。
- **本地環境與金鑰自動初始化**：
  - 自動生成 `.env`，包含真實 VAPID（公私鑰對）、`SESSION_SECRET` 與 `CRON_SECRET`。
  - 建立 `scripts/init-db.ts`（`pnpm db:init`）自動完成本地 SQLite (`local.db`) 6 大資料表建立。
  - 建立 `scripts/verify-full-system.ts`（`pnpm verify`）執行端對端全功能實測，包含無密碼 Session、物品生命週期計算、一鍵「今天已換」扣庫存、RFC 5545 WebCal 格式驗證。
- **後端架構 (Hono on Cloudflare Workers & D1/KV/R2)**：
  - `src/api/routes/auth.ts`：實作 FIDO2/WebAuthn Passkey（Touch ID / Face ID）生物辨識登入與綁定，以及 Email 6 位數 OTP 驗證碼登入（支援 KV 60 秒頻率限制與每日 5 次配額、自動帳號 Provisioning）。
  - `src/api/routes/items.ts`：實作物品 CRUD、純生命週期計算（週期天數、PAO 開封月數、保固日）、一鍵「今天已換」重置計時器與自動扣減備品庫存、更換歷史履歷記錄。
  - `src/api/routes/calendar.ts`：實作 RFC 5545 動態 WebCal 日曆流（`/api/calendar/:token.ics`），透過穩定 `UID`、遞增 `SEQUENCE`、30 天軟刪除墓碑 `STATUS:CANCELLED` 徹底消除日曆舊事件殘留，並提供一鍵「重新產生金鑰（Token Rotation）」功能。
  - `src/api/routes/notifications.ts`：實作 Web Push VAPID 訂閱管理、Email 晨間摘要信寄發、Cloudflare Scheduled Cron 排程處理器。
  - `src/api/routes/upload.ts`：實作 Cloudflare R2 物件儲存上傳與媒體讀取。
  - `src/api/db/schema.ts` & `index.ts`：Drizzle ORM 多環境適配（支援 Cloudflare D1 與地端 SQLite `local.db` / PostgreSQL）。
- **前端 PWA (Vite + React 19 + Tailwind CSS)**：
  - `src/client/components/Navbar.tsx`：手機優先底部導覽列（支援 iOS Home Bar 安全邊界 `pb-safe`）。
  - `src/client/views/DashboardView.tsx`：物品總覽、即時搜尋、健康狀態篩選（🔥 快到期 / 🌿 正常 / 🛒 缺備品）、類別標籤過濾。
  - `src/client/views/TimelineView.tsx`：到期日先後順序時間軸檢視。
  - `src/client/views/ShoppingView.tsx`：待補貨備品專屬清單、一鍵「複製採購清單」與 `+ / -` 快速庫存調整。
  - `src/client/views/SettingsView.tsx`：1 鍵「加入 Apple 日曆 / 複製訂閱網址」、金鑰輪替、Web Push 推播開關、Email 晨間摘要設定、Passkey 裝置管理。
  - `src/client/components/ItemCard.tsx`：生命週期漸層進度條、到期倒數提示、一鍵「今天已換」觸覺按鈕。
  - `src/client/components/ItemModal.tsx`：10 種常用耗材範本（牙刷、濾芯、防曬乳等）一鍵快速帶入。
  - `src/client/components/AuthModal.tsx`：Passkey 秒登 + 6 位數 OTP 驗證 + 登入後即時邀請綁定 Passkey。
- **測試與建置**：
  - `tests/lifecycle_and_auth.test.ts`：9 項單元測試全部 100% 通過。
  - `pnpm verify`：端對端真實整合驗證全部通過。
- 產出 `dist/` PWA Service Worker 與 Web Manifest。

### Changed
- 全面整理前端視覺語言：淺色主題採無印良品風格的米白、灰褐與低飽和紅棕；深色主題採青花瓷藍的墨藍、瓷藍與瓷白。
- 新增淺色／深色主題切換，保存使用者偏好並同步瀏覽器 `theme-color`。
- 優化 dashboard、時程、補貨、設定、登入、物品編輯與履歷介面的資訊層級、按鈕對比、鍵盤 focus、ARIA 標記與手機安全間距。
- Dashboard 改以「該處理／狀態良好／要補貨」三段摘要引導操作，並降低漸層、陰影與裝飾性卡片的使用。
