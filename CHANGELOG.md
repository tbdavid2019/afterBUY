# Changelog

本專案所有重要更新紀錄。依據 `AGENTS.md` 鐵律，記錄格式一律以**日期（YYYY-MM-DD）**排序，不使用版本號。

---

## 2026-10-10

### Added
- **多處現役獨立耗用時間追蹤與精準位置換新 (Multi-Unit Independent Tracking & Targeted Replacement)**：
  - 徹底解決多處同時開封使用（如主臥與客衛兩瓶洗髮精、客廳／主臥／餐桌／浴室四包衛生紙）無法獨立計算耗用時間與無法各別換新的問題。
  - **個別起算日與倒數計算**：支援每一處開封現役物品獨立記錄位置標籤（`label`）與開始耗用日期（`startDate`），各處獨立計算已使用天數、剩餘天數與健康狀態。
  - **首頁「現役多處耗用明細」卡片與定向換新**：物品卡片動態展示所有現役位置之耗用進度與倒數標籤，並提供獨立的「換新此處」按鈕。
  - **定向扣減與狀態連動**：點擊「換新此處」僅重設該位置的起算日為今日並扣減 1 件備品，其他位置起算日維持原樣不變；物品整體狀態則自動以最急處為基準同步。
  - **互動式多處位置編輯器**：`ItemModal` 新增「同時在用各處設置」編輯清單，支援動態增加／刪除位置、自訂空間名稱與日期；預設範本自動注入常用空間（如洗髮精帶入「主臥衛浴」、「客用浴室」；衛生紙帶入「客廳」、「主臥」、「餐桌」、「客衛」）。
  - **資料模型與雲端遷移**：`items` 表新增 `active_units_data` JSON 欄位（遷移檔 `0008_active_units_data.sql`），已順利套用至 `afterbuy.create360.ai` 與 `afterbuy.david888.com` 遠端 Cloudflare D1 資料庫。
- **原生支援同時現役在用數量 / 開封數（`activeUnits`，方案 C）**：
  - 完美解決家庭中多處同時拆封使用同一耗材的需求（例如：好市多 24 包一串抽取式衛生紙，客廳、房間、餐桌、浴室同時開封 4 包使用，備品櫃存放 19 包；全家 3 間浴室各自開封使用 1 罐洗髮精／沐浴乳／肥皂，備品櫃存放 2 罐）。
  - **資料模型與資料庫遷移**：`items` 表新增 `active_units` 欄位（預設 1，最小 1），並加入相應 Drizzle 遷移檔案（`0007_active_units.sql`）。
  - **API 與 Agent 協同**：
    - 後端 API（`POST /api/items`、`PUT /api/items/:id`、`POST /api/v1/items`、`PUT /api/v1/items/:id`）全面支援 `activeUnits` 參數讀取、寫入與校驗。
    - OpenAPI 3.1 規格同步擴充 `activeUnits` 屬性定義與範例，供 AI Agent 識別並管理家庭中多處開封的耗材。
  - **更換與備品扣減語意（Smart Replacement Semantics）**：
    - 點擊「今天已換」或「開新備品」時，精準替換 1 件耗盡的在用單位，扣減 1 件 `backupStock` 備品，同時維持全家 `activeUnits` 總在用數量不變，並更新最近一次換新日期與記錄詳細歷程。
  - **物品編輯與建立視窗雙欄控制項（Item Modal Dual Control & Total Pill）**：
    - 將原本單一備品輸入升級為「同時在用數量（開封現役）」與「未拆封備品庫存（櫃中儲備）」雙欄輸入控制項，並即時顯示「庫存彙總：X 件使用中 + Y 件備品 = 共 Z 件」資訊膠囊，介面一目了然。
  - **物品卡片與採購清單即時動態標籤（Adaptive Item Card & Shopping View）**：
    - 網格（Grid）與清單（List）卡片當 `activeUnits > 1` 時自動標示「X 件使用中」，操作按鈕智慧切換為「換新最急處」或「開新備品」。
    - 採購清單（Shopping View）清晰呈現「X 在用 · 備品: Y (門檻: Z · 共 N 件)」，複製清單與批次補貨同步納入在用數量。
  - **多處在用預設範本（Multi-Room Presets Expansion）**：
    - `tissue-paper`（抽取式衛生紙）：預設 `defaultActiveUnits: 4`，符合客廳、房間、餐桌等多處同時開封習慣。
    - `shampoo`（洗髮精 / 洗髮乳）：預設 `defaultActiveUnits: 2`，可依家中衛浴數自由增減。
    - `body-wash`（沐浴乳 / 沐浴露）：新增範本，預設 `defaultActiveUnits: 2`。
    - `soap-bar`（香皂 / 肥皂）：新增範本，預設 `defaultActiveUnits: 3`。
  - **回歸測試**：新增多處在用耗材（衛生紙、洗髮精）獨立起算日、個別倒數、定向換新與復原之自動化測試案例，全套件 82 項測試全數通過。
- Luna subagent 複查通過（無 P1／P2）；兩個正式站 afterbuy.create360.ai 與 afterbuy.david888.com 已部署，線上新版資源、Service Worker、未登入 API、手機試用提示與洗髮精範本驗證通過。
- 發布說明更新為試用資料帶入、手機手勢、輸入穩定性及洗沐／口腔範本，發布日期同步更新。
- 手機觸控手勢：物品右滑「今天已換」並沿用復原提示、左滑開啟操作選單；頁面空白區左右滑切換導覽；新增／編輯視窗標題區下滑關閉，未儲存內容先確認。原生上下捲動與雙指縮放保留，手勢取消、多指觸控與失去焦點會重設。
- 試用狀態與本機儲存說明改為所有主頁常駐顯示，手機標頭標示「試用 · 未登入」，提供登入／註冊與登入後帶入試用物品的明確入口。
- 衛浴洗沐標準範本新增「洗髮精 / 洗髮乳」，預設可調整的 60 天補貨週期與 1 件備品警戒門檻，前端與 Agent API 共用。
- 口腔清潔範本分為「電動牙刷刷頭」、「普通牙刷」及「舌苔刷」，各自可搜尋、套用並管理更換週期與備品；沿用原 `toothbrush-head` 識別碼並將模糊的「牙刷更換」名稱明確改為「電動牙刷刷頭」。

### Fixed
- **表單數字輸入框防呆鎖定與刪除修改修復 (Number Input Clearing & Typing Fix)**：
  - 修復在手機與桌面端編輯物品時，無法將「同時在用數量」欄位中的數字 1 刪除並改為 2 的問題。
  - 問題根源在於受控組件（Controlled Input）在使用者按退格鍵清空時會傳入空字串 `""`，原代碼 `parseInt(e.target.value) || 1` 的兜底邏輯會立即把 `""` 強制還原為 `1`，導致使用者無法刪除重打。
  - 全面優化 `ItemModal` 內的 `activeUnits`、`backupStock`、`cycleDays`、`paoMonths`、`minStockAlert` 狀態，允許輸入過程暫時為空字串，使用者可自由退格刪除並輸入新數值，並於失焦（`onBlur`）或提交時才安全校驗並補齊預設值。
- **Luna Codex Review 安全防禦與多單位換新完整性強化 (Codex Review & Robustness Enhancements)**：
  - **復原更換狀態保留 (Undo Multi-Unit Dates)**：修復換新後執行「復原」（Undo Replace）時未把 `activeUnitsData` 傳送給後端儲存的問題，確保復原後能完整還原各位置的原有起算日。
  - **多位置耗用總量保護 (Multi-Unit Quantity Protection)**：修復多位置耗用模式下若特定位置換新，誤將整品總量重設為單罐容量的問題，確保多處現役時妥善保留既有存量。
  - **記憶體與運算保護門檻 (Bounded Active Units)**：限制 API 建立或更新時之 `activeUnits` 上限（最大 30 處），防止極端異常數值引發無界陣列配置與 Worker 記憶體耗盡。
- 修正窄手機畫面的搜尋／操作工具列溢位，400px 以下將搜尋與操作分成兩列。
- 修正登入視窗缺少翻譯函式造成啟用 Passkey 提示崩潰、魚油示範分類與範本數量欄位型別。
- 修復試用物品帶入帳號時遺漏數量追蹤欄位；提供部分失敗的重試及本機儲存失敗的持續提示。後端依帳號與來源物品產生穩定識別碼，防止回應中斷、跨分頁或重新整理重試建立重複項目；不覆寫雲端修改或復活已刪除物品。
- 修復手機新增／編輯物品輸入中斷：表單每次開啟只初始化一次，備品庫資料更新不再清空內容；點擊背景不再關閉表單，中文輸入法組字期間的 Escape 不觸發關閉。
- PWA 更新改為使用者主動套用，取消背景更新強制重整；新增表單開啟期間暫緩更新提示與自動版本說明。
- 新增 12 項 PWA 更新、洗髮精範本、滑動辨識與真實 API 帶入重試回歸測試；完整 76 項測試於 UTC 與美國洛杉磯時區通過。手機 Chromium／WebKit、桌面與真實 Service Worker 跨分頁更新驗證通過。全專案型別檢查仍有 37 項既有 API 診斷，相對修改前無新增錯誤。
- **訪客模式刪除物品與補貨提醒持久化修復 (Guest Persistence & Restock Reminder Bug Fix)**：
  - 修復訪客體驗中刪除物品後，預設示範耗材（如備品不足需補貨的 `Brita 淨水器 MAXTRA+ 濾芯`）在重新整理網頁、分頁可見性切換（Visibility Change）或 60 秒定時檢查時會被強制重載，導致「提醒補充庫存」、「要補貨」標籤與導覽列採購袋紅色計數角標持續殘留的 Bug。
  - 升級 `guestStorage` 儲存機制，獨立記錄訪客已刪除的示範項目 ID (`afterbuy_guest_deleted_demos_v1`)、自訂修改內容 (`afterbuy_guest_modified_demos_v1`) 與清空旗標 (`afterbuy_guest_demos_cleared_v1`)，確保刪除後跨重新整理與跨工作階段永久生效。
  - 補齊 `demo-5`（Kirkland 魚油膠囊）納入 `DEMO_ITEM_IDS` 集合追蹤。
  - **儲存空間配額與遷移防護 (Storage Quota Resilience & Demo Edits Preservation)**：
    - `readGuestItems` 讀取時安全過濾並遷移歷史遺留的示範資料，寫入失敗時不遺失任何自訂筆記或照片。
    - `writeGuestItems` 於儲存配額緊縮時優先釋放空間重試，重試失敗時完整還原原始儲存內容，避免資料損毀。
    - 刪除示範項目時優先釋放既有儲存空間再寫入墓碑標記，確保在空間額滿時刪除操作仍能順利釋放容量。
    - 訪客自訂物品匯入登入帳號時，保留未完成遷移的示範項目資料。
- **採購清單與物品編輯視窗快捷操作補齊 (Shopping View & Modal Actions)**：
  - 採購與備品頁面（`ShoppingView`）在「急需採購補貨」與「全部物品備品概況」中為每項物品新增獨立「編輯」與「刪除」操作按鈕，使用者可在檢視補貨提醒時直接調整警戒門檻或刪除不再使用的物品。
  - 物品編輯彈窗（`ItemModal`）於編輯既有物品時新增「刪除物品」按鈕，解決使用者在編輯視窗中無法直接刪除物品的痛點。
  - 儀表板示範項目清除與恢復按鈕依據畫面上是否存在示範項目決定顯示，即使使用者已建立自訂物品也能隨時恢復範例資料。
- **樂觀刪除響應與跨工作階段防護 (Optimistic Deletion & Session-Guarded Rollback)**：
  - 實作前端刪除物品（單項刪除與批次刪除）之樂觀更新（Optimistic UI Update），點擊確認刪除時立即自狀態中剔除並更新儀表板與補貨計數角標。
  - 刪除失敗回滾時嚴格校驗使用者 Session 身份與空間 ID，防止刪除請求發送期間登出導致私有物品洩漏至訪客模式。
  - 後端 `GET /api/items` 與 `GET /api/v1/items` 端點全面加入 `Cache-Control: no-cache, no-store, must-revalidate` 標頭，防止瀏覽器快取造成刪除後依然取回快取資料。
  - 補齊批次刪除（`POST /api/items/batch-delete`）與 Agent API 刪除（`DELETE /api/v1/items/:id`）之 `calendarSequence` 遞增，確保日曆訂閱端即時同步軟刪除狀態。
