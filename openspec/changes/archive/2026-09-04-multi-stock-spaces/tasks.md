## 1. Database Schema & Data Migration

- [x] 1.1 Define `stocks`, `stock_members`, and `stock_invites` tables in `src/api/db/schema.ts`, and add `stock_id` and `created_by_user_id` to `items`
- [x] 1.2 Generate Drizzle migration `0003_stocks_and_collaboration.sql` and verify migration SQL structure
- [x] 1.3 Implement zero-loss backfill migration script for existing users and test against local and remote D1 databases

## 2. Backend Stock Management API & RBAC

- [x] 2.1 Implement `/api/stocks` CRUD routes (list accessible stocks, create stock, update stock metadata, delete stock) with RBAC authorization
- [x] 2.2 Implement `/api/stocks/:id/transfer-ownership` endpoint with atomic transaction and validation
- [x] 2.3 Implement `/api/stocks/:id/invites` (create invite code) and `/api/stocks/join` (join via code or link)
- [x] 2.4 Update `/api/items` endpoints to support `stockId` query parameter and aggregate `all` mode, verifying RBAC on create/edit/delete/replace

## 3. Notifications & Multi-Calendar Feed Updates

- [x] 3.1 Update RFC 5545 WebCal generator to support All-in-One calendar and individual Stock calendar feeds with Stock name prefixing
- [x] 3.2 Update daily morning email digest and Web Push notification dispatch to group reminders by Stock name
- [x] 3.3 Add automated integration tests for Stock RBAC, ownership transfer, and All-in-One aggregation

## 4. Frontend Stock Switcher & Collaborative UI

- [x] 4.1 Update shared types and client API functions for Stock management, invites, and ownership transfer
- [x] 4.2 Build `StockSwitcher` dropdown/bottom drawer component in `Header.tsx` supporting "All Stocks" and individual Stocks
- [x] 4.3 Build `StockSettingsModal` for managing members, generating invite links, and executing ownership transfer
- [x] 4.4 Update `ItemCard`, `ItemModal`, and `DashboardView` to display Stock tags and filter by selected Stock

## 5. End-to-End Verification & Documentation

- [x] 5.1 Run full unit and integration test suite (`npm test`) and type check (`npx tsc --noEmit`)
- [x] 5.2 Test multi-user collaboration flow (create stock, invite family member, test ownership transfer, verify "All Stocks" aggregate dashboard)
- [x] 5.3 Update `CHANGELOG.md` with date-based format and update `README.md`
