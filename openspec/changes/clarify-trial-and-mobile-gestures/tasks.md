## 1. Implementation
- [x] 1.1 常駐試用提示、手機未登入標籤、示範標示、本機失敗重試。
- [x] 1.2 完整欄位帶入與登入後入口、部分失敗保留及同頁重試保護。
- [x] 1.3 手機卡片／導覽／表單手勢，取消及多指防護。
- [x] 1.4 同步 README、CHANGELOG 與發布說明。

## 2. Verification and release
- [x] 2.1 單元、時區、手機瀏覽器與正式 PWA 驗證。
- [x] 2.2 Luna subagent 審查通過，處理必要修正。
- [x] 2.3 部署 ai360 與 david、線上驗證並提交推送。

## Validation results

- UTC 與 America/Los_Angeles 各 76 項測試通過；正式建置成功。
- 全專案型別檢查仍有 37 項既有 API 診斷，相對 HEAD 無新增錯誤；已修復本次流程相關的 5 項前端診斷。
- Chromium 390px 使用真正 CDP touch、WebKit 390px 使用合成 Pointer Events（模擬 capture）：手勢取消、多指、blur、捲動、右滑更換＋復原、左滑選單、頁面切換、未儲存表單下滑取消／確認通過。
- Chromium 390px、WebKit 390px、Chromium 1280px：試用提示、本機重新整理、儲存配額失敗重試、Email OTP 登入、主動帶入完整數量與照片、部分失敗不重複建立皆通過。
- 真實正式 build Service Worker：編輯期間背景更新、跨分頁啟用不重整目前表單；明確點擊更新後只重整一次。
- 手機與桌面截圖已檢視；Impeccable detector 只指出既有 ItemCard indigo palette 警告，新增介面無發現。OpenSpec strict validation 通過。
- 未使用實體 iOS／Android 鍵盤及手勢。
- Luna 初審指出重新整理／回應中斷後帶入重複風險；已補後端穩定識別與 atomic conflict handling，真實 router 測試覆蓋跨分頁競爭、重試、帳號隔離、不覆寫雲端修改、不復活已刪除物品與權限檢查。
- Luna 複查 PASS：修正後無 P1／P2，允許進入部署；320px 實際瀏覽器驗證無水平溢出。
- 雙站部署成功並驗證正式 HTML 新版 bundle、JavaScript／Service Worker 與建置檔完全一致；未登入 API、390px 試用提示、無溢出及洗髮精範本通過。ai360 deployment ID：`e567eace-cefc-450d-bbc9-c60a73ee0720`；david：`9ba8d06a-d734-4c4b-b1da-99b21e37fcaf`。
