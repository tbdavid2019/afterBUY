## Why

目前 afterBuy 採用單一使用者直接綁定物品（users -> items）的個人化模型，無法滿足家庭共享與多生活情境分流的真實需求：
1. **家庭協作斷裂**：家庭生活耗材（如牙刷、濾芯、沐浴乳）無法由同住家人（爸爸、媽媽、小孩）共同管理、打卡與補庫存。
2. **多生活情境混雜**：專業嗜好（木工、電子材料、露營重機）與居家耗材混在同一清單，介面雜亂且缺乏情境隔離。
3. **通知與全景平衡**：在支援多 Stock 的同時，必須維持全域「全部匯總（All Stocks）」與全域綜合通知，避免切換造成漏看漏換。

## What Changes

- **Stock 概念與實體建立**：引入「Stock（備品庫 / 庫存空間）」實體，將物品擁有權從單一 User 解耦並歸屬至 Stock。
- **多人成員與 3+1 級權限控制（RBAC）**：支援 `Owner`（擁有者）、`Admin`（管理者）、`Member`（一般成員）、`Viewer`（唯讀）。
- **擁有權轉移（Transfer Ownership）**：Owner 可隨時將 Stock 最高擁有權轉讓給其他現有成員，原 Owner 自動平滑轉為 Admin，具備完整防呆與邊界保護。
- **邀請加入機制**：支援一鍵生成專屬邀請碼或邀請連結，家庭成員可秒速點擊加入。
- **首頁「全部匯總 (All Stocks)」雙軌視圖**：首頁預設展示跨所有所屬 Stock 的聚合健康度與物品清單，避免漏看；抽屜支援一鍵切換至單一專注 Stock。
- **全域綜合通知與獨立 WebCal**：推播、Email 晨間摘要與鈴鐺預設跨 Stock 匯總；同時提供萬用日曆與單一 Stock 獨立日曆訂閱流。
- **既有資料零損失無縫遷移**：為現有使用者自動創建預設 Stock 並平滑關聯其既有 items。

## Capabilities

### New Capabilities
- `stock-spaces`: 支援 Stock 空間建立、編輯、解散、成員邀請、角色權限（Owner/Admin/Member/Viewer）及擁有權轉移（Transfer Ownership）。

### Modified Capabilities
- `item-tracking`: 物品改歸屬於特定 Stock，清單支援「全部匯總（All Stocks）」與單一 Stock 篩選，打卡與庫存操作記錄操作成員足跡。
- `notification-engine`: 通知系統支援跨 Stock 聚合通知與標籤區分（如 `[家庭] Brita濾芯今日到期`），並支援跨庫萬用 WebCal 與單庫獨立 WebCal。

## Impact

- **Database (D1)**: 新增 `stocks`、`stock_members`、`stock_invites` 表；`items` 表新增 `stock_id` 欄位並遷移關聯。
- **Backend (Hono API)**: 新增 `/api/stocks` 相關路由（CRUD、邀請、成員管理、轉讓擁有權），調整 `/api/items` 支援 `stock_id` 上下文與 `all` 聚合。
- **Frontend (React PWA)**: 頂部導覽列新增 Stock 快速切換器抽屜；設定頁新增成員管理面板；卡片呈現所屬 Stock 標籤。
- **Notifications**: 晨間 Email 摘要、Web Push 與 WebCal 支援跨庫聚合與分區顯示。
