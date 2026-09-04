# Technical Design: Batch Operations, i18n Localization & Item Category Expansion

## Context
See `proposal.md` for the core motivation. The current implementation supports single-item management and Traditional Chinese UI. Expanding to batch operations, i18n, and richer item metadata requires cohesive updates across the database schema, Hono API routes, and React client views while preserving PWA lightweight performance (<300KB bundle).

## Goals / Non-Goals

**Goals:**
- Provide zero-dependency lightweight i18n supporting Traditional Chinese (`zh-TW`) and English (`en`) with instant toggling and local persistence.
- Provide seamless mobile multi-photo upload to Cloudflare R2 and draft creation.
- Support atomic batch replacement and stock updates via Cloudflare D1 batch operations.
- Expand schema with `price` and `spec_model` fields, and add preset templates (Printer Ink, Vitamin C, Batteries, Filters).

**Non-Goals:**
- Multi-currency conversion (store currency as plain value with user symbol).
- AI automatic image recognition (keep simple and fast for users to review their photos).

## Decisions

### 1. Lightweight React i18n Context vs. External Libraries
- **Decision**: Implement a custom React context (`src/client/i18n/`) with TypeScript key checking instead of importing `i18next` / `react-intl`.
- **Rationale**: Keeps PWA bundle lean (<5KB overhead), eliminates external dependencies, and provides instant reactivity when toggling between `zh-TW` and `en`.
- **Alternatives Considered**: `react-i18next` (adds ~40KB minified and unnecessary async loading complexity).

### 2. Batch Operations Architecture & D1 Transactions
- **Decision**:
  - Expose `POST /api/items/batch-replace` accepting `{ itemIds: string[] }`.
  - Expose `POST /api/items/batch-stock` accepting `{ itemIds: string[], delta: number }`.
  - Expose `POST /api/upload/batch` accepting multiple image files.
- **Rationale**: Running batch updates on the server prevents multiple sequential roundtrips over mobile networks and leverages Cloudflare D1 batch execution for atomicity.
- **Alternatives Considered**: Client-side sequential loops (slow, vulnerable to partial network failures).

### 3. Database Schema Evolution
- **Decision**: Add nullable columns `price` (integer / real) and `spec_model` (text) to the `items` table via Drizzle migration.
- **Rationale**: Backward compatible with all existing D1 records; requires no data migration script.

### 4. UI Multi-Select State Machine
- **Decision**: Introduce a `selectionMode: boolean` and `selectedIds: Set<string>` in `DashboardView` and `ShoppingView`. When `selectionMode` is active:
  - Item cards display selection checkboxes instead of immediate action triggers.
  - The fixed bottom navigation is replaced with a floating action bar showing: `[N items selected]`, `[Batch Replace]`, `[+ Stock]`, `[Delete]`, and `[Cancel]`.

## Risks / Trade-offs

- **[Risk] Large Batch Uploads on Mobile Network** → Mitigation: Compress photos client-side on canvas or limit batch intake to max 10 photos per run with parallel uploading.
- **[Risk] Schema Migration on Remote D1** → Mitigation: Generate standard SQLite migration (`ALTER TABLE items ADD COLUMN ...`) and apply via `pnpm db:migrate:ai360` and `pnpm db:migrate:david`.