- **回歸測試套件擴充 (Behavior Regressions Test Suite)**：
  - 新增並擴充 12 組涵蓋訪客持久化、多分頁防復活、儲存配額邊界、時區邊界與工作階段防護之回歸測試案例，全套件 64 項測試全數綠燈通過。

## 2026-10-07

### Added
- **AI Agent Skill 英文標準規範與 OpenAPI 3.1 規格（`public/skill.md`, `GET /api/v1/openapi.json`）**：
  - 遵循業界標準，將 `skill.md` 全面改寫為高品質標準英文（English Specification），徹底消除編碼歧義，大幅提升各類大語言模型（Claude 3.7 Sonnet、GPT-4o、DeepSeek、Gemini 2.5 等）之指令遵循精準度與 Token 解析效率。
  - 同時在規範內明訂在地化對話原則：API 與資料庫原生支援中英雙語及多語言物品名稱，Agent 針對繁體中文（`zh-TW`）家庭耗材進行自然流暢的對話。
  - **版本號全面改用日期與尾數（CalVer：`YYYY.MM.DD.patch`，如 `2026.10.07.1`）**：包括 `skill.md`、OpenAPI 3.1 規範（`/api/v1/openapi.json`）以及 `package.json`，全面淘汰傳統語意版本號，統一以發布日期搭配次數後綴進行追蹤。
  - 提供完整 OpenAPI 3.1.0 規範（`/api/v1/openapi.json`），支援 ChatGPT Custom GPTs 一鍵匯入 Action。
  - 同步更新 `/llms.txt` 與 `public/llms-full.txt` 納入 LLM Developer APIs 與外部 Agent 連動指南。
- **個人 API Key 管理機制（`api_keys` 表與 `/api/keys` 端點）**：
  - 產生 72 字元加鹽金鑰（`ab_live_<64hex>`），資料庫僅存放 SHA-256 單向雜湊，原始明文金鑰僅於建立當下顯示一次。
  - 支援空間範圍隔離（`stockId` Scope），外部 Agent 可限制僅能讀寫特定空間（如「辦公室」或「客廳」）。
  - 金鑰管理端點（`/api/keys`）嚴格限定瀏覽器 Session 操作，防止 API Key 權限自我提權與橫向越權。
- **全維度特殊搜尋與過濾引擎（`GET /api/v1/items`）**：
  - 支援針對自然語言對話情境的豐富特殊搜尋：
    - `status`: `out_of_stock`（缺貨/備品用罄）、`in_stock`（現存備品充足）、`needs_restock`（待採購清單：備品不足或當前容量為 0）、`due_today`（今天到期）、`due_soon`（即將到期）、`quantity_depleted`（使用中容量已空）、`normal`、`stored`、`snoozed` 等。
    - `stockStatus`: 獨立備品庫存篩選（`in_stock`, `out_of_stock`, `low_stock`），可與任意到期狀態複合查詢（如快到期且抽屜有備品）。
    - `dueWithinDays`: 自訂到期天數窗口（如 `dueWithinDays=3` 查詢 3 天內到期耗材）。
    - 時間區間：支援 `dueBefore`, `dueAfter`, `startedBefore`, `startedAfter`（以台灣業務日 `YYYY-MM-DD` 篩選）。
    - 排序與分頁：支援 `sortBy`（`dueDate`, `backupStock`, `quantity`, `startDate`, `name`, `price`）與 `sortOrder`（`asc`, `desc`）。
    - 全局指標概要：每筆回應頂層均包含 10 項指標之 `summary`（`total`, `overdue`, `dueToday`, `dueSoon`, `lowStock`, `outOfStock`, `inStock`, `quantityDepleted`, `needsRestock`, `stored`），Agent 單次請求即可洞察全局。
- **固定 Canonical URLs 與強制先驗對齊協定 (Pre-flight Alignment Protocol)**：
  - 固定存取規範：`https://afterbuy.david888.com/skill.md`（完整技能與搜尋矩陣）、`https://afterbuy.david888.com/llms.txt`（精簡速查）、`https://afterbuy.david888.com/llms-full.txt`（完整系統架構）與 `https://afterbuy.david888.com/api/v1/openapi.json`（OpenAPI 3.1 規範）。
  - 明確要求所有 LLM Agent 在每次會話啟動或操作前，必須先調用 `GET /skill.md` 或 `/openapi.json` 進行能力與搜尋參數對齊，徹底避免使用過期欄位。
- **安全性與權限強化（Codex 審查落實）**：
  - **API Key Scope 嚴格阻擋**：唯讀金鑰（`read_only`）在進行任何寫入操作（`POST`, `PATCH`, `DELETE`）時立即回傳 `403 Forbidden`。
  - **共享備品空間 RBAC 管控**：`viewer` 角色無法執行任何變更操作；`member` 角色無法刪除其他成員所建立之物品。
- **Agent 專屬語意化 REST API（`/api/v1/*`）**：
  - `GET /api/v1/items`：支援狀態篩選（`all`, `overdue`, `due_today`, `due_soon`, `low_stock`, `out_of_stock`, `in_stock`, `needs_restock`, `quantity_depleted`, `normal`）、關鍵字搜尋（`q`）、分類過濾，並嚴格校驗使用者所屬空間權限，防止 IDOR 跨空間洩漏。
  - `POST /api/v1/items`：建立耗材項目，自動帶入預設空間並依台灣業務日計算到期日。
  - `GET /api/v1/items/:id`：查詢單項詳情並附帶最近 10 筆歷史更換記錄。
  - `PATCH /api/v1/items/:id` & `DELETE /api/v1/items/:id`：部分更新與軟刪除。
  - `POST /api/v1/items/:id/replace`：一鍵記錄今日已換，備品庫存 > 0 時自動扣減 1；備品為 0 時仍正常刷新週期並回傳低庫存補貨警告。
  - `POST /api/v1/items/:id/consume`：消耗用量記錄，同時支援 `amount` 與 `count` 參數，數量歸零時自動鉗制不為負數。
  - `POST /api/v1/items/:id/restock`：採購補充備品庫存端點，支援傳入增量 `delta`（如 `{ delta: 2 }`）或指定絕對數量 `backupStock`，自動記入異動歷史並刷新庫存不足警示。
  - `GET /api/v1/presets`：公開常用耗材範本庫端點，支援以關鍵字搜尋或分類查詢 30+ 款台灣家庭常備耗材（如好市多 150 顆魚油、Brita 濾芯、衛生紙、日拋隱眼等）。`POST /api/v1/items` 原生支援 `presetId` 一鍵帶入推薦預設值。
  - `GET /api/v1/stocks`：安全列出使用者所屬備品空間，徹底過濾並隱藏 `calendarToken`，防止日曆金鑰洩漏。
- **核心業務概念徹底釐清與全平台同步（`skill.md`、`llms-full.txt`、`SettingsView`）**：
  - **備品庫存（`backupStock`）**：存放於儲藏櫃、抽屜之未拆封備用數量。更換時扣減 1；採購補貨時增加。
  - **使用中容量（`currentQuantity` / `initialQuantity`）**：當前開啟用中那罐/包的剩餘量。日常消耗時扣減；整罐用完換新時重設為滿量。
  - **五大追蹤模式（`trackingMode`）**：完整定義並支援 `cycle`（循環週期）、`quantity`（用量倒數，如魚油 150 顆/每日 2 顆）、`pao`（開封後保期）、`expiry`（有效期限）、`warranty`（家電保固）。
- **雙模式認證中介層（`authMiddleware`）與嚴格邊界防護**：
  - 支援 Cookie Session 與 `Authorization: Bearer ab_live_...` 雙軌驗證，具備 5 分鐘 Debounce 非阻塞更新 `lastUsedAt`。
  - 嚴格限制 API Key 僅能訪問 `/api/v1/*` 外部接口，禁止存取內部端點與金鑰管理。
- **設定頁「AI Agent 連動與 API Key」專屬面板（`SettingsView`）**：
  - 提供 API Key 建立、列表檢視（顯示前綴遮罩與上次使用日期）與廢止撤銷功能。
  - 具備一次性安全彈窗提示使用者複製保管原始金鑰。
  - 內建雙分頁 Prompt 產生器：
    - **ChatGPT GPT Actions**：一鍵複製 OpenAPI URL 與三步驟設定指引。
    - **Claude / Cursor / 外部 Agent**：一鍵複製完整 System Prompt，直接賦予各類 LLM Agent 完整的 afterBUY 耗材管理能力。
  - 提供 `/skill.md` 與 `/api/v1/openapi.json` 快速跳轉連結。
- **常用耗材範本庫（`PresetCatalogModal`）**：
  - 徹底解決原先橫向列表無法搜尋與分類之痛點，打造專屬範本瀏覽與搜尋彈窗。
  - **即時全文搜尋與分類切換**：支援即時搜尋物品名稱、備註說明與規格，提供衛浴、廚房、保健、保養、家電、穿戴、3C、生活等 8 大分類快速篩選。
  - **一鍵「直接加入」入庫**：支援單鍵直接將選定耗材新增至目前備品庫，亦可輕觸卡片帶入表單自訂週期、價格與備註。
  - **擴充 30+ 款台灣家庭常備生活耗材**：涵蓋好市多 150 顆魚油、抽取式衛生紙/面紙、垃圾袋、洗衣膠囊、洗碗精、淨水濾芯、冷氣濾網、除濕盒、機車機油等。
- **版本更新通知彈窗（`VersionNoticeModal` / What's New）**：
  - 參考優質 App「這版新增」底部卡片，智慧比對本機 `afterbuy_last_seen_date`，新功能上線時平滑彈出重點功能條列。
  - 支援「稍後再看」與「立即體驗」雙行動按鈕，並於設定頁提供隨時查看入口。
- **三維度通知架構徹底分離（耗材到期 vs 備品庫存 vs 用量提醒）**：
  - **資料庫與 API 全面支援**：`notification_settings` 資料庫與 `/api/notifications/settings` 支援獨立配置 `cycleExpiryAlert`、`stockLowAlert`、`usageLowAlert` 與 `expiryWarningDays`。
  - **獨立判定與獨立開關**：
    1. **到期更換提醒（`cycleExpiryAlert`）**：週期更換（牙刷、濾芯、冷氣濾網、PAO 開封期）與有效期限（藥品、食品、保固到期），依更換前天數與有效期限前天數精準提醒。
    2. **備品庫存提醒（`stockLowAlert`）**：物品備品低於安全庫存（`backupStock < minStockAlert`）時獨立警報，與更換日完全解耦，及時提醒採購補貨。
    3. **用量即將耗盡提醒（`usageLowAlert`）**：針對數量模式（魚油、衛生紙、洗衣膠囊、垃圾袋等）依每日耗用率計算，剩餘天數低於預警天數或數量用罄時獨立警報。
  - **多管道推播與 Email 摘要結構重組**：每日晨間 Email 與 Web Push 拆分為「📅 到期更換」、「📦 備品庫存不足」與「💧 用量快用完」三大獨立區塊，不再混為一談。
- **通知設定介面（`SettingsView`）像素級還原與手機 PWA 推播指引**：
  - **細緻化提醒卡片**：提供「到期提醒」、「備品庫存提醒」、「用量提醒」三大獨立卡片，支援點擊切換每日派發時間（如 `09:00`）與獨立 Toggle 開關。
  - **預設提醒天數**：提供更換前提醒天數（1 / 3 / 7 天）與有效期限提醒天數（3 / 7 / 14 / 30 天）切換。
  - **手機 PWA 系統推播指引**：清楚標記 iOS 16.4+ 透過 Safari「分享 → 加入主畫面」即可接收鎖定螢幕橫幅，搭配 Android 原生推播與 WebCal 日曆訂閱。

### Changed
- **好市多 Kirkland 深海魚油規格校正**：
  - 將範本庫與展示資料中之魚油初始顆數校正為好市多標準 **150 顆/瓶**（每日 2 顆，約 75 天份），修正原先 60 顆之數值。
- **新增物品彈窗（`ItemModal`）原生支援全文搜尋與分類切換**：
  - **頂部雙模式切換**：新增物品時可直接切換 `[ 🔍 常用耗材範本庫 ]`（完整卡片式清單、搜尋列、分類、一鍵直接加入）與 `[ ✍️ 自訂填寫表單 ]`。
  - **表單內即時搜尋**：在表單模式的「常用耗材範本」區塊亦內建搜尋框與 9 大分類晶片，輸入關鍵字即時過濾範本標籤，不再需要橫向滾動肉眼苦尋。
