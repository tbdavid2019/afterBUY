## Context

See `proposal.md` for background and product motivation. The system adopts a lightweight Cloudflare Edge Native architecture (Hono API + Vite React PWA) to achieve near-zero cold start, sub-millisecond KV caching, zero-cost R2 object storage, and serverless D1 SQLite relational storage, with seamless local development compatibility via SQLite/PostgreSQL driver abstraction.

## Goals / Non-Goals

**Goals:**
- Implement backend on **Hono (Cloudflare Workers)** for ultra-fast, lightweight API execution (<15KB bundle, ~0ms cold start).
- Implement frontend on **Vite + React 19 + TypeScript + Tailwind CSS** as a standalone mobile-first PWA.
- Implement storage tier with Cloudflare native primitives: **D1 (Relational Data)**, **KV (OTP / Rate Limit / Passkey Challenge)**, and **R2 (Item Photos & Receipts)**.
- Implement database abstraction via **Drizzle ORM** supporting both Cloudflare D1 (production) and local SQLite `local.db` / PostgreSQL (local development).
- Implement passwordless authentication via FIDO2/WebAuthn Passkey (Touch ID, Face ID, Windows Hello) with fallback to rate-limited 6-digit Email OTP.
- Provide a robust Phase 1 multi-channel notification pipeline (Web Push, RFC 5545 WebCal subscription with token rotation, Email digest), reserving VIP SMS for Phase 2.
- Solve calendar synchronization via dynamic `.ics` feeds with deterministic `UID`, incrementing `SEQUENCE`, and `STATUS:CANCELLED` soft-deletion tombstones.

**Non-Goals:**
- LINE Bot or Telegram Bot integrations (explicitly out of scope per user specification).
- Packaging into native iOS/Android app store binaries (pure PWA web deployment).

## Decisions

### 1. Technology Stack & Edge Architecture
- **Backend API**: Hono framework running on Cloudflare Workers (`src/api/`).
- **Frontend Client**: Vite + React 19 + TypeScript + Tailwind CSS + Lucide Icons (`src/client/`).
- **PWA & Service Worker**: `vite-plugin-pwa` with custom service worker managing offline caching and Web Push VAPID event listeners.
- **Cloudflare Edge Bindings**:
  - `env.DB`: Cloudflare D1 relational database.
  - `env.KV`: Cloudflare KV for transient state (OTP with 10m TTL, rate limit counters, WebAuthn challenge with 5m TTL, session cache).
  - `env.R2`: Cloudflare R2 object storage bucket for item photos, warranty receipts, and sticker icons.
  - `env.RESEND_API_KEY`: Transactional email token.
  - `env.VAPID_PUBLIC_KEY` / `env.VAPID_PRIVATE_KEY`: Web Push credentials.

### 2. Multi-Environment Database Abstraction (D1 & Local SQLite/Postgres)
- **ORM**: Drizzle ORM.
- **Driver Adapter Pattern** (`src/api/db/index.ts`):
  - In Cloudflare Edge runtime: `drizzle(env.DB)` using `drizzle-orm/d1`.
  - In Local Development runtime: `drizzle(new Database('local.db'))` using `drizzle-orm/better-sqlite3` or Wrangler local D1 emulation (`.wrangler/state/`).
  - Schema definitions use neutral SQLite-compatible column types easily mapped to PostgreSQL.

### 3. Passwordless Authentication Architecture
- **Passkey**: Implemented using `@simplewebauthn/browser` (client) and `@simplewebauthn/server` (Hono API).
  - RP ID set dynamically based on host header (e.g. `afterbuy.app` or `localhost`).
  - Registration/assertion challenges stored in `env.KV` with a 5-minute TTL.
- **Email OTP**: 6-digit numeric token generated via `crypto.randomInt(100000, 999999)`, hashed with HMAC/SHA-256 before storage in `env.KV` with a 10-minute TTL.
- **Rate Limiting**: Tracked via `env.KV` sliding window (1 req / 60s cooldown, 5 req / 24h quota).
- **User Provisioning**: Automatic upsert in D1 on OTP/Passkey verification; session cookie issued with HTTP-only, SameSite=Lax flags.

### 4. WebCal (iCalendar) Engine & RFC 5545 Sync Strategy
- **Endpoint**: Hono route `/api/calendar/:token.ics` serving `text/calendar; charset=utf-8`.
- **Token Security & Rotation**: 32-byte hex token in `users.calendar_token`. Users can revoke and regenerate at any time.
- **Unique Identification**: Each item has a persistent UUID formatted as `UID:item-{itemId}@afterbuy.app`.
- **Change Tracking**: Each item records an integer `calendar_sequence` initialized to `0`. Increments whenever due date or title changes.
- **Deletion / Cancellation Handling**: Soft-deleted items emit `STATUS:CANCELLED` with incremented `SEQUENCE` retained for 30 days.
- **Alarms**: Every active VEVENT embeds a `VALARM` for local device alerts.

### 5. Item Lifecycle & Status Calculation Engine
- **Lifecycle Engine**:
  - Pure calculation modules (`src/shared/lifecycle.ts`) shared between frontend and backend.
  - `computeNextDueDate(item)`: Handles cycle days, PAO months, explicit expiration, and warranty dates.
  - `computeHealthStatus(item, currentDate)`: Computes percentage remaining and returns `healthy`, `due_soon`, `overdue`, or `out_of_stock`.
- **One-Tap Replacement Action**: Resets start date to current date, appends to `item_history`, decrements `backup_stock` by 1 if stock > 0, increments `calendar_sequence`.

### 6. Mobile-First UX / UI Design System
- **Layout Shell**: Mobile bottom navigation bar (`pb-safe` for iOS Home Bar), sticky action headers, desktop side rail when viewport >= 1024px.
- **Views**:
  - `Dashboard (總覽)`: Urgency-sorted cards with circular/linear progress bars and one-tap "+1 Replaced" action.
  - `Timeline (時程)`: Monthly/Weekly milestone view of upcoming replacements.
  - `Shopping (補貨)`: Out-of-stock and low-stock replenishment list with one-tap restock counters.
  - `Settings (設定)`: 1-click WebCal subscription URL copy, Web Push toggle, Passkey device list, and calendar token reset.

### 7. DevOps & Scheduled Cron
- **Local Dev**: `wrangler dev` (simulating D1, KV, R2 locally) + Vite dev server with proxy.
- **Deployment**: Cloudflare Pages / Workers via `wrangler deploy`.
- **Automated Cron**: Cloudflare Scheduled Trigger calling the notification dispatcher daily at 00:00 UTC (08:00 AM UTC+8).

## Risks / Trade-offs

- **[Risk: iOS Safari tab users missing Web Push]**
  - *Mitigation*: Promote WebCal subscription as primary zero-install solution on iOS, and offer Email digest backup.
- **[Risk: Stale calendar events in third-party calendar apps]**
  - *Mitigation*: Strictly output RFC 5545 `SEQUENCE` increments and `STATUS:CANCELLED` events.
- **[Risk: Calendar Token Leak]**
  - *Mitigation*: Provide 1-click "Regenerate Calendar URL" button in security settings to revoke compromised tokens immediately.
