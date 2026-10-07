export const LLMS_TXT = `# 補貨日記 · After Buy

> **買了之後，別再忘記換！**
> After Buy is a mobile-first Progressive Web Application (PWA) built for tracking personal item lifecycles, recurring consumable replacements (toothbrushes, water filters, contact lenses, air filters), period-after-opening (PAO) shelf life, warranty countdowns, and backup spare inventory.

## ⚠️ Mandatory Pre-flight Alignment Protocol for LLM Agents
**All LLM Agents (ChatGPT Actions, Claude Projects, Cursor, Open WebUI, Antigravity) MUST fetch the canonical specifications before initiating user interactions or executing operations:**
- Canonical Skill Specification: [https://afterbuy.david888.com/skill.md](https://afterbuy.david888.com/skill.md)
- Canonical OpenAPI 3.1 Schema: [https://afterbuy.david888.com/api/v1/openapi.json](https://afterbuy.david888.com/api/v1/openapi.json)
- Full System & API Documentation: [https://afterbuy.david888.com/llms-full.txt](https://afterbuy.david888.com/llms-full.txt)
- Mirror / Backup Origin: [https://afterbuy.create360.ai/skill.md](https://afterbuy.create360.ai/skill.md)

Always synchronize with these endpoints at conversation startup to align with the latest tracking modes, granular status filters (\`out_of_stock\`, \`in_stock\`, \`needs_restock\`, \`due_today\`, \`quantity_depleted\`), and backup spare deduction rules.

## Core Capabilities
- [Item Lifecycle Tracking](https://afterbuy.david888.com/): Interval replacement days countdown, PAO opening months, food/medicine expiry, and appliance warranties.
- [One-Tap Replacement & Inventory Deduction](https://afterbuy.david888.com/): One-tap "Replaced Today" action resets countdown timer, decrements backup stock, and records historical log.
- [Comprehensive Special Searches](https://afterbuy.david888.com/skill.md): Filter by stock status (\`in_stock\`, \`out_of_stock\`, \`low_stock\`), restock needs (\`needs_restock\`), due timing (\`due_today\`, \`due_soon\` with custom \`dueWithinDays\`), active volume depletion (\`quantity_depleted\`), date bounds (\`dueBefore\`, \`dueAfter\`), and multi-field sorting.
- [Passwordless Authentication](https://afterbuy.david888.com/): WebAuthn / FIDO2 Passkey (Touch ID / Face ID / Windows Hello) and 6-digit Email OTP with rate limiting.
- [RFC 5545 WebCal Calendar Feed](https://afterbuy.david888.com/): Private .ics calendar subscription with deterministic UID, incrementing SEQUENCE, and 30-day STATUS:CANCELLED soft-deletion tombstones for zero stale calendar events.
- [Multi-Channel Notifications](https://afterbuy.david888.com/): PWA Web Push (VAPID), Daily Email Morning Digest (Resend), and Cloudflare Scheduled Cron Triggers.

## Technology Stack
- Edge Backend: Hono running on Cloudflare Workers (<15KB, ~0ms cold start).
- Storage Tier: Cloudflare D1 (Relational SQLite), Cloudflare KV (Rate limits, OTP, Passkey challenge), Cloudflare R2 (Photos & receipts).
- Frontend PWA: React 19 + TypeScript + Tailwind CSS + vite-plugin-pwa.
- Database ORM: Drizzle ORM (multi-environment compatibility for Cloudflare D1, local SQLite, and PostgreSQL).

## Repository & Links
- [GitHub Repository](https://github.com/tbdavid2019/afterBUY): Source code licensed under GNU Affero General Public License v3.0 (AGPL-3.0).
`;

