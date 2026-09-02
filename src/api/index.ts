import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { HonoEnv } from './types.ts';
import { authRouter } from './routes/auth.ts';
import { itemsRouter } from './routes/items.ts';
import { calendarRouter } from './routes/calendar.ts';
import { notificationsRouter, dispatchScheduledNotifications } from './routes/notifications.ts';
import { uploadRouter } from './routes/upload.ts';

const app = new Hono<HonoEnv>();

app.use('*', logger());
app.use(
  '*',
  cors({
    origin: (origin, c) => {
      const allowed = c.env.APP_ORIGIN || 'http://localhost:5173';
      return origin === allowed ? origin : allowed;
    },
    credentials: true,
  })
);

// Mount API routes
app.route('/api/auth', authRouter);
app.route('/api/items', itemsRouter);
app.route('/api/calendar', calendarRouter);
app.route('/api/notifications', notificationsRouter);
app.route('/api', uploadRouter);

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
