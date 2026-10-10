## Why

手機新增備品時輸入會中斷：PWA 背景更新強制重整，表單會因備品庫資料更新重設，背景誤觸或輸入法 Escape 也會關閉視窗。常用範本缺少洗髮精。

## What Changes

- 新增／編輯表單每次開啟只初始化一次，保留開啟期間的輸入。
- 停用背景點擊關閉，組字期間 Escape 不關閉表單。
- PWA 更新等待使用者點擊，表單開啟時暫緩更新提示及自動版本說明。
- 共用範本庫加入洗髮精／洗髮乳，60 天可調整補貨週期。
- 口腔清潔範本明確分為電動牙刷刷頭、普通牙刷、舌苔刷三項。

## Capabilities

### Modified Capabilities
- `pwa-mobile-ui`: 表單輸入穩定性與明確同意後套用 PWA 更新。
- `item-tracking`: 衛浴洗沐標準範本補齊洗髮精。

## Impact

影響 React 表單、Service Worker 註冊與 Vite PWA 設定、前端及 Agent API 共用範本。無資料庫變更。
