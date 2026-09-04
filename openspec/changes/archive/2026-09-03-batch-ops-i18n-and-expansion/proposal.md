# Proposal: Batch Operations, i18n Localization & Item Category Expansion

## Why
afterBUY has successfully launched on Cloudflare with passwordless authentication (Passkey & OTP) and single-item lifecycle tracking. To elevate user efficiency for real-world household management, users frequently need to record multiple consumables at once (e.g., weekend chore replacing filters, toothbrush, and sponge simultaneously), photograph and intake multiple items in batch, track item purchase prices, and use the application in English.

## What Changes
1. **Batch Photo Capture & Intake**: Support capturing or selecting multiple photos simultaneously from mobile cameras/files, batch uploading to Cloudflare R2, and rapidly provisioning item drafts.
2. **Batch Item Operations**: Support multi-select mode in dashboard/inventory with a floating action bar to execute batch "Replaced Today", batch stock adjustments (+/-), and batch deletion.
3. **i18n Bilingual Support (zh-TW & en)**: Full internationalization support with instant language toggle in header and settings, local persistence, and localized dates/relative times.
4. **Item Category & Preset Expansion**:
   - Add new category: Clothing & Wearables (`clothing` 貼身穿戴).
   - Add new preset templates: Underwear (貼身內褲 90~180天), Bra/Undershirt (貼身內衣 180~365天), Socks (運動襪/棉襪 90~180天), Motorcycle Helmet (機車安全帽 3年/1095天安全換新), Printer Ink (印表機墨水), Vitamin C / Supplements (維他命C / 保健品), Batteries (乾電池 / 充電電池), and Air Filter Elements (清淨機 / 除濕機濾網).
   - Add optional `price` (購買金額) and `specModel` (規格型號) fields to schema and UI for cost tracking and reordering reference.

## Capabilities

### New Capabilities
- `i18n-localization`: Multi-language dictionary and runtime provider supporting `zh-TW` and `en`, language switching controls, and localized dates/countdown formats.
- `batch-operations`: Multi-select interface, batch photo uploading to R2, and transactional batch replacement/stock updates.

### Modified Capabilities
- `item-tracking`: Add `price` and `specModel` attributes, expanded preset catalogue (Ink, Supplements, Batteries), and transactional batch endpoint `/api/items/batch-replace`.
- `pwa-mobile-ui`: Add multi-select toggle and floating action bar, batch camera upload controls, and language switch toggle.

## Impact
- **Backend API**: New routes `POST /api/items/batch-replace`, `POST /api/items/batch-update`, `POST /api/upload/batch`.
- **Database**: Drizzle schema migration adding optional `price` (numeric/integer cents) and `spec_model` (text) to `items` table.
- **Frontend**: Lightweight React i18n context (zero heavy bloat), multi-select state management in `DashboardView` & `ShoppingView`.