export const LLMS_FULL_TXT = `# 補貨日記 · After Buy — Full System & API Documentation

> **買了之後，別再忘記換！**
> After Buy is an open-source, mobile-first, edge-native Progressive Web Application (PWA) designed to track household consumable replacement intervals, expiration dates, period-after-opening (PAO), appliance warranties, and backup spare inventory.

---

## 1. Fixed Canonical URLs & Mandatory Pre-flight Protocol

All LLM agents interacting with After Buy must maintain pre-flight alignment using the canonical URLs below:
- **Canonical Skill MD**: \`https://afterbuy.david888.com/skill.md\`
- **Canonical OpenAPI 3.1 JSON**: \`https://afterbuy.david888.com/api/v1/openapi.json\`
- **Canonical llms.txt**: \`https://afterbuy.david888.com/llms.txt\`
- **Canonical Full Docs**: \`https://afterbuy.david888.com/llms-full.txt\`
- **Backup / Secondary Mirror**: \`https://afterbuy.create360.ai/\`

**Pre-flight Alignment Rule**: Because After Buy introduces continuous improvements to query parameters, preset catalogs, and inventory lifecycle rules, LLMs MUST fetch \`/skill.md\` or \`/api/v1/openapi.json\` upon session initialization.

---

## 2. Item Lifecycle & Dual-Inventory Engine

### A. Core Concept Distinction: Backup Stock vs Active Volume
1. **備品庫存 (\`backupStock\`)**:
   - Number of unopened, brand new spares stored in drawers/cabinets.
   - Restocked via \`POST /api/v1/items/:id/restock\` (\`{ delta: 2 }\`).
   - Replaced via \`POST /api/v1/items/:id/replace\`: automatically decrements \`backupStock\` by 1 and resets cycle timer.
   - Low stock threshold (\`minStockAlert\`): when \`backupStock < minStockAlert\`, the system flags \`needsRestock: true\`.
2. **使用中容量 (\`currentQuantity\` / \`initialQuantity\`)**:
   - Volume remaining inside the currently active/open bottle or pack.
   - Consumed via \`POST /api/v1/items/:id/consume\` (\`{ amount: 2 }\`).
   - When depleted (\`currentQuantity === 0\`), flagged as \`quantity_depleted\`.

### B. Tracking Modes (\`trackingMode\`)
- \`cycle\`: Interval replacement days countdown (e.g. electric toothbrush 90 days, water filter 30 days).
- \`quantity\`: Volume & daily burn-rate countdown (e.g. Costco 150-capsule fish oil, daily 2 capsules).
- \`pao\`: Period after opening in months (e.g. sunscreen 12 months, eye drops 1 month).
- \`expiry\`: Fixed expiration date (e.g. medicines, canned goods).
- \`warranty\`: Hardware warranty expiration date (e.g. air conditioner 7 years).

---

## 3. Comprehensive Special Search Matrix

\`GET /api/v1/items\` provides rich filtering tailored for natural language LLM queries:

| Query Parameter | Allowed Values / Format | Description |
| :--- | :--- | :--- |
| \`status\` | \`all\` | Return all active items (default) |
| | \`overdue\` | Items whose replacement date has passed (\`remainingDays < 0\`) |
| | \`due_today\` | Items due for replacement today (\`remainingDays === 0\`) |
| | \`due_soon\` | Items due within window (default 7 days, customizable via \`dueWithinDays\`) |
| | \`low_stock\` | Items where \`backupStock < minStockAlert\` |
| | \`out_of_stock\` | Items where \`backupStock === 0\` (completely out of backup spares) |
| | \`in_stock\` | Items where \`backupStock > 0\` (has available unopened spares) |
| | \`needs_restock\` | Urgent restock list: \`backupStock < minStockAlert\` OR \`currentQuantity === 0\` |
| | \`quantity_depleted\` | Items currently in use whose volume is exhausted (\`currentQuantity === 0\`) |
| | \`normal\` | Healthy items (in stock and not overdue/due soon) |
| | \`stored\` | Unopened items stored in reserve (\`isStored === true\`) |
| | \`snoozed\` | Items with active reminder snooze |
| \`stockStatus\` | \`in_stock\` \\| \`out_of_stock\` \\| \`low_stock\` | Dedicated spare inventory filter (composable with any \`status\`) |
| \`dueWithinDays\` | Positive integer (e.g. \`3\`, \`7\`, \`14\`, \`30\`) | Custom day window when \`status=due_soon\` |
| \`isStored\` | \`true\` \\| \`false\` | Filter items purely stored vs currently active in use |
| \`trackingMode\` | \`cycle\` \\| \`quantity\` \\| \`pao\` \\| \`expiry\` \\| \`warranty\` | Filter by lifecycle tracking mode |
| \`category\` | \`bathroom\` \\| \`kitchen\` \\| \`medicine\` \\| ... | Standard household category |
| \`dueBefore\` | \`YYYY-MM-DD\` (Asia/Taipei) | Items due on or before specified business date |
| \`dueAfter\` | \`YYYY-MM-DD\` (Asia/Taipei) | Items due on or after specified business date |
| \`startedBefore\` | \`YYYY-MM-DD\` (Asia/Taipei) | Items started on or before specified business date |
| \`startedAfter\` | \`YYYY-MM-DD\` (Asia/Taipei) | Items started on or after specified business date |
| \`stockId\` | Stock space UUID | Filter by shared or personal stock space |
| \`location\` | String | Physical storage spot (e.g. "電視櫃", "客廳抽屜") |
| \`q\` | Keyword string | Full-text search matching name, specModel, or notes |
| \`sortBy\` | \`dueDate\` \\| \`backupStock\` \\| \`quantity\` \\| \`startDate\` \\| \`name\` \\| \`price\` | Sort key |
| \`sortOrder\` | \`asc\` \\| \`desc\` | Sort direction |

### Top-Level Summary Object
Every \`GET /api/v1/items\` response includes a 10-point global summary:
\`\`\`json
{
  "items": [...],
  "total": 12,
  "summary": {
    "total": 12,
    "overdue": 1,
    "dueToday": 0,
    "dueSoon": 2,
    "lowStock": 3,
    "outOfStock": 1,
    "inStock": 8,
    "quantityDepleted": 0,
    "needsRestock": 3,
    "stored": 2
  }
}
\`\`\`

---

## 4. API Endpoints Reference

- \`GET /api/v1/items\`: List items with comprehensive special search parameters.
- \`POST /api/v1/items\`: Create item (supports auto-fill via \`presetId\`).
- \`GET /api/v1/items/:id\`: Get single item detail with recent history logs.
- \`PATCH /api/v1/items/:id\`: Partial update item attributes.
- \`DELETE /api/v1/items/:id\`: Soft-delete item.
- \`POST /api/v1/items/:id/replace\`: Record replacement today (auto-decrements backup stock by 1).
- \`POST /api/v1/items/:id/restock\`: Purchase backup spares (\`{ delta: 2 }\` or explicit \`backupStock\`).
- \`POST /api/v1/items/:id/consume\`: Record daily consumption (\`{ amount: 2 }\`).
- \`GET /api/v1/presets\`: Search consumable template library (\`q=魚油\`, \`category=medicine\`).
- \`GET /api/v1/stocks\`: List available stock spaces.
- \`GET /api/v1/openapi.json\`: OpenAPI 3.1.0 specification.
- \`GET /skill.md\`: Complete Agent Skill specification.
`;

