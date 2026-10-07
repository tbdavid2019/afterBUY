# Design: LLM Agent Skill & API Key Architecture

## Context

afterBUY 目前採用 Hono 在 Cloudflare Workers 上運行，資料庫為 Cloudflare D1 (SQLite)，前端為 Vite + React PWA。目前認證體系以 HTTP-Only Cookie 儲存 signed session token（由 Email OTP 或 WebAuthn Passkey 產生）。
為讓外部 AI 系統（OpenAI GPTs、Claude Projects、Cursor、Antigravity、Open WebUI、快捷指令 Shortcut、Home Assistant 等）能夠無縫代管耗材與庫存，需要引入長期有效且可個別撤銷的 Bearer API Key，以及專為 Agent 設計的高語意化 REST API 與 Skill 定義。

## Goals / Non-Goals

**Goals:**
- **安全金鑰生命週期**：支援建立、雜湊儲存（SHA-256）、顯示（僅於建立當下呈現一次完整明文）、列出、最後使用時間戳更新、以及即時撤銷。
- **雙重認證中間件（Dual-Mode Auth）**：同一後端 API 體系透明支援現有 Web Cookie 與 `Authorization: Bearer ab_live_...`，自動綁定請求所屬之 User 與 Stock Space。
- **Agent 專屬 REST API（`/api/v1/...`）**：設計簡潔、標準、對 LLM 友善的 JSON 接口，完整涵蓋物品查詢（過期/即將到期/缺備品篩選）、新增、修改、刪除、更換（replace）、扣量（consume）與庫存空間清單。
- **標準化 Agent Skill 文件（`skill.md`）與 `llms.txt` 升級**：遵循業界 Agent Skill 規格，包含指令定義、語意對照表與自然語言意圖映射範例。
- **前端設定頁一鍵整合面板**：在 `SettingsView.tsx` 打造視覺化的 API Key 管理與「一鍵產生個人 Agent Prompt」卡片，使用者可直接將包含自己金鑰與 Base URL 的 System Prompt 貼入外部 LLM。

**Non-Goals:**
- 不實作複雜的 OAuth2 Code Grant 流程（個人 Agent 連動採用主流且直接的 Bearer API Key 即可滿足 100% 需求）。
- 不限制或內嵌特定的 LLM 模型推論端（外部使用者的 Agent 自行攜帶模型，afterBUY 專注於提供世界級的 Tool API）。

## Decisions

### 1. 金鑰格式與儲存策略
- **格式**：`ab_live_` + 32 bytes 隨機十六進位字串（共 72 字元），前綴明確辨識為 afterBUY Live Key。
- **儲存結構**：
  - `id`: `text` (Primary Key, UUID)
  - `userId`: `text` (所屬使用者 ID)
  - `name`: `text` (使用者命名，如 "ChatGPT Action" 或 "Home Assistant")
  - `keyPrefix`: `text` (前 16 字元，如 `ab_live_7f8c1234...` 供前端辨識)
  - `keyHash`: `text` (Web Crypto SHA-256 雜湊值，唯一索引)
  - `stockId`: `text` 可選（`null` 代表授權存取該使用者名下所有備品庫，或指定特定空間）
  - `scopes`: `text`（預設 `'read,write'`）
  - `createdAt`: `text` (ISO 字串)
  - `lastUsedAt`: `text` (ISO 字串，成功認證時更新)
  - `revokedAt`: `text` (撤銷時間戳，非空即代表失效)
- **安全保障**：明文金鑰僅於建立成功的 HTTP 回應中呈現一次，前端不存 `localStorage`，後端永不落盤明文。

### 2. 認證中間件架構 (`src/api/middleware/auth.ts`)
- 實作雙軌認證中間件：
  1. 優先檢查 `Authorization: Bearer <token>`：
     - 若以 `ab_live_` 開頭，計算 SHA-256，並以精確索引比對 `api_keys` 表格中未撤銷之記錄。
     - 若有效，非同步更新 `lastUsedAt`（具備頻率防抖），並將對應的 `user` 與 `apiKey` 物件存入 Context `c.set('user', user)`。
  2. 若無 Bearer Header 或非 API Key，接續檢查現有 Signed Cookie。
  3. 若均無有效憑據，返回 HTTP 401 Unauthorized。

