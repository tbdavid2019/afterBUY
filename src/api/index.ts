import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { HonoEnv } from './types.ts';
import { authRouter } from './routes/auth.ts';
import { itemsRouter } from './routes/items.ts';
import { calendarRouter } from './routes/calendar.ts';
import { notificationsRouter, dispatchScheduledNotifications } from './routes/notifications.ts';
import { uploadRouter } from './routes/upload.ts';

const LLMS_TXT = `# afterBUY

> **買了之後，別再忘記換！**
> afterBUY is a mobile-first Progressive Web Application (PWA) built for tracking personal item lifecycles, recurring consumable replacements (toothbrushes, water filters, contact lenses, air filters), period-after-opening (PAO) shelf life, warranty countdowns, and backup spare inventory.

## Core Capabilities
- [Item Lifecycle Tracking](https://afterbuy.app/): Interval replacement days countdown, PAO opening months, food/medicine expiry, and appliance warranties.
- [One-Tap Replacement & Inventory Deduction](https://afterbuy.app/): One-tap "Replaced Today" action resets countdown timer, decrements backup stock, and records historical log.
- [Passwordless Authentication](https://afterbuy.app/): WebAuthn / FIDO2 Passkey (Touch ID / Face ID / Windows Hello) and 6-digit Email OTP with rate limiting.
- [RFC 5545 WebCal Calendar Feed](https://afterbuy.app/): Private .ics calendar subscription with deterministic UID, incrementing SEQUENCE, and 30-day STATUS:CANCELLED soft-deletion tombstones for zero stale calendar events.
- [Multi-Channel Notifications](https://afterbuy.app/): PWA Web Push (VAPID), Daily Email Morning Digest (Resend), and Cloudflare Scheduled Cron Triggers.

## Technology Stack
- Edge Backend: Hono running on Cloudflare Workers (<15KB, ~0ms cold start).
- Storage Tier: Cloudflare D1 (Relational SQLite), Cloudflare KV (Rate limits, OTP, Passkey challenge), Cloudflare R2 (Photos & receipts).
- Frontend PWA: React 19 + TypeScript + Tailwind CSS + vite-plugin-pwa.
- Database ORM: Drizzle ORM (multi-environment compatibility for Cloudflare D1, local SQLite, and PostgreSQL).

## Repository & Links
- [GitHub Repository](https://github.com/tbdavid2019/afterBUY): Source code licensed under GNU Affero General Public License v3.0 (AGPL-3.0).
- [Full Documentation](https://afterbuy.app/llms-full.txt): Complete technical specification, API schemas, and data structures.
`;

const app = new Hono<HonoEnv>();

app.use('*', logger());
app.use(
  '*',
  cors({
    origin: (origin, c) => {
      const allowed = c.env.APP_ORIGIN || 'http://localhost:5173';
      if (!origin) return allowed;
      if (origin === allowed) return origin;
      if (
        origin.endsWith('.workers.dev') ||
        origin.includes('localhost') ||
        origin.endsWith('david888.com') ||
        origin.endsWith('aicreate360.ai') ||
        origin.endsWith('create360.ai')
      ) {
        return origin;
      }
      return allowed;
    },
    credentials: true,
  })
);

// Serve llmstxt.org specification
app.get('/llms.txt', (c) => {
  return c.text(LLMS_TXT, 200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'public, max-age=3600',
  });
});

app.get('/.well-known/llms.txt', (c) => {
  return c.text(LLMS_TXT, 200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'public, max-age=3600',
  });
});

// Mount API routes
app.route('/api/auth', authRouter);
app.route('/api/items', itemsRouter);
app.route('/api/calendar', calendarRouter);
app.route('/api/notifications', notificationsRouter);
app.route('/api', uploadRouter);

// Global Error Handler (Guarantees CORS headers and clean JSON error response)
app.onError((err, c) => {
  console.error('Unhandled API Error:', err);
  return c.json(
    { error: err.message || '伺服器內部錯誤' },
    err.name === 'HTTPException' ? (err as any).status : 500
  );
});

// Respond to WebMCP inspector calls gracefully (prevents 404 in client console)
app.all('/mcp', (c) => {
  return c.json({ jsonrpc: '2.0', result: { tools: [] } });
});

// Root health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', name: 'afterBUY API', timestamp: new Date().toISOString() });
});

// Cloudflare Workers entry with Scheduled Cron Handler
export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: HonoEnv['Bindings'], ctx: ExecutionContext) {
    ctx.waitUntil(dispatchScheduledNotifications(env));
  },
};
