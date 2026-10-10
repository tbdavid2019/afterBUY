## Context

localStorage 已保存物品與目前操作狀態，但手機訪客標籤被隱藏，說明收於折疊區。登入帶入缺少數量追蹤欄位且 native confirm 與登入步驟重疊。

## Decisions

- 使用所有主頁共用常駐提示，明確區分本機試用與帳號同步；不宣稱本機等於永久雲端保存。
- 登入後透過明確的帶入按鈕操作，不在認證流程插入確認。只帶入自訂物品，保留完整目前狀態。失敗物品保留本機，在同頁重試時跳過已成功項目。
- 拒絕背景更新強制重整，沿用先前穩定表單修正。
- Pointer Events 手勢限定手機 touch，門檻 72px 並要求主要軸明確。水平手勢保留 pan-y；忽略輸入、按鈕、橫向捲動區和子手勢區。pointercancel、lostpointercapture、blur 與多指輸入都清理狀態。
- 右滑只呼叫既有 replace／Undo 流程；左滑開啟選單而不直接刪除。下滑退出只在表單標題區，未儲存內容先確認。

## Risks

後端依帳號及來源物品產生穩定 primary key，以 atomic conflict handling 防止回應中斷、跨分頁與重新整理重試產生重複。不覆寫既有雲端內容；已刪除項目回傳衝突而不復活。localStorage 清理失敗仍可重試。跨裝置無法取回未同步試用資料。實體手機手勢仍需裝置驗證。

## Validation

回歸測試、UTC／非台灣時區、正式建置、手機 Chromium 真實 touch 與 WebKit 模擬 pointer；驗證本機重載、帶入完整欄位與部分失敗、滑動／捲動區分、復原與取消／多指／blur 恢復。Luna 獨立審查通過後才部署與推送。