export const SKILL_MD = `---
name: afterbuy-assistant
description: 管理 afterBUY（補貨日記）個人生活耗材週期、到期日、備品庫存、範本庫與更換紀錄的 AI Agent Skill。支援範本搜尋、全維度特殊狀態搜尋（缺貨、現存備品、待採購清單、今天到期、自訂天數即將到期、容量耗盡、時間區間）、新增/修改/刪除、備品採購補貨、記錄更換（自動扣減備品）與記錄用量。
version: 1.2.0
---

# afterBUY 耗材與備品管理 Agent Skill

本規範供各類 AI Agent（ChatGPT GPT Actions、Claude Projects、Cursor、Open WebUI、Antigravity 等）整合 afterBUY（補貨日記）使用。

---

## ⚠️ 強制先驗對齊協定 (Pre-flight Alignment Protocol)

**重要指示（LLM Agents 必讀）**：
因 afterBUY（補貨日記）功能、耗材範本庫與特殊搜尋參數持續迭代擴充，任何 LLM Agent 在與使用者展開任何耗材管理會話、或執行任何搜尋/操作前，**強烈建議/必須先發起 GET 請求讀取最新規格進行能力對齊**：

- **主節點 Skill 規範（固定 URL）**：\`GET https://afterbuy.david888.com/skill.md\`
- **OpenAPI 3.1 規格（固定 URL）**：\`GET https://afterbuy.david888.com/api/v1/openapi.json\`
- **精簡系統摘要**：\`GET https://afterbuy.david888.com/llms.txt\`
- **完整架構文檔**：\`GET https://afterbuy.david888.com/llms-full.txt\`
- **備援鏡像節點**：\`https://afterbuy.create360.ai/skill.md\`

對齊後即可確保掌握最新支援之搜尋狀態（如 \`status=out_of_stock\`, \`in_stock\`, \`needs_restock\`, \`due_today\`, \`quantity_depleted\`）、自訂到期天數窗口（\`dueWithinDays\`）與安全備品扣減邏輯。

---

## 1. 認證、權限與端點

- **認證方式**：所有請求需在 HTTP Header 附帶 API Key：
  \`\`\`http
  Authorization: Bearer ab_live_<64-character-hex>
  Content-Type: application/json
  \`\`\`
- **Base URL**：
  - 生產環境：\`https://afterbuy.david888.com/api/v1\` 或 \`https://afterbuy.create360.ai/api/v1\`
  - 本地開發：\`http://localhost:5173/api/v1\`
- **時區規範**：所有日期格式為 \`YYYY-MM-DD\`（統一使用 \`Asia/Taipei\` 台灣業務日）。
- **API Key 權限範圍 (Scopes)**：
  - \`read_write\`：完整讀寫權限。
  - \`read_only\`：僅可調用 \`GET\` 查詢端點；任何寫入變更操作（POST/PATCH/DELETE）將直接回傳 \`403 Forbidden\`。
- **空間協同權限 (RBAC)**：
  - \`owner\` / \`admin\`：空間與耗材完整管理權。
  - \`member\`：可建立與編輯耗材，但**無法刪除其他成員建立的耗材**。
  - \`viewer\`：僅具唯讀檢視權限，不可執行新增、修改、刪除、更換、補貨或消耗。

---

## 2. 核心觀念與欄位說明（重要區分）

為了讓 AI 助理正確理解使用者的生活物品狀態，務必嚴格區分以下三組核心概念：

### 2.1 常用耗材範本庫 (\`presets\`)
- afterBUY 內建台灣家庭常見耗材預設庫（如好市多 150 顆魚油、Brita 濾芯、抽取式衛生紙、洗衣膠囊、日拋隱形眼鏡等）。
- **查詢範本**：調用 \`GET /api/v1/presets?q=魚油\`。
- **快速建檔**：建立物品時，若帶入 \`presetId: "costco-fish-oil"\`，系統會自動填入推薦的分類、週期/顆數、每日建議用量與規格價格，使用者無需手動輸入瑣碎參數。

### 2.2 備品庫存 (\`backupStock\`) vs 使用中容量 (\`quantity\`)
這是最關鍵的業務區隔：
1. **備品庫存 (\`backupStock\`)**：
   - 存放在儲藏櫃、抽屜中「**未開封全新備用件**」的數量（例如家裡還有 2 瓶未拆封的魚油、3 支全新牙刷）。
   - **採購補貨 (\`POST /api/v1/items/:id/restock\`)**：買了新備品時調用，增加 \`backupStock\`（如 \`{ delta: 2 }\`）。
   - **換新替換 (\`POST /api/v1/items/:id/replace\`)**：當舊的用完換新時調用，系統重設使用天數/容量，並自動扣減備品 \`backupStock -= 1\`。
   - **安全庫存警示 (\`minStockAlert\`)**：當 \`backupStock < minStockAlert\` 時，系統自動標記 \`needsRestock: true\`，提醒採購。
2. **使用中容量 (\`currentQuantity\` / \`initialQuantity\`)**：
   - 目前「**正在使用中**」那一瓶/那一包的容量剩餘量（例如這瓶魚油原本 \`initialQuantity: 150\` 顆，目前剩 \`currentQuantity: 110\` 顆）。
   - **消耗用量 (\`POST /api/v1/items/:id/consume\`)**：使用者每天吃了 2 顆魚油時調用，扣減目前這瓶的容量。
   - **容量耗盡 (\`quantity_depleted\`)**：當 \`currentQuantity === 0\` 時，代表當前這一瓶已用完，需換新（調用 replace）或補貨。

### 2.3 五種追蹤模式 (\`trackingMode\`)
- \`cycle\`（固定週期）：依固定天數更換（需附 \`cycleDays\`，例：電動牙刷 90 天、淨水器濾芯 30 天）。
- \`quantity\`（數量用量）：依包裝容量與每日消耗量倒數（需附 \`initialQuantity: 150\`, \`dailyUsage: 2\`, \`quantityUnit: "顆"\`，例：魚油、維他命、抽取式衛生紙、日拋隱眼）。
- \`pao\`（開封後保期）：開封後有效月數（需附 \`paoMonths\`，例：防曬乳 12 個月、眼藥水 1 個月、精華液 6 個月）。
- \`expiry\`（固定效期）：有效期限截止日（需附 \`expiryDate: "YYYY-MM-DD"\`，例：成藥、罐頭、常備食品）。
- \`warranty\`（保固倒數）：保固到期日（需附 \`warrantyDate: "YYYY-MM-DD"\`，例：冷氣保固 7 年、吸塵器保固 2 年）。

---

## 3. 全維度特殊搜尋與過濾參數表 (Special Search Matrix)

端點：\`GET /api/v1/items\`

afterBUY 為 AI Agent 提供了豐富精準的特殊搜尋參數，LLM 在處理使用者自然語言查詢時，應主動採用最貼切的篩選條件：

| 參數名稱 | 允許值 / 格式 | 說明與適用場景 |
| :--- | :--- | :--- |
| **\`status\`** | \`all\` | 返回所有進行中的耗材（預設） |
| | \`overdue\` | **已逾期**（\`remainingDays < 0\`）：查詢已經超過更換日期的物品 |
| | \`due_today\` | **今天到期**（\`remainingDays === 0\`）：精確查詢今天必須更換的物品 |
| | \`due_soon\` | **即將到期**：預設 7 天內到期，可搭配 \`dueWithinDays\` 自訂天數 |
| | \`low_stock\` | **缺備品**：備品庫存低於警戒值（\`backupStock < minStockAlert\`） |
| | \`out_of_stock\` | **缺貨 / 備品見底**：備品庫存歸零（\`backupStock === 0\`） |
| | \`in_stock\` | **現存備品充足**：抽屜有現成全新未拆備品（\`backupStock > 0\`） |
| | \`needs_restock\` | **待採購清單**：備品不足 (\`< minStockAlert\`) 或使用中容量已空 (\`=== 0\`) |
| | \`quantity_depleted\` | **使用中已耗盡**：正在開用的那一瓶/包已見底（\`currentQuantity === 0\`） |
| | \`normal\` | **正常**：備品充裕且未到期 |
| | \`stored\` | **先存放未拆封**：純在庫未啟用（\`isStored: true\`） |
| | \`snoozed\` | **暫停提醒中** |
| **\`stockStatus\`** | \`in_stock\` \\| \`out_of_stock\` \\| \`low_stock\` | **獨立備品庫存篩選**：可與任意 \`status\` 組合（例：查快到期且家裡有備品 \`?status=due_soon&stockStatus=in_stock\`） |
| **\`dueWithinDays\`** | 正整數（例：\`3\`, \`7\`, \`14\`, \`30\`） | **自訂到期天數窗口**：搭配 \`status=due_soon\`，例「這 3 天內要換什麼？」→ \`?status=due_soon&dueWithinDays=3\` |
| **\`isStored\`** | \`true\` \\| \`false\` | 篩選純在庫存放項目 vs 正在開用中的項目 |
| **\`trackingMode\`** | \`cycle\` \\| \`quantity\` \\| \`pao\` \\| \`expiry\` \\| \`warranty\` | 篩選特定追蹤模式 |
| **\`category\`** | \`bathroom\`, \`kitchen\`, \`medicine\`, \`skincare\`, \`appliances\`, \`clothing\`, \`electronics\`, \`general\` | 生活分類篩選 |
| **\`dueBefore\`** | \`YYYY-MM-DD\` | 到期日早於或等於指定日期（例：本月底前到期 \`dueBefore=2026-10-31\`） |
| **\`dueAfter\`** | \`YYYY-MM-DD\` | 到期日晚於或等於指定日期 |
| **\`startedBefore\`** | \`YYYY-MM-DD\` | 開始使用日早於或等於指定日期 |
| **\`startedAfter\`** | \`YYYY-MM-DD\` | 開始使用日晚於或等於指定日期 |
| **\`stockId\`** | UUID 字串 | 指定空間庫存（不傳則返回該使用者參與的所有空間） |
| **\`location\`** | 字串（模糊匹配） | 存放實體位置（例：「電視櫃」、「主臥衛浴」、「儲藏室第二層」） |
| **\`q\`** | 字串 | 全文關鍵字搜尋（匹配物品名稱、型號規格或備註） |
| **\`sortBy\`** | \`dueDate\` \\| \`backupStock\` \\| \`quantity\` \\| \`startDate\` \\| \`name\` \\| \`price\` | 排序欄位（預設 \`dueDate\`） |
| **\`sortOrder\`** | \`asc\` \\| \`desc\` | 升冪或降冪排序 |

### 回應指標概要 (\`summary\`)
每次調用 \`GET /api/v1/items\`，頂層皆會回傳包含 10 項全局指標的 \`summary\`，讓 Agent 單次請求即可洞察全局：
\`\`\`json
{
  "items": [...],
  "total": 15,
  "summary": {
    "total": 15,
    "overdue": 1,
    "dueToday": 0,
    "dueSoon": 3,
    "lowStock": 4,
    "outOfStock": 2,
    "inStock": 11,
    "quantityDepleted": 1,
    "needsRestock": 5,
    "stored": 2
  }
}
\`\`\`

---

## 4. 核心 API 端點操作

### 4.1 查詢耗材列表 (\`list_items\`)
- **HTTP**: \`GET /api/v1/items\`
- **說明**：支援第 3 節所有特殊搜尋參數。

### 4.2 查詢範本庫 (\`list_presets\`)
- **HTTP**: \`GET /api/v1/presets\`
- **Query 參數**：\`q\` (搜尋關鍵字，如「魚油」、「濾芯」、「衛生紙」)、\`category\`
- **說明**：獲取常用耗材範本，建立耗材時可將 \`preset.id\` 填入 \`POST /api/v1/items\` 的 \`presetId\`。

### 4.3 新增耗材項目 (\`create_item\`)
- **HTTP**: \`POST /api/v1/items\`
- **Body 欄位**：
  - \`presetId\` (string, 選填): 範本 ID（例如 \`"costco-fish-oil"\`、\`"brita-filter"\`），提供時自動帶入預設分類、用量與週期！
  - \`name\` (string, 若未提供 presetId 則必填): 耗材名稱
  - \`category\` (string, 選填): 分類代碼
  - \`trackingMode\` (string, 選填): \`cycle\` | \`quantity\` | \`pao\` | \`expiry\` | \`warranty\`
  - \`cycleDays\` (number, 選填): 循環天數
  - \`initialQuantity\` (number, 選填): 滿裝容量（例如 150）
  - \`dailyUsage\` (number, 選填): 每日估計用量（例如 2）
  - \`quantityUnit\` (string, 選填): 單位名稱（例如 "顆"、"錠"、"包"、"片"）
  - \`backupStock\` (number, 選填, 預設 0): 目前未開封全新備品庫存件數
  - \`minStockAlert\` (number, 選填, 預設 1): 安全備品警戒值
  - \`price\` (number, 選填): 單價
  - \`specModel\` (string, 選填): 型號/規格（例："150顆/瓶"）
  - \`stockId\` (string, 選填): 所屬空間 ID（預設為使用者的預設備品庫）

### 4.4 採購補充備品庫存 (\`restock_item\`)
- **HTTP**: \`POST /api/v1/items/:id/restock\`
- **Body 欄位**：
  - \`delta\` (number, 選填, 預設 1): 增加的備品件數（例如去好市多買了 2 罐，傳 \`{ delta: 2 }\`）
  - \`backupStock\` (number, 選填): 直接指定絕對備品數量
  - \`note\` (string, 選填): 補貨備註紀錄（例："好市多採購"）
- **說明**：增加抽屜裡的未開封備品庫存，並寫入歷史異動記錄。

### 4.5 記錄今天已換新（重設週期並自動扣減備品）(\`replace_item\`)
- **HTTP**: \`POST /api/v1/items/:id/replace\`
- **說明**：
  - 若 \`backupStock > 0\`，系統將自動扣減備品庫存 1 件（\`backupStock -= 1\`），重設使用開始日為今天，並將使用中容量重設為滿量。
  - 若 \`backupStock == 0\`，系統仍會重設週期，但會提示備品已耗盡，需盡快採購！

### 4.6 扣減使用中用量 (\`consume_item\`)
- **HTTP**: \`POST /api/v1/items/:id/consume\`
- **Body 欄位**：
  - \`amount\` (number, 選填, 相容 \`count\`, 預設為每日用量 dailyUsage 或 1): 扣減數量
- **說明**：扣減當前使用中的那一瓶/包容量（最低歸零，不為負數）。

### 4.7 更新耗材屬性 (\`update_item\`)
- **HTTP**: \`PATCH /api/v1/items/:id\`
- **說明**：部分更新耗材欄位。

### 4.8 刪除耗材 (\`delete_item\`)
- **HTTP**: \`DELETE /api/v1/items/:id\`
- **說明**：軟刪除該耗材（自動自行事曆取消並封存）。

### 4.9 查詢空間列表 (\`list_stocks\`)
- **HTTP**: \`GET /api/v1/stocks\`
- **說明**：查詢使用者參與的備品空間（例如「客廳」、「主臥浴室」、「辦公室」）。

---

## 5. 常見任務對話範例 (Examples)

### 範例 1：查詢待採購清單與缺貨清單
**使用者**：「我等一下要去好市多採購，幫我查有哪些東西備品已經沒了或快用完了？」  
**Agent 行為**：
1. 調用 \`GET /api/v1/items?status=needs_restock\`
2. 查看返回之缺貨與低備品項目。
3. 回報：「為您整理好市多採購清單：
   - ⚠️ **備品用罄（缺貨）**：Kirkland 抽取式衛生紙（抽屜備品 0 包）
   - ⚠️ **備品不足**：Brita 濾芯（抽屜剩 1 件，低於警戒值 2）
   - ⚠️ **容量用盡**：好市多魚油（當前開啟用中剩 0 顆，抽屜無備品）
   建議本次優先補齊這 3 項！」

### 範例 2：自訂短期到期查詢
**使用者**：「這 3 天內有什麼生活用品該換嗎？」  
**Agent 行為**：
1. 調用 \`GET /api/v1/items?status=due_soon&dueWithinDays=3\`
2. 回報：「這 3 天內有 1 項耗材到期：
   - 『電動牙刷刷頭』將在 2 天後到期（2026-10-09），目前家裡還有 2 支全新備品，屆時可直接更換！」

### 範例 3：查詢現存備品盤點
**使用者**：「我家裡抽屜還有哪些現成沒開過的備品？」  
**Agent 行為**：
1. 調用 \`GET /api/v1/items?status=in_stock&sortBy=backupStock&sortOrder=desc\`
2. 回報：「目前家中儲存的全新未開封備品清單如下：
   - Brita 濾芯：剩餘 4 件全新備品
   - 電動牙刷刷頭：剩餘 2 支全新備品
   - 洗衣膠囊：剩餘 1 盒全新備品」

### 範例 4：新增耗材（善用範本）
**使用者**：「幫我加一個好市多魚油，我買了 150 顆裝，家裡還有 2 瓶備用」  
**Agent 行為**：
1. 調用 \`GET /api/v1/presets?q=魚油\` 找到 \`id: "costco-fish-oil"\`
2. 調用 \`POST /api/v1/items\` 帶入：
   \`\`\`json
   {
     "presetId": "costco-fish-oil",
     "backupStock": 2
   }
   \`\`\`
3. 回報：「已為您建立『好市多 Kirkland 深海魚油膠囊 (150顆)』！每天 2 顆，可用約 75 天，備品庫存已登記 2 瓶。」

### 範例 5：大賣場採購補貨
**使用者**：「我剛剛買了 3 支牙刷備品放在抽屜了」  
**Agent 行為**：
1. 調用 \`GET /api/v1/items?q=牙刷\` 找到物品 ID
2. 調用 \`POST /api/v1/items/:id/restock\` 帶入 \`{ "delta": 3, "note": "賣場採購" }\`
3. 回報：「已為牙刷增加 3 支備品，目前備品庫存共有 4 支！」

### 範例 6：更換新耗材（自動扣減備品）
**使用者**：「我把舊的濾芯丟掉，換了新的濾芯上去了」  
**Agent 行為**：
1. 調用 \`GET /api/v1/items?q=濾芯\` 找到物品 ID
2. 調用 \`POST /api/v1/items/:id/replace\`
3. 回報：「已記錄今天更換新濾芯！週期已重新起算（下次更換日為 2026-11-06），備品庫存已自動扣減 1 件，目前抽屜備品剩 1 件。」
`;
