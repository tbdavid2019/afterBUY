# AGENTS.md

本文件為 AI 代理人（Agents）在此專案中協作的最高行為準則與專案指南。

---

## ⚡ 核心鐵律（必須嚴格遵守）

1. **每次修改必記 CHANGELOG**：
   - 凡有任何功能新增、修復、重構或規格調整，**每次執行後都必須同步更新 [`CHANGELOG.md`](./CHANGELOG.md)**。
2. **CHANGELOG 一律使用「日期」而非版本號**：
   - **嚴禁使用版本號**（例如 `v1.0.0`, `1.2.0` 等）。
   - 一律使用 **`## YYYY-MM-DD`**（例如 `## 2026-09-02`）作為更新區塊的層級與標題。
   - 同一天內若有多個變更，集中在當天的日期標題下分類列出（例如：`Added`、`Changed`、`Fixed`、`Docs`）。
3. **重大改進同步修訂 README**：
   - 若有重大功能上線、架構重構、核心工作流程變動或環境配置調整，**必須同步修訂 [`README.md`](./README.md)**，確保專案說明與最新程式碼狀態完全一致。

---

## 📱 專案簡介：afterBUY

- **定位**：手機優先的 PWA 生活耗材、保固與物品週期管理工具（類似「該換了吧」與「買了之後」的 Web 整合進階版）。
- **核心功能**：
  - 耗材更換週期追蹤（牙刷、淨水器濾芯、隱形眼鏡、冷氣濾網等）。
  - 開封保存期（PAO）、食品藥品有效期限、家電保固倒數。
  - 備品庫存管理（一鍵「今天已換」自動扣減庫存）。
  - 物品健康度與視覺化進度（正常 / 即將到期 / 今日到期 / 缺備品）。
- **驗證方式**：
  - **Passkey**（FIDO2 / WebAuthn：Touch ID / Face ID / Windows Hello 生物辨識秒登）。
  - **Email 無密碼 OTP**（6 位數驗證碼，免記密碼，換機與跨裝置憑據）。
- **多管道通知策略**：
  - **Web Push**：PWA Service Worker + VAPID（支援桌面、Android 及 iOS 16.4+ 加入主畫面）。
  - **WebCal 日曆訂閱**：RFC 5545 動態 `.ics` 流（透過穩定的 `UID`、遞增 `SEQUENCE` 與 30 天軟刪除墓碑 `STATUS:CANCELLED` 徹底解決日曆舊事件殘留問題）。
  - **Email 提醒**：每日晨間摘要與即將到期警報。
  - **VIP SMS**：緊急耗盡或到期時的加值簡訊服務（排除 LINE / Telegram）。
- **UI/UX 設計原則**：
  - **Mobile-First RWD**：針對手機單手操作優化，底部導覽列包含 iOS Home Bar 安全邊界 (`pb-safe`)。

---

## 🛠️ 開發流程與規範

1. **OpenSpec 變更管理**：
   - 依循 `.agent/skills/` 與 `openspec/` 規範進行提案（Propose）、規格定義（Specs）、實作套用（Apply）與歸檔（Archive）。
2. **程式碼風格與架構**：
   - Next.js (App Router) + TypeScript + Tailwind CSS。
   - 保留清晰的文件與型別定義。
