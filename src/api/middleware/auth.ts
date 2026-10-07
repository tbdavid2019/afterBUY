import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import { eq, and, isNull } from 'drizzle-orm';
import { HonoEnv } from '../types.ts';
import { verifySessionToken } from '../utils/auth.ts';
import { hashApiKey, isValidApiKeyFormat } from '../utils/apiKey.ts';
import { getDb, apiKeys, users } from '../db/index.ts';

export const requireAuth = createMiddleware<HonoEnv>(async (c, next) => {
  // 1. Check Authorization Bearer header (for API Keys)
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();

    if (isValidApiKeyFormat(token)) {
      // API Keys are strictly designated for the Agent API (/api/v1/*)
      const path = c.req.path;
      if (!path.startsWith('/api/v1')) {
        return c.json({ error: 'API Key 僅限調用 /api/v1/* 外部 Agent 接口' }, 403);
      }

      const db = getDb(c.env.DB);
      const keyHash = await hashApiKey(token);

      const [keyRecord] = await db
        .select()
        .from(apiKeys)
        .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
        .limit(1);

      if (!keyRecord) {
        return c.json({ error: '無效或已撤銷的 API Key (Invalid or revoked API key)' }, 401);
      }

      // Find owning user
      const [userRecord] = await db
        .select()
        .from(users)
        .where(eq(users.id, keyRecord.userId))
        .limit(1);

      if (!userRecord) {
        return c.json({ error: 'API Key 所屬使用者不存在' }, 401);
      }

      // Update lastUsedAt with debounce (every 5 minutes at most)
      const now = new Date();
      const lastUsed = keyRecord.lastUsedAt ? new Date(keyRecord.lastUsedAt).getTime() : 0;
      if (now.getTime() - lastUsed > 5 * 60 * 1000) {
        try {
          await db
            .update(apiKeys)
            .set({ lastUsedAt: now.toISOString() })
            .where(eq(apiKeys.id, keyRecord.id));
        } catch {
          // Non-blocking write failure
        }
      }

      c.set('user', {
        id: userRecord.id,
        email: userRecord.email,
        isVip: Boolean(userRecord.isVip),
      });
      c.set('apiKey', keyRecord);
      await next();
      return;
    }
  }

  // 2. Check Cookie Session Token
  const sessionToken = getCookie(c, 'afterbuy_session');
  if (sessionToken) {
    const user = await verifySessionToken(sessionToken, c.env.SESSION_SECRET);
    if (user) {
      c.set('user', user);
      await next();
      return;
    }
    return c.json({ error: '登入憑據無效或已過期' }, 401);
  }

  return c.json({ error: '請先登入或提供有效的 API Key (Authorization: Bearer ab_live_...)' }, 401);
});

