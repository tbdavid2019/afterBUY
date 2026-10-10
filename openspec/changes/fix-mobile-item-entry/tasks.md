## 1. Implementation
- [x] 1.1 保護表單工作階段，移除背景關閉並忽略 IME Escape。
- [x] 1.2 改為明確套用 PWA 更新，編輯期間延後更新提示與自動版本說明。
- [x] 1.3 新增共用洗髮精範本並更新 README、CHANGELOG。
- [x] 1.4 口腔清潔範本分為電動牙刷刷頭、普通牙刷、舌苔刷三項，保留既有刷頭識別碼。

## 2. Validation
- [x] 2.1 通過更新流程與範本回歸測試、UTC／非台灣時區測試。
- [x] 2.2 完成手機／桌面瀏覽器輸入、viewport、背景點擊與儲存驗證。
- [x] 2.3 通過建置並記錄型別檢查及 OpenSpec 驗證結果。

## Validation results

- `TZ=UTC npm test`、`TZ=America/Los_Angeles npm test`：最終合併各 76 項測試通過。
- `npm run build`：成功；既有 bundle 大小提示仍存在。
- `npx tsc --noEmit`：最終合併仍有 37 項既有 API 診斷，相對 HEAD 無新增錯誤；另修復 5 項相關前端診斷。
- Chromium 390px、WebKit 390px、Chromium 1280px：stocks／空間 props 刷新、中文輸入與 IME Escape、viewport 縮小、背景點擊均保留內容；儲存、再次開啟清空、搜尋洗髮精與帶入 60 天預設通過。
- Chromium 正式 build 搭配真實 Service Worker：新版等待期間表單不重整、更新提示延後；另一分頁啟用新版保留目前輸入；明確點擊更新才重整一次。
- 介面截圖已檢視，Impeccable detector 無發現；OpenSpec strict validation 通過。
- 未使用實體 iOS／Android 鍵盤，viewport 縮小與組字事件由 Playwright 模擬。正式發布紀錄見另一變更 `clarify-trial-and-mobile-gestures`。