- **首頁與設定頁入口整合**：
  - 看板首頁（`DashboardView`）工具列與空狀態新增範本庫快捷按鈕。
  - 設定頁（`SettingsView`）新增「這版新增」與「常用範本庫」入口。

### Fixed
- **修正 `skill.md` 與 `llms.txt` 在瀏覽器中渲染為中文亂碼問題（Mojibake Fix）**：
  - 由於 Cloudflare Workers 靜態資源預設 `Content-Type: text/markdown` 未宣告 `charset=utf-8`，導致 Chrome 在繁體中文環境下誤判編碼為 Big5，造成文字變成問號與亂碼（如 `蝟∠ afterBUY`）。
  - 新增 `public/_headers` 規則，強制為所有 `*.md` 與 `*.txt` 附加 `Content-Type: text/markdown; charset=utf-8` 與 `Cache-Control: public, max-age=0, must-revalidate`，確保直接在瀏覽器開啟或 LLM 抓取時 100% 正確解析 UTF-8 中文。
- **經由 Codex 深度 Code Review 發現並修復之 4 項核心安全與相容性問題**：
  1. **[P1] 嚴格限制 API Key 存取邊界**：禁止 API Key 呼叫非 `/api/v1/*` 內部路由，避免金鑰權限外溢至金鑰管理與 Session 專屬端點。
  2. **[P1] 消除 `GET /api/v1/items` 跨空間越權存取（IDOR）**：補齊 `requestedStockId` 與使用者空間成員資格（`accessibleStockIds`）之嚴格校驗，防止外部調用者透過特定 stockId 探測其他使用者之耗材。
  3. **[P2] 修正金鑰列表屬性命名差異**：修復後端回傳 `{ apiKeys }` 與前端期待之 `{ keys }` 不一致問題，使前端設定頁能即時展示已建立金鑰列表。
  4. **[P2] 統一消耗端點參數命名**：`POST /api/v1/items/:id/consume` 同時相容 `amount` 與 `count` 參數，與公開之 Agent Skill.md 規格完全吻合。
- **修復新增物品彈窗點擊 X 無法關閉之嚴重阻礙（`ItemModal` Trapped Issue）**：
  - 補齊 `ItemModal.tsx` 遺漏之 `if (!isOpen) return null;` 判斷式，徹底解決因元件常駐 DOM 導致點擊右上角 `X` 關閉按鈕無效、遮罩阻擋無法進入看板主畫面之嚴重問題。
  - 同步支援外層半透明遮罩點擊關閉與鍵盤 `Escape` 鍵退出。
- **修復範本庫深海魚油破圖問題與全域圖片錯誤優雅降級（Image Error Fallback）**：
  - 修正 `ITEM_PRESETS` 魚油範本誤指不存在檔案 `/images/items/fish-oil.png` 之問題，回歸保健食品專屬琥珀漸層膠囊（Pill）視覺標籤。
  - `ItemBrandBadge` 與 `ItemModal` 預覽縮圖全面補齊 `onError` 容錯狀態管理與重置機制，網路失效或 URL 錯誤時自動優雅降級為品牌/分類圖示，不再出現瀏覽器破圖圖標；輸入新 URL 時狀態即時重置恢復正常預覽。
- **消除「常用耗材範本庫」與「自訂填寫表單」職責重疊與混淆（UI/UX 釐清）**：
  - 徹底移除自訂表單模式（Tab 2）內重複出現的範本搜尋框與分類晶片，明確劃分兩者心智模型：
    - **Tab 1（常用耗材範本庫）**：專注於瀏覽 28+ 款生活耗材、全文搜尋與一鍵「直接加入」。
    - **Tab 2（自訂填寫表單）**：專注於空白物品規格填寫，若自範本帶入則以醒目標籤顯示「已帶入生活範本：{名稱}」，並提供快速切換回範本庫按鈕。
  - 統一「新增物品」與「常用範本庫」之彈窗開啟邏輯，避免多重彈窗重疊或心智混淆。
- **未來啟用日天數計算修復（徹底消除「已用 -3 天」負數 Bug）**：
  - 修復當物品 `startDate` 在未來時（如今天 10/7，預計 10/10 啟用），卡片與看板顯示負數已用天數之問題。
  - 生命週期核心新增 `daysUntilStart` 屬性，當尚未到達啟用日，已用天數固定為 `0`，看板與卡片清楚標記「距啟用 N 天 / 預計 MM/DD 開始啟用」，容量維持 100% 未拆封狀態。
- **數量消耗品「全自動時間推移」架構修復與心智模型校正**：
  - 徹底解決原先「若人類沒每天手動點今日已用，剩餘顆數就不會自動隨天數消耗」之嚴重架構缺陷。現在耗材會**自動依日曆天數與每日耗用率推進消耗**，就算使用者一個月不打開 App，天數到了也會準確提醒，人類「完全不需要每天手動打卡」！
  - 重構卡片主要按鈕層級：將 `[ 🔄 開新瓶 ]` 回歸為主要大按鈕（與牙刷更換邏輯完全一致），手動微調扣減按鈕轉為次要輔助，並清楚標記「每日自動倒數，免手動打卡」，徹底消除每日打卡的心理負擔。

---

## 2026-10-06

### Added
- **視覺與工藝升級：月曆與清單物品圖「放大＋全圓形遮罩（Circular Avatar）」視覺強化**：
  - 徹底告別物品圖「太害羞、過小、上下留白縮小」之視覺感受：
  - **全圓形遮罩與滿版縮放（`object-cover rounded-full`）**：物品照片自 `object-contain` 升級為標準圓形剪裁與滿版覆蓋，徹底消除商品圖左右空隙與瘦長縮圖變小之問題。
  - **日曆方陣尺吋顯著放大（`size="calendar"`）**：手機端自 28px 放大至 36px（`w-9 h-9`），桌面平板端放大至 44px（`sm:w-11 sm:h-11`），外圈搭配 `ring-2 ring-white/90 dark:ring-white/15 shadow-xs`，在 Squircle 日曆磚中自信突顯。
  - **日曆狀態圓點與多項目膠囊重定位**：將急迫度提示燈與靛藍購買點緊密貼齊圓形遮罩右上緣（`-top-0.5 -right-0.5 z-10`），同日多項目膠囊貼齊右下緣（`-bottom-1 -right-1 z-10`），形成完美層疊律動。
  - **當日詳情檢查面板（Inspector）與時程清單（List View）全面升級**：卡片左側縮圖同步放大至 44px 圓形遮罩（`size="lg" shape="circle"`），整體介面協調一致，質感躍升。
- **Timeline 行事曆全面整合「購買 / 啟用日（`startDate`）」與「預計更換日（`nextDueDate`）」雙重時程里程碑**：
  - 徹底解決使用者新增耗材後，因更換日在數月之後導致當前月份行事曆空無一物之困擾。
  - **行事曆事件模型升級**：將單一更換日排程進化為雙重生活里程碑——`🛍️ 購買 / 啟用更換`（含存放備品購入、開封 PAO、保固起算）與 `🔄 預計到期 / 更換`。
  - **日曆方格（Squircle Bento Tiles）**：當日若有購買啟用項目，直接顯示彩色物品/品牌縮圖，並於右上角懸掛專屬紫色/靛藍徽章點（`bg-indigo-500`），同日多項目顯示 `+N` 膠囊標記。
  - **三態快速篩選晶片（Filter Chips）**：頂部即時切換 `[ 全部事件 (N) ]`、`[ 🔄 待更換 (N) ]`、`[ 🛍️ 購買啟用 (N) ]`，預設呈現完整生活軌跡。
  - **當月數據摘要升級**：同步彙整「本月待更換」、「本月購買 / 啟用」件數，並在有輸入金額時自動統計「本月已購支出」與「預估更換支出」。
  - **當日詳情檢查面板（Inspector）**：點擊日期即清晰條列該日之購買啟用紀錄（購買金額、更換週期、預計下次更換日、編輯快捷按鈕）與待換排程（今天已換打卡按鈕）。
  - **時程清單（List View）同步升級**：按篩選晶片即時呈現按時間排序的購買啟用日記與更換時程軸。
- **Timeline 時程升級「月曆矩陣（Calendar View）與時程清單（List View）」雙視圖**：
  - 參考訂閱管理月曆視覺，提供 `[月曆視圖 (Calendar)]` / `[時程清單 (List)]` 雙視圖切換。
  - 支援按月份切換（‹ / ›）、一鍵回今天、當月待處理耗材件數與預估支出費用摘要（NT$）、4 色健康度狀態圖例。
  - 7 欄 Squircle 月曆方陣：日期上直接顯示到期耗材之專屬縮圖或分類圖示，同日多耗材支援 `+N` 膠囊標記，今天與選中日高亮顯示。
  - 當日耗材詳情與快捷操作面板：輕觸日期即在下方展開該日排程耗材清單，支援一鍵「今天已換」與「編輯」操作。
- **Dashboard 物品看板升級「雙視圖切換（2 欄 Grid 網格看板 vs 1 欄 List 管理清單）」與「Hero Metric 大數據字級」**：
  - 工具列新增網格/清單切換按鈕，使用者偏好自動持久化於 `localStorage`。
  - **2 欄 Grid 網格看板**：深度還原現代 iOS 卡片質感，直覺呈現 **「已用 373 天」**、**「剩餘 3 天」**、**「現存 60 顆」**、**「未拆封」** 之 24px+ Tabular Bold 大數據衝擊力，搭配物品縮圖、頻率標籤、細長進度條與底部快速換新按鈕。
  - **1 欄 List 管理清單**：保留完整高密度一鍵打卡與備品庫存調整步進器，同步強化天數對比與視覺階層。
- **底部導覽（Navbar）升級為 Apple 原生風格「懸浮膠囊導覽島（Floating Capsule Dock）」**：
  - 告別傳統滿版貼底硬邊，升級為雙側內縮、懸浮居中的毛玻璃膠囊島（`backdrop-blur-xl bg-white/92 dark:bg-slate-900/92 rounded-2xl`），搭配立體微陰影，並完美相容 iOS Home Bar 安全邊距（`pb-safe`）。
- **繁體中文排版與字階尺度全面重構（`/impeccable typeset`）**：
  - 徹底克服英文微型字體（10–11px）直接套用於高筆畫繁體漢字時之辨識障礙，建立繁中專屬排版尺度與視覺重心理論：
  - **嚴格執行字級下限與視覺工藝**：微型徽章最低 `text-xs` (12–13px) `font-bold`，輔助說明/標籤全面 `text-sm` (14px)，內文輸入 `text-base` (16px)，標題按鈕 `text-base ~ text-lg` (16–18px)，核心數字突破至 `text-2xl ~ text-4xl` (24–36px) `font-black tabular-nums`。
  - **月曆矩陣（TimelineView）**：星期欄位（週一 ~ 週日）升級為 14–16px `font-bold`、天數數字升級為 `text-sm sm:text-base font-black`、月度支出與件數指標升級為 24–30px `font-black`，當日排程詳情文字全面放大至 14–17px。
  - **懸浮膠囊導覽（Navbar）**：繁中標籤自 `text-[11px]` 擴充為 `text-xs sm:text-[13px] font-bold`，膠囊高度擴展至 `min-h-[4.25rem]`。
  - **看板卡片與避讓（DashboardView & ItemCard）**：篩選晶片文字升級為 14–16px，底部容器內距加寬為 `pb-36 sm:pb-40`，手機浮動按鈕與批次操作列提升至 `bottom-24`，徹底排除與底部懸浮島重疊遮擋問題。
- **全面升級智慧彩色物品/品牌徽章系統（`ItemBrandBadge`）與日曆磚陣（Squircle Bento Tiles）**：
  - 深度還原 iOS 原生 Widget 與頂級訂閱日曆視覺，告別無照片耗材灰暗平庸的灰底符號：
  - **智慧品牌與生活耗材彩色徽章引擎**：
    - 數位訂閱服務：原生內建 Netflix（紅底 N）、Spotify（黑綠波浪）、ChatGPT（墨綠幾何花紋）、Apple TV / Apple（黑白蘋果標誌）等專屬識別標誌。
    - 實體耗材專屬彩色漸層：牙刷刷頭（冰川青）、淨水濾芯（深湛藍）、隱形眼鏡（水漾藍綠）、魚油維他命（夕陽金橙）、洗衣膠囊（薰衣草紫）、衛生紙（柔暖杏）、刮鬍刀（曜石黑金屬）、冷氣清淨機濾網（天藍微風）、汽車機油（賽道紅）等。
  - **日曆月陣方格全面 Squircle Bento 磚塊化**：
    - 每一日皆為實心質感的圓角磚塊（暗色模式 `#1E1E22`），即使無耗材之日期亦呈現完整規律矩陣。
    - 到期日中央置放 28px 彩色專屬品牌徽章，右上角懸掛狀態發光燈（🔴 過期 / 🟡 即將到期 / 🟢 週期正常 / 🔵 保固），同日多項目顯示 `+N` 膠囊。
    - 日期數字統一沉澱於磚塊底部正中，星期列採用獨立圓角膠囊，今日星期以反差高亮深色膠囊突顯。
