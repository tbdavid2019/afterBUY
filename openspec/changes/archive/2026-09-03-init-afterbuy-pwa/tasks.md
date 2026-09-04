## 1. Project Initialization & Cloudflare Edge Setup

- [x] 1.1 Initialize project structure with Hono backend (`src/api`), Vite + React 19 frontend (`src/client`), TypeScript, Tailwind CSS, and Lucide icons
- [x] 1.2 Configure `wrangler.toml` with Cloudflare D1, KV, and R2 bindings, `.env.example`, `.gitignore`, and local dev proxy
- [x] 1.3 Create Drizzle ORM schema with adapter support for both Cloudflare D1 and local SQLite (`local.db`) / PostgreSQL, and verify migration scripts
- [x] 1.4 Configure PWA Web App Manifest (`manifest.json`), service worker via `vite-plugin-pwa`, app icons, and mobile viewport meta tags

## 2. Passwordless Authentication (Passkey + Email OTP on KV)

- [x] 2.1 Implement Email OTP generation, HMAC hashing, rate limiting (1 req/min, 5 req/day) via Cloudflare KV with 10-minute TTL, and Resend email dispatch
- [x] 2.2 Implement WebAuthn Passkey registration and assertion endpoints using `@simplewebauthn` with challenges stored in Cloudflare KV
- [x] 2.3 Build mobile-first Auth UI with seamless Email OTP input form and 1-tap Passkey Face ID / Touch ID prompt
- [x] 2.4 Implement secure HTTP-only session cookie management and user auto-provisioning in D1

## 3. Item Tracking & Lifecycle Computation

- [x] 3.1 Implement Item CRUD API endpoints in Hono with validation and user data isolation
- [x] 3.2 Implement pure lifecycle calculation utilities in `src/shared/lifecycle.ts` (cycle days countdown, PAO opening months, warranty expiry)
- [x] 3.3 Implement one-tap "Mark Replaced Today" API action that resets lifecycle timer, decrements backup stock, and records replacement history
- [x] 3.4 Implement dynamic item health status computation (`healthy`, `due_soon`, `overdue`, `out_of_stock`) and urgency sorting

## 4. Multi-Channel Notification Engine (Phase 1 MVP)

- [x] 4.1 Implement Web Push VAPID subscription registration and background push dispatch handler
- [x] 4.2 Implement RFC 5545 WebCal calendar feed (`/api/calendar/:token.ics`) with stable `UID`, incremented `SEQUENCE`, `STATUS:CANCELLED` 30-day tombstone support, and token rotation/revocation API
- [x] 4.3 Implement Email notification alert builder and morning digest dispatcher via Resend API
- [x] 4.4 Implement Cloudflare R2 image upload endpoint for item photos and warranty receipts

## 5. Mobile-First RWD UI & Design Polish

- [x] 5.1 Build mobile-first responsive app shell with sticky bottom navigation (`pb-safe` iOS Home Bar support) and desktop side rail
- [x] 5.2 Build item list and status card UI featuring circular/linear lifespan progress indicators, color-coded health badges, and category presets
- [x] 5.3 Build Shopping & Backup Stock replenishment view with one-tap repurchase counters
- [x] 5.4 Build Settings & Notification Center with 1-click WebCal subscription URL copy, Web Push toggle, and Passkey device manager

## 6. DevOps, Deployment & Scheduled Cron

- [x] 6.1 Set up Cloudflare deployment scripts (`pnpm deploy`) and CI build verification
- [x] 6.2 Set up automated production D1 database migrations (`pnpm db:migrate`) and environment variable documentation
- [x] 6.3 Implement Cloudflare Scheduled Trigger Cron handler for automated daily morning alert dispatches
