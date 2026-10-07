import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { HonoEnv } from './types.ts';
import { authRouter } from './routes/auth.ts';
import { itemsRouter } from './routes/items.ts';
import { calendarRouter } from './routes/calendar.ts';
import { notificationsRouter, dispatchScheduledNotifications } from './routes/notifications.ts';
import { uploadRouter } from './routes/upload.ts';
import { stocksRouter } from './routes/stocks.ts';
import { apiKeysRouter } from './routes/apiKeys.ts';
import { agentApiRouter } from './routes/agentApi.ts';
import { LLMS_TXT, LLMS_FULL_TXT, SKILL_MD } from './docs/skillDoc.ts';

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

// Serve full LLM system documentation
app.get('/llms-full.txt', (c) => {
  return c.text(LLMS_FULL_TXT, 200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'public, max-age=3600',
  });
});

app.get('/.well-known/llms-full.txt', (c) => {
  return c.text(LLMS_FULL_TXT, 200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'public, max-age=3600',
  });
});

// Serve Agent Skill specification
app.get('/skill.md', (c) => {
  return c.text(SKILL_MD, 200, {
    'Content-Type': 'text/markdown; charset=utf-8',
    'Cache-Control': 'public, max-age=3600',
  });
});

app.get('/.well-known/skill.md', (c) => {
  return c.text(SKILL_MD, 200, {
    'Content-Type': 'text/markdown; charset=utf-8',
    'Cache-Control': 'public, max-age=3600',
  });
});

// Mount API routes
app.route('/api/auth', authRouter);
app.route('/api/keys', apiKeysRouter);
app.route('/api/v1', agentApiRouter);
app.route('/api/stocks', stocksRouter);
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