- **實裝「方案 B：頁面級雙欄網格（Two-Column Card Matrix）」RWD 佈局**：
  - 徹底解決寬螢幕/桌面端單欄卡片過度拉伸、左右機能斷層、中央空曠之痛點：
  - **清單模式（List View）自適應雙欄**：手機直立保持單欄（`grid-cols-1`），平板與桌面端（`md:` 以上）自動並排為雙欄網格（`md:grid-cols-2 gap-4`），使單張卡片保持 380px~460px 的黃金舒適長寬比，左右機能與步進器自然貼合。
  - **網格模式（Grid View）多欄自適應**：手機 2 欄，平板與桌面拓展為 3 至 4 欄（`sm:grid-cols-3 lg:grid-cols-4`）。
  - **採購清單（ShoppingView）同步雙欄化**：待補貨耗材卡片在寬螢幕自動雙欄並排，空間利用率提升 100%。
  - **全站主要容器寬度擴展**：頂部 Header 與主內容區寬度自單一 `max-w-3xl` 平滑升級為 `max-w-3xl md:max-w-4xl lg:max-w-5xl`，給予雙欄足夠且優雅的留白與呼吸感。
- **建立 GitHub Pages 官方靜態 Landing Page 官網（`docs/`）**：
  - 參考 `https://expiresby.app/` 現代 Apple / iOS 頂級質感，具備極簡、毛玻璃、精緻陰影與圓角、流暢響應式 RWD 與深淺模式自動適配。
  - **Sticky Header**：Logo（afterBUY / 補貨日記）、深淺模式切換（☀️/🌙）、繁中/英文切換（🇹🇼/🇬🇧）、錨點導覽與「立即體驗」CTA。
  - **Hero 區塊**：Value Proposition 標題、動態平滑切換關鍵字（`js-rotating-word`：牙刷刷頭、淨水濾芯、隱形眼鏡、深海魚油等）、直接啟動 Web App 與 GitHub 開源 CTA、生活狀態膠囊（良好/即將到期/今日到期/備品告急）。
  - **精緻 iPhone 16 Pro 互動 Mockup**：配備鈦金屬外框、Dynamic Island 動態島與 iOS 狀態列，支援「📱 互動展示」與「📸 真機截圖」雙模式切換。互動模式支援點擊「今天已換」即時觸發真實 5 秒觸感復原條（Undo Toast）與備品庫存自動扣減，支援點擊「復原」回滾，以及魚油膠囊每日扣減。
  - **6 大核心特色 Grid**：耗材週期與開封保存期（PAO）、一鍵更換與自動扣備品（含 5 秒復原）、WebCal 日曆無縫訂閱（零殘留墓碑機制）、Passkey 生物辨識秒登、多管道貼心通知提醒、PWA 離線優先與隱私至上。
  - **視覺計時進度展示條（A color for every countdown）**：綠色良好（>7天）、琥珀即將到期（≤7天）、珊瑚紅今日到期/逾期、湛藍備品庫存告急 4 階直覺色彩展示。
  - **3 步驟運作解說（How It Works）**：01 拍照或範本建檔 -> 02 智慧追蹤與生活看板 -> 03 準時提醒並一鍵更換。
  - **互動式常見問題 Accordion（FAQ）**：完整解答免費使用、PWA 加入主畫面、WebCal 無殘留日曆訂閱、Passkey 換機換裝置、多人協作空間、Snooze 延後提醒等。
  - **隱私至上承諾與底部強效呼召 CTA + Footer**：以 AGPL-3.0 開源協議為基底，提供開源原始碼連結與版權宣告。
  - **自包含靜態資源**：所有樣式、腳本與圖片皆集中於 `docs/assets/`，零構建依賴，可直接配置為 GitHub Pages 部署來源。

### Changed
- 品牌中文名稱改為「補貨日記」，英文名稱保留 **After Buy**；同步更新首頁、登入提示、PWA 安裝名稱、網頁中繼資料、Web Push、Email 與 WebCal 日曆顯示名稱。
- Logo 採橘底、按手機圖示比例放大的中文品牌字樣與使用者提供的 SVG Repo 衛生紙圖案，完整識別採「圖案在上、補貨日記在下」，小尺寸導覽標誌使用純圖案；同步更新 SVG、PWA PNG、Apple Touch Icon、favicon 與分享預覽圖。
- 手機標頭收斂訪客標籤與超窄螢幕的新增按鈕文字，保留完整品牌名稱；品牌橘底調整為 `#EA601A`，提高白字對比。

### Fixed
- **修正物品新增表單（ItemModal）「數量耗用」按鈕字元渲染與破圖疑慮**：
  - 移除原按鈕文字中易在不同作業系統或字型被渲染成黑白邊框方塊、常被誤認為破圖缺字的 `🆕` Emoji，改為純粹簡約的「數量耗用」，並防止按鈕因字數過長折行，維持追蹤模式五大按鈕排版的一致與整齊。

### Docs
- README 更新品牌名稱、Logo 預覽與環境變數範例；LLM 文件同步品牌名稱。
- README 新增 GitHub Pages 靜態 Landing Page 官網與 `docs/` 目錄說明。

## 2026-10-05

### Added
- **支援「數量耗用率追蹤模式」（Quantity & Burn Rate Tracking）全端整合**：
  - 徹底解決垃圾袋、保健食品（魚油、維他命 C）、抽取式衛生紙、洗衣膠囊、隱形眼鏡等「具備固定數量且每日按比率耗用」之生活耗材過去無法貼切追蹤的痛點。
  - **資料模型擴充（Data Model & Migrations）**：
    - 資料庫 `items` 新增 `initial_quantity`（單盒/單包/單瓶總容量）、`current_quantity`（目前開瓶現存剩餘）、`daily_usage`（每日平均耗用率，支援浮點數如每 2 天 1 個包裝 `0.5/天`）、`quantity_unit`（顆/錠/包/個/片/入/抽/次/捲）。
    - 建立並套用 D1 遷移指令碼 `0004_quantity_tracking.sql`，並於 Cloudflare D1 遠端資料庫正式套用。
  - **生命週期計算引擎（Lifecycle Engine）**：
    - 自動依據總容量與每日耗用率計算出預計可用天數（`Math.ceil(initialQuantity / dailyUsage)`）及預計用盡日。
    - 支援依開瓶日起算自動天數扣減，亦支援即時手動扣減與覆寫當前開瓶剩餘數。
    - 耗盡（`remainingQuantity <= 0`）時自動標記為 `overdue`（已用盡）並觸發補貨警示；<= 7 天時標記為 `due_soon`（即將用盡）。
    - 狀態標籤自動帶入 `約剩 X 單位 · 剩餘 Y 天`。
  - **物品新增彈窗（ItemModal）五大追蹤模式全面升級**：
    - 追蹤模式新增第 5 項標籤「數量耗用 🆕」，表單動態切換為單瓶總容量、每日平均耗用率、常用單位快選晶片（顆/錠/包/個/片/入/抽/次/捲）與自訂輸入，以及即時容量試算預覽（`💡 單盒 X 顆 ÷ 每天 Y 顆 = 約可使用 Z 天`）。
    - 釐清備品庫存定義為「未拆封備品庫存（瓶/包/盒）」，開新備品時自動扣除 1 箱/瓶庫存並重新填滿容量。
  - **物品卡片（ItemCard）專屬日常動作與開新備品按鈕**：
    - 卡片中繼資訊直接顯示「每日 X 顆 · 單瓶 Y 顆」。
    - 卡片右下角提供「`今日已用 (-X 顆)`」快捷按鈕，輕觸即自動扣減當日用量；同時提供「`開新瓶`」按鈕，快速開瓶並自動扣減 1 個未拆封備品庫存。當數量耗盡時主按鈕自動變為「`開啟新備品`」。
  - **常用耗材範本庫擴充（Item Presets）**：
    - 新增 6 款高品質真實耗材範本：`Kirkland 頂級深海魚油膠囊`、`DHC 維他命 C 膠囊`、`楓康環保清潔垃圾袋`、`Ariel 抗菌洗衣膠囊`、`舒潔抽取式衛生紙`、`嬌生安視優日拋隱形眼鏡`，點擊秒速帶入。
  - **API 與端點**：
    - 新增 `POST /api/items/:id/consume` 端點支援快速原子扣減用量，`POST /api/items/:id/replace` 自動將開瓶數量重設回初始滿額容量。
    - 訪客模式（Guest Mode）完整支援本地持久化計算與扣減，並新增魚油膠囊 Demo 物品。
- **備品庫切換（StockSwitcher）升級為頂部導覽列主標題（Primary Workspace Title）**：
  - 徹底解決原先「全部備品」以微縮副標題形式被塞在「888 該換囉」下方的尷尬視覺斷層；將當前備品空間（如「🏠 甜蜜的家 ▾」或「📦 全部備品 ▾」）升級為頂部導覽主要脈絡標題（支援 `variant="title"`），比照 Notion 與 Apple Reminders 工作區切換體驗。
  - 精簡頂部 Header 雜訊：移除與設定頁重複的 `[ EN ]` 語言按鈕，保留品牌標誌、空間切換與核心動作，釋放手機橫向呼吸空間。
- **生活狀態一目了然看板（Life Status Hero Overview）與大膽視覺提煉（/impeccable bolder）**：
  - 導入情感化生活看板，取代過去生硬平淡的「耗材總覽」文字：
    - 當有耗材過期或即將到期時：展示高對比琥珀提示與待處理數量（`⚠️ X 項耗材即將到期或需處理`）。
    - 當耗材運作正常時：展示撫慰心靈的星芒總覽（`✨ 生活耗材狀態一切就緒 · X 項定期運作中 · Y 項備品存放中`）。
- **手機拇指操控區懸浮新增按鈕（Floating Action Button, FAB）**：
  - 在手機端右下角（`bottom-20 right-4`）配置一鍵觸控新增耗材 FAB，符合單手大拇指人體工學，無需費力點擊螢幕頂部；進入多選批次模式時具備智慧感知並自動讓位隱藏。
- **「今天已換」5 秒樂觀復原防護機制 (Reversible Replace & Undo Toast)**：
  - 在手機單手滑動與操作情境下，若誤觸「今天已換」，立即於畫面底部安全區域（`bottom-20 sm:bottom-6`）彈出 5 秒觸感復原條（Undo Toast），提供可逆回滾防護。
  - 採用樂觀更新（Optimistic UI），點擊「今天已換」即時更新畫面，同時保存上一狀態快照 `{ startDate, backupStock, snoozeUntil }`。
  - 後端新增 `POST /items/:id/undo-replace` API 端點，支援完整原子回滾 `startDate`、`backupStock`、`snoozeUntil` 並自動清理關聯的最近歷史更換紀錄；訪客模式亦同步支援本地快照復原。
  - 復原條底層配備 5 秒進度倒數條（`.animate-undo-shrink`）、明確品名提示與即時關閉按鈕，並符合 ARIA 無障礙標準（`role="status"`、`aria-live="polite"`）。

### Changed
- **首頁層級大重構（/impeccable layout）：消除 5 層垂直控制項堆疊疲憊**：
  - 重新梳理讀取順序與節奏：將原本沉重的黑底分段篩選列重構為柔和高質感的 Squircle 膠囊軌道（`rounded-xl`），包含狀態指示燈與 `tabular-nums` 計數。
  - 搜尋列整合一鍵清除按鈕，將相機拍照建檔與批次多選整理為緊湊高對比之觸控圖標按鈕，避免小螢幕橫向換行斷裂。
- **耗材卡片（ItemCard）觸感工藝與視覺層級全方位升級**：
  - 全面採用平滑 Squircle 圓角（`rounded-2xl`）與細緻光感陰影，告別死板硬朗的倉庫出入庫表格感。
  - 備品庫存步進器改為圓角平滑微曲面，觸控區域擴大至人體工學標準並加入 `touch-manipulation`。
  - 週期剩餘比例進度條改為膠囊平滑軌道（`h-2 rounded-full`），依據到期狀態提供精確的語意色彩。
