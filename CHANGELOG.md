# Changelog

本專案所有重要更新紀錄。依據 `AGENTS.md` 鐵律，記錄格式一律以**日期（YYYY-MM-DD）**排序，不使用版本號。

---

## 2026-09-05

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
