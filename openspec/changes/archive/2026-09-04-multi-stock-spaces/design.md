## Context

現有系統採用單層資料模型（`users.id -> items.user_id`），無法進行多使用者協作或多情境獨立分流。系統運行於 Cloudflare Workers (Hono) 與 Cloudflare D1 (SQLite)，前後端為同源部署的 Vite React 19 PWA。相關背景與核心問題請參見 `proposal.md`。

## Goals / Non-Goals

**Goals:**
- 將使用者（`users`）與庫存集合（`stocks`）完全解耦，實現多對多協作架構。
- 支援四級 RBAC 角色（`owner`、`admin`、`member`、`viewer`）與原子化擁有權轉移（Transfer Ownership）。
- 支援一鍵產生邀請碼（8 位代碼或短連結）與加入流程。
- 提供「全部備品（All Stocks）」預設全景視圖與「單一 Stock」專注視圖雙軌切換。
- 維持綜合通知（Email 晨間摘要、Web Push、鈴鐺警報）的全域匯總能力，並在推播與行事曆中標註 Stock 來源。
- 提供零停機、零資料損失的自動資料庫遷移與回填策略。

**Non-Goals:**
- 自訂細粒度權限規則（4 種固定角色已足夠涵蓋家庭與工作坊需求）。
- 跨 Stock 物品直接拖曳移動（先在 v1 保持單一物品歸屬明確，後續版本再評估移動需求）。
- 企業級組織階層或部門樹狀結構（聚焦於輕量生活與創客工坊場景）。

## Decisions

### 1. 概念名詞定案為「Stock / 備品庫」
- **決策**：在使用者介面與資料庫中統一採用 `Stock`（中文為「備品庫」或「Stock」），捨棄 `Workspace`。
- **理由**：`Workspace` 帶有過重的 B2B / SaaS 辦公嚴肅感；`Stock` 兼具生活日常耗材庫存與專業工坊備料的本質，輕盈且名詞精準。
- **替代方案**：`Space`（稍微泛指）、`Vault`（過度像密碼保險箱）、`Circle`（偏向社交人際）。

### 2. 資料模型（Schema Design）
- **`stocks` 表**：
  - `id`: TEXT (UUID primary key)
  - `name`: TEXT NOT NULL (例如: "甜蜜的家", "電子與木工坊")
  - `icon`: TEXT NOT NULL DEFAULT '📦' (Emoji 圖示)
  - `description`: TEXT
  - `owner_id`: TEXT NOT NULL REFERENCES `users(id)`
  - `calendar_token`: TEXT NOT NULL UNIQUE (專屬 WebCal 訂閱金鑰)
  - `created_at`, `updated_at`, `deleted_at`
- **`stock_members` 表**：
  - `id`: TEXT (UUID primary key)
  - `stock_id`: TEXT NOT NULL REFERENCES `stocks(id)`
  - `user_id`: TEXT NOT NULL REFERENCES `users(id)`
  - `role`: TEXT NOT NULL ('owner' | 'admin' | 'member' | 'viewer')
  - `nickname`: TEXT (在該 Stock 內的稱呼，如: "爸爸", "媽媽")
  - `created_at`
- **`stock_invites` 表**：
  - `id`: TEXT (UUID primary key)
  - `stock_id`: TEXT NOT NULL REFERENCES `stocks(id)`
  - `code`: TEXT NOT NULL UNIQUE (8 碼隨機字串)
  - `role`: TEXT NOT NULL DEFAULT 'member'
  - `created_by_user_id`: TEXT NOT NULL REFERENCES `users(id)`
  - `expires_at`: TEXT NOT NULL
  - `used_count`: INTEGER DEFAULT 0
  - `max_uses`: INTEGER DEFAULT 10
- **`items` 表調整**：
  - 新增 `stock_id`: TEXT REFERENCES `stocks(id)`
  - 新增 `created_by_user_id`: TEXT REFERENCES `users(id)`
  - 歷史更換表 `item_history` 新增 `replaced_by_user_id`: TEXT REFERENCES `users(id)`

### 3. 擁有權轉移（Transfer Ownership）的交易原子性
- **決策**：轉移由後端端點 `POST /api/stocks/:id/transfer-ownership` 執行。
- **實作邏輯**：在 D1 Batch Transaction 中驗證呼叫者為當前 `owner`，目標對象已在成員名單內。原子化更新：
  1. `stocks.owner_id = new_owner_id`
  2. 目標成員的 `stock_members.role = 'owner'`
  3. 原 Owner 的 `stock_members.role = 'admin'`
- **優勢**：絕不把原 Owner 移出 Stock，平滑轉為 Admin，兼具權力交接與協作延續性。

### 4. 預設全景「All Stocks」與單一 Stock 聚焦模式
- **決策**：前端狀態維護 `selectedStockId: string | 'all'`（預設為 `'all'`，持久化於 `localStorage`）。
- **理由**：避免「忘記切換導致工坊耗材過期」的嚴重體驗斷層；日常打開 App 一眼看盡所有待換清單，需要採購或整理特定空間時一鍵聚焦。

### 5. 平滑遷移策略（Zero Data Loss Migration）
- **決策**：在 Migration 腳本中，針對既有資料庫中尚未建立 Stock 的每一位使用者：
  1. 自動生成一筆預設 Stock（名稱："個人生活備品"，icon："🏠"，`owner_id = user.id`）。
  2. 自動在 `stock_members` 建立 `owner` 記錄。
  3. 將該使用者既有的所有 items 的 `stock_id` 更新為此預設 Stock ID。
- **成效**：既有使用者升級後無感進入，既有物品 100% 保留，立即解鎖新增第二個 Stock 與邀請家人功能。

## Risks / Trade-offs

- **[訪客模式相容]** 訪客在無帳號下體驗：
  → *緩解方案*：訪客模式在本機記憶體與 localStorage 中建立模擬的預設 Stock，完全不阻礙訪客體驗。
- **[多 Stock 推播混淆]** 使用者不知道推播提醒來自哪個庫：
  → *緩解方案*：推播標題與郵件明細嚴格加上 `[Stock 名稱]` 前綴（例：`[甜蜜的家] Brita 濾芯今天到期`）。
- **[誤解散風險]** Owner 誤觸刪除 Stock 導致全部物品遺失：
  → *緩解方案*：解散 Stock 需在彈窗手動輸入該 Stock 名稱作為二次防呆確認，非 Owner 角色連按鈕都看不到。