- **耗材新增/編輯彈窗之「漸進式揭露」認知負擔精簡 (Progressive Disclosure in ItemModal)**：
  - 依據 Impeccable `/distill` 準則重構 `ItemModal.tsx`，徹底解決首屏同時展示 14+ 欄位造成的表單認知疲勞。
  - 首屏聚焦核心決策：物品名稱、所屬備品庫、常用範本、分類選擇、追蹤模式（更換週期/PAO/到期日/保固），以及現有備品數量。
  - 將次要選填欄位（照片上傳/相機拍照、購買價格、規格型號、補貨警示門檻、存放位置與 8 大快速地點標籤、先存放囤貨開關、備註說明）收攏於「`更多詳細資料 (選填)`」摺疊抽屜中。
  - 配備智慧狀態感知：若編輯之舊物品已有填寫進階資訊，自動展開抽屜；若為新增物品則預設收合並顯示「已填 X 項」徽章，大幅提升日常記錄流暢度。

### Fixed
- **依據 Codex Code Review 結論修正數量模式之預估到期日與用盡狀態**：
  - **預設保留自動消耗計算（Preserve Automatic Depletion）**：修正 `POST /api/items` 新建物品時當未填寫剩餘數時 fallback 至滿額數值的問題，保留 `currentQuantity: null`，確保開瓶後隨天數自動扣減之機制如期運作。
  - **動態從當前剩餘數換算下次處理日期（Derive Due Date from Current Quantity）**：修正 `computeItemStatus` 在使用者手動記錄消耗或改變現存剩餘時，`nextDueDate` 仍停留於原始包裝天數的 bug，全面以 `addBusinessDays(refDateStr, remainingDays)` 同步更新預計用盡日。
  - **小數耗用率平滑衰減（Fractional Burn Rate Precision）**：保留小數耗用精度至兩位小數（例如每 5 天 1 包，0.2包/天），杜絕整數 `Math.round` 導致的衰減停滯。
  - **數量為 0 時明確標註為「已用盡」**：修正 `remainingQuantity <= 0` 在 `remainingDays === 0` 分支被顯示為「今日預計用盡」的歧義，直接明確顯示「`已用盡（需開新備品）`」。
- **消除 Impeccable 靜態檢測之 `gray-on-color` 警示**：
  - 將 `Navbar.tsx` 採購補貨紅點標籤及 `StockSettingsModal.tsx` 擁有權轉移確認按鈕的 `text-slate-950 on bg-amber-500` 冷灰色文字調校為溫暖高對比深琥珀墨色 `text-amber-950`（`#451a03`），消除視覺雜色並使 `impeccable detect` 檢查維持 0 違規。

---

## 2026-09-22

### Changed
- **全面遵循 Apple iOS Human Interface Guidelines (HIG) 字級與易讀性規範重構**：
  - **解決首頁字體過小與視覺侷促問題**：
    - 依據 iOS HIG 官方字級階層標準，系統最低極限尺寸為 11pt（Caption 2，僅供極微次要註記），標準內文/操作按鈕為 17pt (Body) 與 15~16pt (Callout/Subheadline)，輔助資訊與中繼資料為 13~14pt (Footnote)。
    - 徹底修正首頁 `ItemCard` 與 `DashboardView` 中過度縮小的 `text-xs` (12px / 9pt)。
    - 卡片標題升級至 iOS 標準 17pt（`text-[17px] font-semibold`），與其他分頁標題節奏一致。
    - 分類、健康狀態標籤與地點資訊升級為 13pt（`text-[13px] font-medium` 搭配 `px-2.5 py-1` 呼吸空間）。
    - 物品規格型號、未拆封說明與週期到期時間升級為 14pt（`text-[14px]`），清晰易讀免瞇眼。
    - 核心操作按鈕（「開始使用」、「今天已換」、「編輯日期」）字級由 12px 擴大至 14~15pt，高度提升至 40px（`min-h-10 text-[14px] font-semibold`），符合手指人體工學。
    - 狀態分段篩選列提升為 `text-[13.5px] py-2 px-3.5`，搜尋欄升級至 `text-[15px] py-2.5`。
- **Pantone 潘通色系與 Pinterest 2026 莫蘭迪調色全面升級（徹底汰換制式高彩度死板純色）**：
  - **導入潘通色彩體系**：
    - **Peach Fuzz（柔和桃，Pantone 2024 年度代表色）**：以 `#FFF5EE`（溫潤杏白）為畫布底色，`#C86F58` 與 `#D97757` 為核心操作與標題色，`#6B4A41` 為深暖褐內文，柔和且極富生活溫度。
    - **Plum Noir（暮色黑李，Pinterest 2026 moody maximalism）**：採用 `#F8F5F4` 為底色，以優雅醇厚的莫蘭迪李紫 `#8B5A73` 作為操作主色，搭配 `#5D3A4D` 深紫標題與 `#3D2832` 內文，徹底消滅過往刺眼的死板紫色（`#4f46e5`）。
    - **Terracotta（暖陶土）**：以溫潤陶土紅 `#C86F58` 與 `#A8543E` 為軸心，營造大地陶器手感。
    - **Sage Mist（鼠尾草綠）**：以低飽和灰綠 `#5E8271` 與草本灰綠調和，散發自然清新的寧靜氛圍。
    - **Nordic Slate（岩霧藍）**：捨棄高飽和制式寶藍與靛藍，改採北歐岩霧灰藍 `#4E6E82`，沉著內斂。
- **全站圖標全面升級為 Lucide 向量圖標（徹底消除手機 Emoji 表情符號）**：
  - 新增 `<StockIcon />` 向量元件，支援將歷史資料與各備品庫標籤映射為 Lucide 專業圖標（`Home`、`Zap`、`Droplets`、`Utensils`、`Car`、`Briefcase`、`Leaf`、`Wrench`、`Baby`、`PawPrint`、`Boxes`、`Package`）。
  - `StockSwitcher` 與 `StockSettingsModal` 的備品庫圖標選擇器全面改為 Lucide 向量圖標，切換選單頂部、全部備品與各操作項目徹底消除 `📦`、`🌟`、`🏠` 等系統 emoji。
  - 提示文字與狀態標籤全面淨化（例如推播狀態移除 `✅` / `❌`，引導提示移除 `💡` 改為專屬 Lucide 元件）。
- **Cloudflare UI Elements 風格與工程導向介面徹底重構（消弭 AI Slop / 泡泡膠囊公式感）**：
  - **色彩與材質體系全面翻新**：
    - 捨棄低彩度髒粉、薰衣草紫與混濁米色底色，全站底色升級為純淨 Slate-50 (`#f8fafc`)，卡片為標準純白 (`#ffffff`)，搭配細緻高對比 1px Slate-200 (`#e2e8f0`) 邊框。
    - 引入 Cloudflare 招牌橙 (`#f6821f` / `#ea580c`) 與 Cloudflare 藍 (`#0051c3`) 作為核心功能強調色。
    - 深色模式調校至 Cloudflare Docs 沉浸式冷灰 (`#0b0f19`) 與高對比邊框。
  - **消滅巢狀卡片 (Box-in-Box Syndrome)**：
    - 移除 `ItemCard` 內部突兀的紫色次級區塊，將價格、型號、地點等次要資訊平鋪為乾淨的單層 Slate 標籤與中繼資料列，視覺層級清晰不壓迫。
  - **移除 AI 感裝飾字元與過度慶祝橫幅**：
    - 依據 Cloudflare Style Guide UI Elements 規範，將按鈕與狀態中的表情符號與裝飾符號移除（例如「✨ 開始使用」、「🎉 正常運作中」巨型橫幅徹底刪除），精簡為工程俐落的操作動詞「開始使用」、「今天已換」。
  - **狀態徽章與篩選欄改為 Cloudflare Segmented Controls**：
    - 首頁篩選器由原先膨脹的泡泡膠囊改為極簡分段控制列（`全部`、`待處理`、`良好`、`要補貨`、`存放中`）。
    - 狀態標籤統一為 Cloudflare 規格：細邊框搭配 6px 狀態圓點（Dot Indicator），資訊密度與掃讀效率大幅提升。
  - **整合式庫存微調步進器 (Stock Stepper)**：
    - 在卡片底部右側直接整合緊湊的 `-` / `數字` / `+` 步進控制，兼顧 44px 觸控友善與高密度視覺排版。
  - **時程與採購清單同步風格收斂**：
    - `ShoppingView` 與 `TimelineView` 全面套用 Cloudflare 標籤、邊角半徑 (`rounded-xl` / `rounded-lg`) 與極簡通知反饋。
- **Emil Kowalski 設計工程與 Mobile-Native 體驗全面打磨**：
  - **手機原生感基石修正**：
    - 修正 `index.html` viewport 宣告，移除 `maximum-scale=1.0, user-scalable=no` 違規屬性，改由 `input/textarea/select` 強制保持至少 16px 防止 iOS Safari 自動聚焦縮放。
    - 全域注入 `-webkit-tap-highlight-color: transparent` 消除觸控時的藍灰底色閃爍。
    - 所有按鈕與可觸控元素設定 `touch-action: manipulation` 消除 300ms 雙擊延遲。
    - 引入 Emil Kowalski 核心物理曲線變數（`--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`、`--ease-drawer`）。
  - **觸控反饋與動效精緻化**：
    - 統一按鈕與互動元件為 `tactile-press`（`active:scale-[0.97]` 搭配 160ms ease-out），杜絕卡通感的 `scale-90`。
    - `Navbar` 消除 `transition-all`，改為指定屬性過渡，並對 hover 加上能力查詢避免手機 Sticky Hover。
    - 移除所有突兀且會造成視覺疲勞的 `animate-bounce-gentle` 放大彈跳，改為沉穩靜態或微淡入。
    - `ItemCard` 進度條加入平滑寬度過渡動畫（`transition-[width] 300ms ease-out`）。
  - **彈窗與抽屜動畫補齊**：
    - 替換 `ItemModal`、`AuthModal`、`HistoryModal`、`StockSettingsModal`、`BatchPhotoModal`、`StockSwitcher` 的無效假 Tailwind class，補齊硬體加速的 `modal-backdrop-animate`、`modal-content-animate` 與 `sheet-content-animate`。
    - 將彈窗高度上限由 `90vh` 改為 `90dvh` / `85dvh`，徹底解決手機虛擬鍵盤展開時的裁切與溢出問題。
    - `ItemCard` 更多選單與稍後提醒選單補齊 `transform-origin` 與縮放淡入動畫。
  - **版面安全區與底部導覽避讓架構化**：
    - 將各頁面散落寫死的 `pb-32` 收斂至 App `<main>` 容器層統一處理（`main-content-pb: calc(4.5rem + env(safe-area-inset-bottom) + 1.25rem)`），確保所有螢幕尺寸的卡片均可完整捲動與操作。
  - **無障礙 A11y 支援**：
    - 全域注入 `@media (prefers-reduced-motion: reduce)` 守衛。

## 2026-09-10

### Fixed
- 修正午夜邊界日期錯置：Passkey 建立日、更換履歷與 Stock 成員加入日一律依 `Asia/Taipei` 業務日顯示，不再把 UTC ISO 日期直接截斷或依瀏覽器時區顯示。
- 修正生命週期到期日語意：物品在到期日當天維持「今天到期」，下一個台灣業務日才標記為逾期；通知文案同步區分今日到期與已逾期天數。
- 修正 WebCal 全天事件的 RFC 5545 `DTEND` exclusive 邊界，改以排程日的下一個業務日結束，避免產生零長度事件。

### Tests
- 新增台灣午夜前一秒／當秒與到期日 23:59:59 邊界回歸測試。

### Docs
- 將日期範圍包含結束日、ISO timestamp 顯示、WebCal exclusive `DTEND` 與跨時區測試規範寫入 `AGENTS.md` 與 README。

## 2026-09-07

