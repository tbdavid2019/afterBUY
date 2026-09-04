# Implementation Tasks: Batch Operations, i18n & Category Expansion

## 1. Schema Evolution & Backend Batch APIs

- [x] 1.1 Add `price` and `spec_model` columns to `items` table in `src/api/db/schema.ts` and generate Drizzle migration file
- [x] 1.2 Implement `POST /api/items/batch-replace` and `POST /api/items/batch-stock` in `src/api/routes/items.ts` with atomic transaction handling
- [x] 1.3 Implement `POST /api/upload/batch` in `src/api/routes/upload.ts` supporting concurrent multi-file uploads to Cloudflare R2
- [x] 1.4 Add unit tests for batch replacement logic, stock calculation, and price storage in `tests/` and verify `npm test` passes

## 2. Item Categories & Preset Expansion

- [x] 2.1 Add `clothing` category and new item templates in `src/client/utils/category.ts` (Underwear 內褲, Bra 內衣, Socks 襪子, Helmet 安全帽, Printer Ink 印表機墨水, Vitamin C 維他命C, Batteries 電池, Air Filters 濾網) with default lifespans and icons
- [x] 2.2 Update `ItemModal.tsx` and `ItemCard.tsx` to display and edit `price` (購買金額) and `specModel` (規格型號)
- [x] 2.3 Verify item creation, editing, and price/model display across dashboard views

## 3. i18n Bilingual System (zh-TW & en)

- [x] 3.1 Create typed translation dictionaries (`zh-TW` and `en`) covering navigation, statuses, template categories, buttons, and alert messages
- [x] 3.2 Implement lightweight `I18nProvider` with `useTranslation` hook and `localStorage` persistence
- [x] 3.3 Add language toggle selector in navigation header and settings view, and wrap app views with localized labels
- [x] 3.4 Verify language switching updates all text dynamically without page reload

## 4. Mobile Multi-Photo Capture & Batch UI

- [x] 4.1 Build `BatchPhotoModal` supporting mobile camera capture (`capture="environment"` / `multiple`), thumbnail previews, and parallel R2 upload
- [x] 4.2 Implement multi-select mode in `DashboardView` and `ShoppingView` with checkbox selection and floating action bar
- [x] 4.3 Wire batch actions ("Replaced Today" for all selected, batch stock increment, batch deletion) to the backend batch API
- [x] 4.4 Verify mobile touch interactions, smooth transitions, and tactile feedback

## 5. Verification & Cloudflare Dual-Account Deployment

- [x] 5.1 Run full automated test suite (`npm test`) and system verification script (`npm run verify`)
- [x] 5.2 Apply database schema migrations to both remote Cloudflare D1 accounts (`pnpm db:migrate:ai360` and `pnpm db:migrate:david`)
- [x] 5.3 Deploy production build to both Cloudflare accounts (`pnpm deploy:all`) and verify on custom domains
