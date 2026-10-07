# Proposal: LLM Agent Skill Integration & Personal API Key Management

## Why

目前 afterBUY 提供手機優先的 PWA 與 Web 介面，但使用者日常可能透過個人 LLM 助理（如 ChatGPT、Claude、Cursor、Antigravity、Open WebUI 等）進行生活管理。當使用者向 AI 說「我剛剛開了一瓶新魚油」或「幫我看家裡這週有什麼耗材要換」，外部 Agent 目前無法直接與 afterBUY 連動。

為實現「AI Agent 秒級接管生活耗材」，afterBUY 需要：
1. 建立正式的個人 API Key 認證與管理機制。
2. 抽象出乾淨、語意化且 Agent-Friendly 的 OpenAPI / REST API 接口（支援完整新增、查詢、修改、刪除、更換與庫存扣減）。
3. 產出專屬的 `skill.md`、擴充 `llms.txt` 與在「設定」頁面提供「一鍵複製個人化 Agent Prompt & API Key」，讓使用者能直接將 Skill 丟給自己的任何 LLM Agent 運作。

## What Changes

- **個人 API Key 管理系統（API Key Auth & Management）**：
  - 資料庫新增 `api_keys` 表格，支援使用者在「設定」頁面建立、檢視、撤銷 API Key（格式如 `ab_live_xxxx`）。
  - API Key 具備哈希儲存、最後使用時間追蹤（`lastUsedAt`）與權限隔離（綁定所屬帳號與備品庫）。
  - 後端 API 支援 `Authorization: Bearer ab_live_xxxx` 認證。
- **Agent 專屬語意化 REST API（Agent REST API Endpoints）**：
  - `/api/v1/items`：耗材物品之清單查詢（支援 `status=overdue,due_soon,low_stock`、`category`、`q` 搜尋）、單項詳情、新增、更新、刪除。
  - `/api/v1/items/:id/replace`：快速觸發「今天已換」（自動計算新週期與扣減備品）。
  - `/api/v1/items/:id/consume`：快速扣減數量（數量模式自動或手動記帳）。
  - `/api/v1/stocks`：查詢可存取之備品庫清單與空間狀態。
- **標準化 Agent Skill、OpenAPI 與 LLM 上下文文件**：
  - 建立正式的 `/skill.md` 遵循標準 Agent Skill 規範，包含情境定義、參數結構、REST 呼叫範例與錯誤處理。
  - 提供 `/api/v1/openapi.json` 供 ChatGPT GPTs Actions 一鍵匯入。
  - 同步擴充升級 `/llms.txt` 與 `/llms-full.txt`，供各類 AI 檢索器精準理解 afterBUY 的資料結構與生命週期規則。
- **設定頁面「AI 助理連動（LLM Agent & API Key）」面板**：
  - 提供 API Key 產生器與金鑰列表（建立時僅顯示一次完整 Key，支援選擇綁定特定備品庫或全部備品庫）。
  - 分流提供「ChatGPT GPT Actions（OpenAPI URL + 指南）」與「Claude / Cursor / 通用 Agent Prompt（內嵌 API Key 與端點）」雙模式，讓使用者依平台無縫配置。

## Capabilities

### New Capabilities
- `agent-api-and-keys`: 個人 API Key 的資料表架構、安全哈希、空間與權限隔離、生命週期管理與 `Bearer ab_live_...` 認證中間件，以及專為 Agent 設計的標準語意化 CRUD/Action API 與 OpenAPI 定義。
- `llm-agent-skill`: 提供標準化 `skill.md`、升級版 `llms.txt`、以及前端「設定」頁面中的個人化 Prompt / OpenAPI 匯出面板與平台整合說明。

### Modified Capabilities
- `auth-passwordless`: 擴充既有認證管道，使 API 路由除支援現有 Cookie/Session 外，亦無縫接受 `Authorization: Bearer ab_live_...` 存取。

## Impact

- **後端架構**：
  - `src/api/db/schema.ts`：新增 `apiKeys` 資料表結構（含 `stockId` 範圍與 `scopes`）。
  - `src/api/routes/`：新增 `apiKeys.ts`（金鑰管理）與 `agentApi.ts`（`/api/v1/` 語意化接口及 `openapi.json`）。
  - `src/api/middleware/auth.ts` / `src/api/index.ts`：擴充驗證中介軟體支援 API Key 驗證與最後使用時間更新。
- **靜態與文件**：
  - 新增 `public/skill.md`，更新 `/llms.txt` 與 `public/llms-full.txt`。
- **前端設定頁**：
  - `src/client/views/SettingsView.tsx`：新增「AI Agent 連動與 API Key」設定卡片（支援 ChatGPT Action 與 Claude/通用 Prompt 雙分頁）。
- **資料庫遷移**：
  - 需產生並套用 D1 Migration（本地、ai360、david）。