### Added
- **品牌識別全面重塑升級為「888 該換囉」與全新現代化幾何向量 Logo**：
  - **全新品牌商標設計（Brandmark）**：
    - 採用大地暖陶紅漸層（Coral/Terracotta Gradient）圓角方塊（Squircle）為基底，結合 290° 順時針循環箭頭弧線，象徵耗材週期的循環更新與生生不息。
    - 中心醒目排印俐落厚實的「888」品牌標誌，下方嵌入圓角膠囊「該換囉」微型徽章，右上方點綴翡翠綠高光對勾（Freshness Checkmark），呼應健康衛生的最佳生活品質。
  - **全解析度 PWA 與行動裝置圖示全套重繪**：
    - 精準生成 `icon.svg`、`icon-512x512.png`、`icon-192x192.png`、`apple-touch-icon.png` (180x180) 與 `favicon.ico`。
    - 建立自適應尺寸與主題色的 React `<BrandLogo />` 元件，於頂部導覽列流暢響應各主題配色。
  - **全站品牌名稱一致性收斂**：
    - 同步更新頂部導覽列（`Header`）、PWA Manifest（`vite.config.ts`）、HTML 元標籤（`index.html`）、多國語系字典（`dictionaries.ts`）與 Passkey 彈窗，全通路落實「888 該換囉」品牌定位。
- **頂部導覽列新增一鍵雙語切換按鈕**：
  - 在頂部固定導覽列（`Header`）「＋新增」按鈕左側新增語言切換快捷鍵（`EN` / `中`），手機單手即可秒切換繁體中文與英文。
- **設定頁全面實裝 5 款經典生活主題配色與深淺切換**：
  - **比照質感美學設計**：於「設定」區新增「外觀風格（選擇淺色主題色）」模組，支援 5 款精選色調：
    1. **珊瑚 (Coral)**：暖調紅陶珊瑚（預設）。
    2. **薄荷 (Mint)**：清爽薄荷草本綠。
    3. **蜜桃 (Peach)**：溫潤蜜桃粉（與參考圖一致）。
    4. **天空 (Sky)**：清透天藍海洋藍。
    5. **丁香 (Lilac)**：雅緻丁香紫。
  - **原生雙環選取回饋**：每款色球皆具備柔和外圈底色與實心圓心，選取時呈現高亮對比外環、放大動效與白色勾選標記（`✓`）。
  - **全站動態色階響應**：透過 CSS 變數系統即時更換主色調（`--app-accent`）、背景色、邊框色、導覽列高亮、卡片細部色彩與 `theme-color` meta 標籤，並相容深色模式。
  - **開放訪客模式即時體驗**：外觀與語言設定抽離為全域通用卡片，訪客模式下亦可自由換色體驗。

### Fixed
- **徹底修復耗材狀態標籤與徽章顏色對比度（WCAG AAA）**：
  - **解決淺色模式下文字隱形問題**：原先 `formatRemainingDaysText` 中的狀態標籤（如「剩餘 305 天」、「剩餘 5 天」、「已過期」等）誤用了淺色調（`text-emerald-300`, `text-amber-300`, `text-rose-300`），在淺色背景卡片與淡色徽章底色上產生嚴重對比不足（對比度低於 1.4:1），導致文字幾乎完全隱形無法閱讀。
  - **建立高對比度雙模式色階**：
    - 淺色模式一律使用深度高對比色系（800 等級，如 `text-emerald-800`, `text-amber-800`, `text-rose-800`, `text-indigo-800`, `text-sky-800`），對比度皆達 7:1 以上，符合 WCAG AAA 標準。
    - 深色模式使用清爽高亮粉彩（200~300 等級，如 `dark:text-emerald-200`, `dark:text-amber-200`, `dark:text-rose-200` 等），維持極佳夜間閱讀性。
  - **同步加強類別標籤與徽章字重**：
    - `CATEGORIES` 標籤文字顏色全數升級至 800 等級（如 `text-pink-800 dark:text-pink-200`），字體輪廓更加鮮明。
    - `.ui-badge` 基礎字重提升至 `600`（Semi-bold），在手機高解析度 Retina 螢幕上筆畫更紮實清晰，徹底根除小字筆畫過細難讀問題。
    - 補齊備品庫存為 0 時的深色模式色階（`dark:text-rose-400`）與首頁篩選按鈕圖示色調。

## 2026-09-05

### Security
- **落實最高安全鐵律 · 全面輪替 VAPID 金鑰並徹底清除程式庫明文憑據**：
  - 輪替全新 VAPID 公私鑰對、隨機 64-char `SESSION_SECRET` 與 `CRON_SECRET`，原私鑰全面廢止作廢。
  - 將私密金鑰自 `wrangler.toml` 的 `vars` 全數移除，一律改由 Cloudflare Workers 平台加密 Secrets (`wrangler secret put`) 儲存與注入。
  - 淨化 `README.md` 中硬編碼之舊金鑰範例，全數替換為安全的佔位符。
  - `.gitignore` 補充忽略 `.dev.vars*`。

### Fixed
- **消除首頁雙重「新增」按鈕**：
  - 解決頂部固定導覽列（`Header`）與首頁「物品」標題列同時渲染兩個「+ 新增」按鈕的疊床架屋問題，移除標題列重複按鈕，保持頂層單一明確操作入口。

### Changed
- **徹底廢除傷眼 12px/13px 微縮字級，建立真正符合手機人體工學的 4 級原生排版系統**：
  - **拒絕手機瞇眼看字**：全面拔除前版設定的 `12px`（`.ui-badge`）與 `13px`（`.ui-meta`）過小字級，重新以 iOS Human Interface Guidelines 與頂級 App（Airbnb、Linear、Apple Health）規範為基準，精確收斂為 4 種清晰可讀字級：
    1. **頁面主標題 (`.ui-page-title`)**：`24px` / 行高 `32px`，清晰醒目。
    2. **區塊與卡片標題 (`.ui-section-title` / `.ui-item-title`)**：`18px` / 行高 `26px`，重點分明。
    3. **內文、按鈕與輸入框 (`.ui-body` / `.ui-button` / `.ui-label`)**：`16px` / 行高 `24px`。特別是表單輸入框全面維持 `>= 16px`，徹底解決 iOS Safari 點擊聚焦時自動放大 (Viewport Auto-Zoom) 的致命體驗缺陷。
    4. **輔助資訊與徽章標籤 (`.ui-meta` / `.ui-badge`)**：`14px` / 行高 `20px`，保持清晰舒適，絕無任何低於 14px 的內容文字。
  - **地毯式肅清剩餘殘留 `text-xs` (12px) 與 `text-[11px]`**：
    - 全面翻修 `StockSwitcher.tsx`、`StockSettingsModal.tsx`、`BatchPhotoModal.tsx` 與 `Navbar.tsx`，徹底消滅所有 `text-xs` 與 `text-[11px]`。
    - 批次拍照建檔、多庫成員管理與設定彈窗中的所有按鈕、下拉選單與輸入框同步全面升級為 `>= 44×44pt` 舒適觸控熱區。
- **全面套用 `ceorkm/mobile-app-ui-design` 頂級 App 設計原則進行深度優化與修復**：
  - **峰值體驗與情緒反饋循環 (Peak-End Rule & Emotional Feedback Loops)**：
    - 耗材更換（「今天已換」）與啟用（「開始使用」）核心動作完成後，注入即時成就微動效與慶祝文案（如「🎉 耗材已更換！生活煥然一新」），讓繁瑣生活打理轉化為掌控生活的正向成就感。
    - 首頁結尾安心機制 (All Caught Up Banner)：當所有追蹤物品均處於健康狀態時，呈現舒心的「太棒了！所有耗材皆在最佳狀態」狀態卡，達成理想的離場心理體驗。
  - **全域字級與排版死角全面根除 (Typography System Completeness)**：
    - 徹底根除前次重構遺漏的頁面死角：全面翻修 `ShoppingView.tsx`（採購清單）、`SettingsView.tsx`（設定頁）、`ItemModal.tsx`（物品編輯表單）、`HistoryModal.tsx`（更換履歷）、`AuthModal.tsx`（無密碼登入）、`StockSwitcher.tsx`（備品庫切換），徹底清除殘留散落的 `text-2xl`、`text-xs`、`text-[11px]`、`font-mono` 等任意字級。
    - 統計數字、日期與庫存全數改採 `tabular-nums` 等寬數字符號，排版對齊不再跳動，維持原生系統字體一致質感。
  - **手機拇指熱區與 44×44pt 最小觸控目標 (Thumb Zone & Ergonomics)**：
    - 將 `ShoppingView` 庫存調節按鈕由過小的 24px (`w-6 h-6`) 擴大為 44px 拇指友善觸控目標（`min-h-11 min-w-9`），徹底解決手機單手操作誤觸痛點。
    - 將 `SettingsView` 金鑰輪換、Passkey 刪除、提前天數選擇、`ItemModal` 常用範本標籤、快捷天數、位置標籤全數擴增為符合人體工學的點擊區域。
    - 搜尋列新增單手一鍵清空（`×`）按鈕，解決手機行動輸入法逐字刪除的繁瑣步驟。
  - **60/30/10 色彩法則與自然調和陰影 (Color System & Shadows)**：
    - 修正 `ItemModal.tsx` 中突兀的 `shadow-sky-500/20` 陰影，改為主題色與柔和微陰影，杜絕雜色陰影破壞沉浸感。
    - 將各頁面的非必要高彩度背景收斂為 60/30/10 主題配色，強化 10% 品牌強調色，建立高秩序感。
  - **空狀態機會引導 (Empty States as Opportunities)**：
    - `TimelineView` 與 `ShoppingView` 的空白狀態從單純灰字文字，升級為具備圖示、安心反饋與操作建議的引導卡片。

### Fixed
- **訪客資料與登入銜接**：自行新增物品持久化於本機，示範資料可單獨清空/恢復；登入時可選擇帶入可編輯備品庫，照片會先轉檔上傳，成功項目移除避免重複，失敗項目保留供重試，儲存空間不足會明確提示。
- **生命週期與資料競態**：統一台灣業務日期，修正固定有效期限/保固在存放時被遮蔽、snooze 與 stored 通知/日曆誤提醒、固定日期物品可被標記更換，以及備品庫快速切換舊回應覆蓋新資料。
- **登入載入與 PWA 更新**：快取登入狀態載入期間不再閃示範資料；顯示載入/錯誤與重試狀態；Service Worker 導覽採 NetworkFirst 且快取 HTML，更新先提示、不強制重整中斷操作。

### Tests
- 新增日期、固定期限/存放狀態、訪客篩選與本機儲存容量錯誤回歸測試。

### Changed
- **頂部導覽列 (Header) 手機排版重構與視覺統一**：
  - **徹底移除「PWA」技術標籤**：消除工程自嗨術語，回歸乾淨專注的「afterBuy 該換囉」品牌標題，避免一般使用者產生「這不是正式版」的誤解與認知困惑。
  - **統一所有按鈕幾何尺寸與圓角語言**：徹底解決右側按鈕割裂感，全數統一為高度 `h-9` (36px) 與 `rounded-xl` 圓角，不再混用 `rounded-full` 橢圓膠囊。
  - **手機版防擁擠自適應佈局 (Mobile Compact Header)**：
    - 副標題在手機窄螢幕下自動隱藏（`hidden sm:block`），保持單行極致輕量。
    - 語言切換按鈕手機版精簡為 `EN` / `繁中`，省去重複的圖標寬度。
    - 登入按鈕手機版自動調整為 `登入`（桌面版維持 `登入 / 註冊`），輔以淡雅的主題輪廓與高對比生物辨識圖標，整體 Header 在 360px~375px 小型手機螢幕上流暢呼吸、完全不擠壓。
    - 已登入狀態下的「新增物品」按鈕同步整合為 `h-9 rounded-xl` 統一規格。

### Added
- **免登入體驗模式 (Guest Sandbox Mode) 完整 UX 引導機制**：
  - **訪客專屬體驗導引卡片 (GuestGuideBanner)**：於儀表板頂部顯眼處呈現透明化引導，清楚標明「免登入體驗模式」與「示範資料 · 僅暫存本機」徽章。
  - **化解「誤認他人帳號 / 資料去向不明」的 UX 痛點**：明確說明目前顯示的 4 項物品為生活示範耗材，使用者可自由點擊「今天已換」與「+/- 備品」測試互動，並引導登入即可解鎖跨裝置雲端儲存、WebCal 日曆訂閱與推播通知。
  - **沙盒彈性操控 (Clear & Restore Demo Items)**：
    - 提供「清空示範資料」按鈕，支援想要自行手動建立第一批耗材的訪客獲得乾淨環境。
    - 提供「恢復示範資料」按鈕，空狀態下亦提供一鍵恢復示範物品入口。
