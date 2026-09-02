## Why

Consumers frequently lose track of consumable replacement intervals (e.g., toothbrushes, water purifier filters, contact lenses, air conditioner filters), opening shelf life / expiration dates (cosmetics, skincare, medicines), warranty periods, and backup inventory. Existing native apps like 「該換了吧」(Shelfory) and 「買了之後」 require native app store installation and lack flexible multi-channel notification fallbacks for web users.

**afterBUY** aims to build a mobile-first, installable Progressive Web Application (PWA) with passwordless authentication (Passkey biometric + Email OTP) and a robust multi-channel notification architecture (Web Push, WebCal iCalendar subscription with RFC 5545 cancellation/sequence support, Email alerts, and VIP SMS) to ensure 100% notification deliverability without requiring complex third-party messaging bots.

## What Changes

- **Passwordless Authentication**: Support Touch ID / Face ID / Windows Hello via Passkey (WebAuthn / FIDO2) as well as 6-digit Email OTP login.
- **Item & Consumable Lifecycle Tracking**: Track usage cycles, replacement countdowns, warranty expirations, period-after-opening (PAO), and backup spare stock count with one-tap replacement reset.
- **Multi-Channel Notification Architecture**:
  - **PWA Web Push**: Background notifications via Service Worker (VAPID) on desktop, Android, and iOS 16.4+ (when added to Home Screen).
  - **WebCal / iCal Sync Feed**: Dynamic `.ics` calendar subscription feed with RFC 5545 compliance, maintaining stable `UID`, incrementing `SEQUENCE`, and issuing `STATUS:CANCELLED` when reminders are updated/deleted to avoid orphaned calendar events.
  - **Email Alerts**: Periodic digest and imminent due date warning emails.
  - **SMS Alerts**: VIP/paid membership integration for critical SMS notifications.
- **Mobile-First Responsive Design (PWA)**: App-like UI with bottom navigation, status progress indicators (Good / Soon / Due / Out of Stock), dark/light mode, and offline capability.

## Capabilities

### New Capabilities
- `auth-passwordless`: FIDO2/WebAuthn Passkey registration & assertion, along with Email 6-digit OTP passwordless login and session management.
- `item-tracking`: Item lifecycle records (cycles, expiration, PAO, warranty, inventory counts, categories, and item status computation).
- `notification-engine`: Multi-channel notification dispatcher handling Web Push, WebCal subscription endpoint (with UID/SEQUENCE/STATUS:CANCELLED), Email digest/alerts, and VIP SMS.
- `pwa-mobile-ui`: Mobile-first responsive UI, PWA manifest, service worker lifecycle, and dashboard interactions.

### Modified Capabilities
<!-- None: new greenfield project -->

## Impact

- **Frontend**: Responsive React/Next.js/PWA UI with Tailwind CSS, Lucide icons, and Service Worker.
- **Backend / DB**: Edge API / Serverless endpoints, PostgreSQL/D1 schema for users, passkey credentials, items, notification logs, and subscriptions.
- **Protocols & Standards**: WebAuthn Level 3, RFC 5545 (iCalendar), RFC 8030 (Generic Event Delivery Using Web Push / VAPID).
- **External Dependencies**: Web Push VAPID, Email sending provider (e.g. Resend), SMS provider gateway (for VIP tier).