### 3. Agent 專屬 REST 路由架構 (`src/api/routes/agentApi.ts` -> `/api/v1/*`)
- 為外部 AI Agent 打造乾淨、符合 OpenAPI 規範且隔離的路由：
  - `GET /api/v1/openapi.json`：回傳 OpenAPI 3.1 規範，專供 ChatGPT GPTs Actions 匯入。
  - `GET /api/v1/items`：支援 `status`（`overdue`, `due_soon`, `low_stock`, `all`）、`category`、`q`、`stockId` 查詢，依 `Asia/Taipei` 午夜邊界精準計算生命週期與剩餘天數。
  - `POST /api/v1/items`：建立新耗材物品（若未指定 `stockId` 則自動歸入預設空間）。
  - `GET /api/v1/items/:id`：取得單一耗材詳情與最新 10 筆更換歷程。
  - `PATCH /api/v1/items/:id`：更新耗材參數與備品庫存。
  - `DELETE /api/v1/items/:id`：刪除耗材。
  - `POST /api/v1/items/:id/replace`：觸發「今天已換」。若備品為 0 仍允許記錄更換，但回傳 `stockDeducted: false` 與警示；使用單一 D1 交易原子更新物品與新增歷程。
  - `POST /api/v1/items/:id/consume`：消耗指定數量（如 `{ "amount": 2 }`），不足時扣至 0 並回傳實際扣減量。
  - `GET /api/v1/stocks`：查詢所屬備品庫清單（已脫敏，過濾行事曆 Token 等敏感資料）。

### 4. `public/skill.md`、`llms.txt` 與設定頁導引分流
- **文件規範**：
  - `public/skill.md`：提供符合 Agent Skill 規範之 Markdown，明列意圖對照表（例如「我剛剛開了一瓶魚油」-> `POST /replace`）。
  - `llms.txt`：由伺服器與靜態檔維護單一真實來源，定義清晰的耗材生活週期語意。
- **設定頁面分流導引（SettingsView）**：
  - **ChatGPT GPT Actions 分頁**：提供 OpenAPI JSON 連結、Base URL 與 API Key 配置步驟。
  - **Claude / Cursor / 通用 Prompt 分頁**：提供內嵌使用者專屬 API Key、Base URL 與 Tool 呼叫指引的一鍵複製 System Prompt。

## Risks / Trade-offs

- **[風險] 金鑰外洩風險**：使用者若將包含金鑰的 Prompt 或 Actions 設定公開。
  - **緩解**：
    1. 支援空間範圍限制（`stockId` Scope），外部 Agent 可限制僅能讀寫特定空間（如「辦公室」或「客廳」）。
    2. 提供隨時「一鍵撤銷（Revoke）」功能，撤銷後立刻阻絕所有請求。
    3. 資料庫只存 SHA-256 雜湊，即便資料庫遭存取也無法還原原始金鑰。
- **[風險] 頻繁請求導致 Worker D1 寫入開銷**：
  - **緩解**：`lastUsedAt` 僅在距上次更新超過 5 分鐘時才執行寫入更新，大幅降低 D1 寫入負擔。

## Migration Plan

1. **D1 Migration**：撰寫 D1 遷移腳本建立 `api_keys` 表格，並套用至本地與遠端 `afterbuy-db`。
2. **後端實作**：在 `src/api/routes/apiKeys.ts`、`src/api/routes/agentApi.ts` 與 `src/api/middleware/auth.ts` 實裝認證與端點。
3. **文件與 Skill 佈署**：編寫 `public/skill.md`，更新 `/llms.txt` 與 `public/llms-full.txt`。
4. **前端整合**：在 `SettingsView.tsx` 打造金鑰生成/管理元件與 ChatGPT Action / Claude Prompt 雙模式產生器。
5. **部署與測試**：執行全套單元測試、編譯檢查，套用遠端 D1 遷移並全量發佈。