### Fixed
- **PWA Service Worker 快取死鎖修復與 NetworkFirst 自動重整機制**：
  - 修復 `vite-plugin-pwa` 預設將 `index.html` 納入 Cache-First 導致瀏覽器長期鎖死於舊版靜態 Bundle 的問題。
  - 將導覽請求（Navigation）調整為 `NetworkFirst` 策略，連線時即時獲取最新 `index.html`，離線時自動回退快取。
  - 於 `index.html` 與 `main.tsx` 注入 `controllerchange` 與主動 `registration.update()` 監聽，當 Service Worker 偵測到新版本時自動無縫重整頁面，徹底告別舊快取困擾。
- **標題文字中文字元垂直折行擠壓修復 (Vertical Stack Text Fix)**：
  - 為 `afterBuy` 與 `該換囉` 標題元素全面加入 `whitespace-nowrap shrink-0`，杜絕在極窄螢幕或系統大字級模式下中文逐字斷行排成垂直欄位的嚴重版面錯誤。

---

## 2026-09-04

### Added
- **多備品庫（Stock Spaces）多人協作與空間隔離架構**：
  - **架構解耦**：將使用者（Users）與物品庫（Stocks）分離，每位使用者可擁有並參與多個 Stock（例如「甜蜜的家」、「電子木工坊」、「露營設備」），支援家庭成員與工作夥伴共同管理。
  - **「全部備品（All Stocks）」總覽模式**：解決多空間切換遺漏警報的痛點，預設以「全部備品」彙整所有可存取的 Stock，晨間摘要、到期倒數與日曆訂閱一網打盡。
  - **4 級角色權限控制 (RBAC)**：
    - `owner`（擁有者）：擁有最高權限，可刪除備品庫或執行轉移擁有權。
    - `admin`（管理員）：可編輯備品庫設定、邀請與管理成員、新增與編輯物品。
    - `member`（成員）：可查看、新增、編輯物品、執行「今天已換」與調整庫存。
    - `viewer`（檢視者）：僅能檢視物品狀態與庫存，防止誤觸修改。
  - **原子化「轉移擁有權 (Ownership Transfer)」機制**：
    - 擁有者可將 Stock 擁有權安全轉移給特定現有成員，後端以資料庫原子事務（Transaction）完成，轉移後原擁有者自動降為管理員（Admin）不移出空間。
    - 前端介面提供輸入備品庫名稱之雙重確認機制，杜絕誤操作。
  - **8 碼邀請代碼與即時加入連結 (Stock Invites)**：
    - 管理者可一鍵產生專屬 8 碼大寫英數字邀請代碼與分享網址，支援自訂預設角色、有效期限與使用次數。
    - **抽屜直連邀請**：在備品庫切換抽屜直接為擁有者/管理員配置 `[ ➕ 邀請 ]` 按鈕，一鍵開啟邀請視窗。
    - **設定頁置頂分享卡片**：在備品庫設定中置頂「邀請家人或夥伴」Hero Card，2xl 大字標示邀請碼並支援一鍵複製完整專屬網址。
    - 支援直接點擊分享網址（`?joinStock=CODE`）免手動輸入一鍵秒加入。
  - **平滑無痛資料回填 (Zero-Loss Migration)**：
    - 生成 D1 Migration（`0003_robust_tarot.sql`）新增 `stocks`、`stock_members`、`stock_invites` 表，並為 `items` 關聯 `stock_id`。
    - 執行回填遷移腳本，將既有使用者及其物品無損遷移至預設「甜蜜的家」備品庫，本地與遠端雙環境（`ai360`、`david`）均 100% 成功應用。
  - **多日曆流與通知彙整升級**：
    - RFC 5545 WebCal 訂閱支援彙整型個人日曆流（事件標題自動加上 `[StockName]` 前綴）與個別 Stock 獨立日曆流。
    - 每日晨間摘要 Email 與 Web Push 推播通知依 Stock 名稱清晰分組提示。
  - **前端 StockSwitcher 膠囊抽屜與 StockSettingsModal 設定視窗**：
    - 頂部導覽列提供 `[ 🌟 全部備品 ▾ ]` 膠囊按鈕，點擊彈出手機優先的底部 Action Sheet / Drawer，支援一鍵切換、建立新備品庫與輸入代碼加入。
    - 提供完整備品庫設定視窗，支援成員名單管理、權限指派、移除成員、複製邀請連結、轉移擁有權與退出/刪除。
    - 物品卡片（ItemCard）自動顯示所屬備品庫徽章，新增物品視窗（ItemModal）提供所屬備品庫指派選擇。
    - 新增自動化整合測試套件（`tests/stocks_collaboration.test.ts`），25 項測試全部綠燈通過。
- **品牌正式確立為「afterBuy 該換囉」**：
  - 融合「買了之後」的物品備品追蹤與「該換了嗎」的耗材週期警報起念，確立「afterBuy 該換囉」品牌識別與定位。
  - 全面更新 HTML Title、應用程式 Header 標題與中英文語系字典。
- **「先存放，還沒有要開始使用」模式 (Stored / Inactive Inventory)**：
  - 物品新增與編輯支援勾選「先存放，還沒有要開始使用」（`isStored: true`）。
  - 處於存放模式之物品不啟動使用壽命倒數，卡片呈現「📦 存放中（未拆封）」專屬橫幅與「✨ 開始使用」啟用按鈕。
  - 點擊「開始使用」後自動以今日為起算日（`startDate = today`）並將物品轉為啟用倒數狀態，支援訪客本機與遠端 API（`POST /api/items/:id/start-using`）。
  - 儀表板頂部新增「📦 存放備品」快速統計與篩選標籤。
- **「延後提醒 (Snooze 稍後再說)」功能**：
  - 卡片操作選單支援「延後 3 天」或「延後 7 天」（`snoozeUntil`）。
  - 延後狀態下卡片標註「💤 已延後至 YYYY-MM-DD」，頂部新增「💤 延後中」篩選標籤。
  - 後端提供原子化端點 `POST /api/items/:id/snooze`，並與生命週期引擎（`computeItemStatus`）即時聯動。
- **「存放位置 (Location)」多空間管理與即時篩選**：
  - 物品資料結構擴充 `location` 欄位（例如：衛浴、廚房、臥室、客廳、陽台、玄關、辦公室）。
  - 新增/編輯視窗提供熱門空間快捷標籤與自訂輸入，卡片右上角標記空間標籤。
  - 儀表板搜尋列下方動態顯示空間位置水平滑動標籤，支援按位置即時篩選。
- **「今天都處理好了」Inbox Zero 情緒卡片**：
  - 當所有物品狀態均良好或已處理時，首頁頂部展現「100% 最佳狀態」的綠色成就祝賀卡片，提供掌握生活節奏的正向情緒反饋。
- **資料庫結構遷移 (0002_mixed_carlie_cooper.sql)**：
  - D1 資料庫 `items` 表新增 `location TEXT`、`is_stored INTEGER DEFAULT 0`、`snooze_until TEXT`。
  - 完成 Cloudflare 雙環境（`ai360` 與 `david`）遠端 D1 遷移。

### Fixed
- **備品庫齒輪設定按鈕點擊白畫面崩潰修復 (StockSettingsModal White Screen Crash Fix)**：
  - 修復 `src/api/routes/stocks.ts` 路由 `GET /api/stocks/:id` 未查詢並回傳 `invites` 物件，造成前端 `StockSettingsModal` 在讀取 `invites.length` 時拋出 `TypeError: Cannot read properties of undefined (reading 'length')` 導致 React 樹崩潰白畫面。
  - 後端全面補齊 `stockInvites` 關聯查詢，並修正 `POST /api/stocks/:id/invites` 回傳契約；前端加入防禦性空陣列防護與初次載入自動備妥邀請碼之機制。
- **粉圓體 (justfont Huninn) 粗體回退修復與中文排版字體舒適放大**：
  - 修復 Google Fonts Huninn 僅提供 400 單一字重導致套用 `font-bold` 或 `font-semibold` 時在 WebKit/Blink 瀏覽器自動回退至系統 PingFang TC（蘋方）的字感斷層。
  - 在 `src/client/index.css` 宣告 `@font-face` 之 `font-weight: 100 900;` 並啟用全域 `font-synthesis: weight style;`，強制瀏覽器正確合成粗體粉圓體；字型優先權調整為 `'Huninn', 'jf-openhuninn'` 置頂。
  - 將全站基礎字級由 14px 舒適上調至 15px/16px，各層級中文標題與按鈕加大，徹底根除手機中文字體密集難讀問題。
- **全站字體大小全面盤點與排版層級標準化（徹底解決字體忽大忽小、各自為政）**：
  - 盤點並修正全站所有元件與頁面（`ItemCard`、`ItemModal`、`BatchPhotoModal`、`DashboardView`、`ShoppingView`、`TimelineView`、`SettingsView`、`StockSwitcher`、`StockSettingsModal`、`Navbar`、`Header`、`AuthModal`、`HistoryModal`）。
  - **嚴格建立 6 級排版階層規範（Typographic Hierarchy）**：
    1. **Level 1（頁面主標題）**：`text-2xl sm:text-3xl font-bold tracking-tight text-[var(--app-text)]`。
    2. **Level 2（區塊 / 彈窗標題）**：`text-base sm:text-lg font-bold tracking-tight text-[var(--app-text)]`。
    3. **Level 3（卡片標題 / 指標數值）**：`text-base font-bold text-[var(--app-text)]`。
    4. **Level 4（內文 / 標準輸入框）**：`text-sm text-[var(--app-text)]`。
    5. **Level 5（次要說明 / 輔助文字 / 表單標籤）**：`text-xs font-semibold text-[var(--app-muted)]`。
    6. **Level 6（狀態標章 / 徽章 / 標籤）**：`text-[11px] font-semibold leading-normal`（嚴格作為全站最小字體底線，專用於膠囊徽章與計數器）。
  - **全面消滅微小文字與任意括弧像素字體**：
    - 徹底根除所有 `text-[9px]`、`text-[10px]`、`text-[15px]`、`text-[17px]` 等任意像素級寫法。
    - 移除所有會造成手機螢幕閱讀吃力的極微小文字，手機單手檢視時資訊清晰聚焦、節奏分明。
- **雙色主題（日系暖石色 Light Mode 與 青花瓷藍 Dark Mode）色彩一致性重構**：
  - 徹底移除 `StockSwitcher`、`StockSettingsModal`、`ItemCard`、`ItemModal`、`BatchPhotoModal` 與 `Header` 中的硬編碼純深色類別（如 `bg-slate-900`、`bg-slate-950`、`border-slate-800`、`text-slate-400`、`text-white`）。
  - 全面採用語意化設計代幣（`app-surface`、`app-surface-subtle`、`app-control`、`app-primary`、`var(--app-text)`、`var(--app-muted)`、`var(--app-accent)` 等）。
  - 分類標籤採用雙模式自適應色彩方案（如 `text-cyan-700 dark:text-cyan-300 bg-cyan-500/15 border-cyan-500/30`），徹底解決淺色模式下泛白、發灰或對比不足的視覺混亂。
  - 在日系無印暖石色淺色模式（Light Mode）下，備品庫卡片、抽屜按鈕、身份標籤與物品徽章呈現細緻清晰的溫潤對比；在青花瓷藍深色模式（Dark Mode）下呈現幽藍冷萃與高對比發光感，不再有灰黑污斑或字體隱形。
- **StockSwitcher 與 StockSettingsModal 視窗層級與 Containing Block 截斷修復**：
  - 徹底解決 `Header` 元素之 `backdrop-blur-md` 導致其內部子元素 `position: fixed` 形成局部 Containing Block，使彈出視窗被強制垂直置中於 64px 導覽列頂部、上半部標題與關閉按鈕被螢幕邊緣截斷的嚴重問題。
  - 全面導入 React `createPortal(..., document.body)` 頂層渲染架構，保證彈出抽屜與設定視窗精準錨定全螢幕視窗（Viewport）。

### Changed
- **校正 ai360 環境正式自訂網域名稱與宣告 Workers Custom Domain 路由**：
  - 將 `wrangler.toml` 與環境變數 `APP_ORIGIN` 由 `https://afterbuy.aicreate360.ai` 校正為正確網域 `https://afterbuy.create360.ai`。
  - 在 `wrangler.toml` 為 `ai360`（`afterbuy.create360.ai`）與 `david`（`afterbuy.david888.com`）明文化宣告 `routes = [{ custom_domain = true }]`，將邊緣自訂網域納入代碼即架構（IaC）版本控制。
- **品牌字體系統全面升級（JetBrains Mono + justfont 粉圓體）**：
  - 英文與數字全面採用 **JetBrains Mono**：幾何等寬、數字清晰精緻，在倒數天數、金額標記、規格與日期呈現極具質感的現代感。
  - 中文字體全面採用 **justfont 粉圓體（Huninn / jf-openhuninn）**：筆觸圓潤飽滿、富有日系手帳與生活感的情緒價值。
  - 配置 Google Fonts 切片 WOFF2 CDN 與 jsdelivr 雙軌並行載入，並在 `index.html` 啟用 `<link rel="preconnect">` 預載機制，兼顧極致字感與秒開效能。

---

## 2026-09-03

### Added
- **Cloudflare 雙帳號環境架構（ai360 與 david）**：
  - 在 `wrangler.toml` 完成 `[env.ai360]` 與 `[env.david]` 雙帳戶隔離配置，分別綁定兩大帳戶專屬之 Account ID、D1 資料庫、KV Namespace 與 R2 儲存桶。
  - 建立遠端雲端資源：
    - `ai360` (ID: `aa3bf2b7...`)：D1 (`c682ad96-...`)、KV (`07400407...`)、R2 (`afterbuy-r2`)。
    - `david` (ID: `37957086...`)：D1 (`d86afa44-...`)、KV (`ae50aa2a...`)、R2 (`afterbuy-r2`)。
  - 完成雙帳戶遠端 D1 Migration，資料表結構（`users`、`passkey_credentials`、`items`、`replacement_logs`、`push_subscriptions`）均已於兩大帳戶同步建立。
- **Cloudflare Workers 原生 Static Assets 整合**：
  - 在 `wrangler.toml` 啟用 `[assets] directory = "./dist"` 與 `not_found_handling = "single-page-application"`，實現 Vite React 19 PWA 前端與 Hono 後端 API 同源整合部署。
- **雙帳號部署腳本**：
  - 在 `package.json` 新增 `deploy:ai360`、`deploy:david`、`deploy:all`、`db:migrate:ai360`、`db:migrate:david`。
- **Resend 雙帳戶自訂網域郵件發信（create360.ai 與 vip.david888.com）**：
  - `ai360` 帳戶配置發件人：`afterBUY <notifications@create360.ai>`。
  - `david`（DAVID江江江）帳戶配置專屬發件人：`afterBUY <notifications@vip.david888.com>`。
  - 完成兩大自訂網域在 Resend 上的 DKIM/SPF 驗證與正式實機重新部署，雙端發信實測均呈現 `delivered` 狀態。

- **本地部署配置與安全隔離 (local.md)**：
  - 將雙帳戶資源 ID、Resend API 金鑰、VAPID 憑據與專屬部署指令彙整至 `local.md`。
  - 將 `local.md` 加入 `.gitignore`，徹底杜絕敏感金鑰外洩風險。
- **正式站台自訂網域適配與 CORS 動態相容**：
  - `APP_ORIGIN` 正式切換至 `https://afterbuy.aicreate360.ai` 與 `https://afterbuy.david888.com`。
  - 在 `src/api/index.ts` 與 `src/api/routes/auth.ts` 升級動態 Request Origin 判定，使 WebAuthn / Passkey 在自訂網域與邊緣 workers.dev 均能完美相容。
- **手機批次拍照建檔與 R2 多圖並行上傳 (`POST /api/upload/batch`)**：
  - 支援手機相機後鏡頭連續拍攝（`capture="environment" multiple`）與相簿多選匯入。
  - 多圖並行上傳至 Cloudflare R2，並即時產出可編輯的草稿卡片（支援批次調整名稱、分類、週期、價格與型號），支援一鍵批量建檔。
- **多選模式與浮動批次操作列 (Floating Batch Action Bar)**：
  - 物品卡片支援 Checkbox 多選切換，底部動態滑出浮動操作列。
  - 提供「🔥 一鍵全部換新（批次已換）」、「📦 批次 +1 備品」與「🗑️ 批次刪除」。
  - 後端新增交易式批次端點 `POST /api/items/batch-replace`、`POST /api/items/batch-stock`、`POST /api/items/batch-delete`，在 D1 交易內原子化更新歷史與庫存。
  - 在「備品採購 (Shopping)」頁面支援一鍵為所有急需補貨品項「全部 +1 備品」。
- **狀態管理與 Session 遺失問題修復**：
  - 修復 Email OTP 驗證成功後因彈窗未點擊最終步驟而導致的前端使用者狀態未提早 commit 問題。
  - 加入 `localStorage` (`afterbuy_user`) 雙重持久化狀態同步機制，配合背景 `/api/auth/me` 異步驗證，徹底消除重新整理或頁面跳轉時的「登入一轉頭就登出」閃斷問題。
  - 修正登出端點 `deleteCookie(c, 'afterbuy_session', { path: '/' })` 確保全站路徑 Cookie 徹底清除。
- **單一物品新增與編輯之拍照 / 上傳屬性全面上線**：
  - 在 `ItemModal.tsx` 補全實體照片屬性區塊（支援「相機直拍 `capture="environment"`」、「相簿選圖」與預設插圖切換）。
  - 支援大縮圖即時預覽、上傳進度旋轉指示器與一鍵移除功能。
- **訪客模式 (Guest Mode) 零阻礙本機體驗**：
  - 訪客使用者無須登入即可自由體驗「拍照建檔」與「新增物品」全功能，自動以 `FileReader` 讀取本機 Base64 Data URL 進行即時預覽與本機狀態建檔，完全避免非登入狀態下請求 R2 造成的 401 或網路中斷。
- **批次拍照 (Batch Intake) 體驗重構與智慧範本標籤 (Smart Preset Chips)**：
  - 依據 `frontend-design` 準則重構批次拍照流程，未拍時呈現醒目相機與相簿大卡引導，拍攝後自動收合為小巧操作列，將視線聚焦於草稿檢視。
  - 每張草稿卡片均內建水平滑動「常用範本標籤」（如「貼身內褲 90天」、「運動襪 90天」、「安全帽 3年」、「印表機墨水 180天」等），輕觸單鍵即可自動帶入名稱、分類、推薦週期、規格與價格，省去手機手打鍵盤負擔。
- **Passkey 跨網域與跨金鑰庫提示強化**：
  - 針對網域切換（由邊緣 `workers.dev` 切換至自訂網域 `afterbuy.david888.com`）導致系統鑰匙圈無對應憑證的現象，優化登入提示：「在此網域或裝置尚未綁定 Passkey。請先使用 Email 登入，登入後即可一鍵綁定 Touch ID / Face ID！」
  - Email 登入成功後即刻跳出高對比度 Passkey 綁定卡，引導用戶一鍵將當前設備與網域完成生物辨識註冊。
- **後端全局錯誤捕捉與 WebMCP 404 防禦**：
  - 在 `src/api/index.ts` 新增 `app.onError` 全局捕捉器，確保任何異常回傳皆包含乾淨的 JSON 與正確的 CORS 標頭，杜絕瀏覽器端出現「Failed to fetch」。
  - 註冊 `/mcp` 端點以優雅響應客戶端 WebMCP 瀏覽器環境探測，避免控制台 404 報錯。
- **極速零依賴中英雙語系系統 (i18n)**：
  - 建置輕量 React `I18nProvider` 與 `useTranslation()`，支援繁體中文（`zh-TW`）與英文（`en`）。
  - 在頂部導覽列（Header）與偏好設定（Settings）提供即時切換按鈕，持久化記憶至 `localStorage`，無須重新載入頁面即可瞬間切換所有標籤、狀態與動態倒數。
- **生活物品種類擴充與購買金額 / 規格型號追蹤**：
  - 新增 `clothing`（貼身穿戴）生活分類。
  - 新增生活常備範本：貼身內褲（90~180天衛教淘汰換新）、貼身內衣（180~365天彈性檢視）、棉襪（90~180天）、機車安全帽（3年/1095天交安換新）、印表機墨水/碳粉（180天）、維他命C/保健品（60天/PAO 3個月）、乾電池（180天常備備品）、除濕機濾網。
  - 資料庫 D1 增加 `price`（購買金額）與 `spec_model`（規格型號）欄位，完成雙帳戶 D1 遷移。
- **OpenSpec 變更歸檔與新功能提案建立**：
  - 正式將首期上線變更 `init-afterbuy-pwa` 歸檔至 `openspec/changes/archive/2026-09-03-init-afterbuy-pwa`，並同步更新 15 項主要規格至 `openspec/specs/`。
  - 完成 `batch-ops-i18n-and-expansion` 規格實作（包含批次拍照上傳、多選批次更換扣庫存、中英雙語系切換、購買金額與生活品項擴充），全套單元測試與端對端驗證 100% 通過。

### Fixed
- **React 渲染例外修復（`ReferenceError: hasFilters is not defined`）**：
  - 修復 `DashboardView.tsx` 中篩選狀態清除變數未正確定義導致首頁白屏的問題，全面通過 `tsc --noEmit` 型別驗證。
- **PWA Manifest PNG 圖示與 Web App 相容性標籤修復**：
  - 將 `public/icons/` 假 PNG（實為 SVG）使用 `sips` 重新轉換為真正的 192x192 與 512x512 8-bit RGBA PNG 二進位檔案，解決 PWA Manifest 圖示解碼失敗警告。
  - 在 `index.html` 補齊標準 `<meta name="mobile-web-app-capable" content="yes" />`。

### Docs
- 同步更新 `README.md`，詳載 Cloudflare 雙帳號部署架構、批次功能與中英雙語支援說明。

---

## 2026-09-02

### Security
- **Cloudflare Security Audit 完整資安審計與強化**：
  - 安裝 `cloudflare/security-audit-skill` 並完成全代碼庫 6 階段資安審計（產出 `architecture.md`、`REPORT.md`、`FINDINGS-DETAIL.md` 與驗證合規之 `findings.json`）。
  - **SEC-01 修復**：在 `src/api/routes/upload.ts` 建立嚴格圖片 MIME 類型白名單（JPG/PNG/WEBP/GIF），阻斷 SVG/HTML 檔案偽裝上傳，並在 `/api/media/*` 端點強制注入 `Content-Security-Policy: default-src 'none'; sandbox` 與 `X-Content-Type-Options: nosniff` 標頭，徹底杜絕 Stored XSS 漏洞。
  - **SEC-02 修復**：在 `src/api/routes/auth.ts` 中移除 API 回應中的 `devOtp` 明文外洩，確保未配置 Resend 金鑰時仍絕無帳號被未授權接管之可能。
  - **SEC-03 修復**：在 `DELETE /api/auth/passkey/:id` 刪除查詢中加入 `userId` 雙重比對條件，修補 IDOR 權限越權漏洞。
  - **SEC-04 修復**：在 `src/api/routes/calendar.ts` 實作 RFC 5545 `sanitizeIcsText`，過濾並跳脫 `\r\n`、`,`、`;`、`\`，防止 iCalendar CRLF 協定注入攻擊。
  - **SEC-05 修復**：在 `src/api/routes/notifications.ts` 實作 `escapeHtml`，防止物品名稱在晨間 Email 摘要中引發 HTML 注入。
  - **SEC-06 修復**：在排程 Cron Bearer Token 驗證中採用常數時間字串比較（`timingSafeEqual`），防範時間差攻擊。

### Added
- 建立專案規範 `AGENTS.md`，明定每次修改必記 CHANGELOG（以日期為標題）與重大改進修訂 README 之鐵律。
- 開源授權設定：採用 **GNU Affero General Public License v3.0 (AGPL-3.0)** 並建立 `LICENSE` 檔案。
- GitHub 儲存庫建立與同步：已正式建立公開儲存庫 [tbdavid2019/afterBUY](https://github.com/tbdavid2019/afterBUY) 並推送 `main` 分支。
- **LLMs.txt 規範支援 (llmstxt.org)**：
  - 建立 `/llms.txt` 與 `/.well-known/llms.txt`，提供結構化的專案簡介與快速導覽。
  - 建立 `/llms-full.txt`，提供包含完整系統架構、密碼學認證流程、生命週期算式與 API 端點之全規格文件。
  - 在 HTML Header 宣告 `<link rel="help" type="text/plain" href="/llms.txt" />`。
- **OpenGraph 社群分享與預覽卡片 (opengraph.to)**：
  - 建立 `public/og.svg` 與 `public/og.png`（1200x630 高畫質深色質感情境橫幅）。
  - 在 `index.html` 補齊標準 OpenGraph (`og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `og:site_name`, `og:locale`) 與 Twitter Card (`summary_large_image`) 標籤。
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
