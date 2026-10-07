import { Hono } from 'hono';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { HonoEnv } from '../types.ts';
import { requireAuth } from '../middleware/auth.ts';
import { getDb, apiKeys, stocks, stockMembers } from '../db/index.ts';
import { generateApiKey } from '../utils/apiKey.ts';

const app = new Hono<HonoEnv>();

app.use('*', requireAuth);
app.use('*', async (c, next) => {
  if (c.get('apiKey')) {
    return c.json({ error: 'API Key 無權限管理金鑰，請使用瀏覽器登入進行金鑰管理' }, 403);
  }
  await next();
});

/**
 * List all active and recently revoked API keys for the authenticated user
 */
app.get('/', async (c) => {
  const user = c.get('user')!;
  const db = getDb(c.env.DB);

  const rawKeys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      stockId: apiKeys.stockId,
      scopes: apiKeys.scopes,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
      revokedAt: apiKeys.revokedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, user.id))
    .orderBy(desc(apiKeys.createdAt));

  const keys = rawKeys.map((k) => ({
    id: k.id,
    name: k.name,
    keyPrefix: k.keyPrefix,
    stockId: k.stockId,
    scopes: k.scopes.split(',').map((s) => s.trim()),
    createdAt: k.createdAt,
    lastUsedAt: k.lastUsedAt,
    isRevoked: Boolean(k.revokedAt),
  }));

  return c.json({ keys, apiKeys: keys });
});

/**
 * Create a new API key.
 * Returns the plaintext `rawKey` ONLY in this response!
 */
app.post('/', async (c) => {
  const user = c.get('user')!;
  const db = getDb(c.env.DB);

  let body: { name?: string; stockId?: string; scopes?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '無效的 JSON 請求內容' }, 400);
  }

  const name = body.name?.trim();
  if (!name || name.length > 64) {
    return c.json({ error: '請輸入 1~64 字元的金鑰識別名稱' }, 400);
  }

  const stockId = body.stockId?.trim() || null;
  if (stockId) {
    // Verify user belongs to this stock space
    const [member] = await db
      .select()
      .from(stockMembers)
      .where(and(eq(stockMembers.stockId, stockId), eq(stockMembers.userId, user.id)))
      .limit(1);

    if (!member) {
      return c.json({ error: '指定的備品庫不存在或您沒有存取權限' }, 403);
    }
  }

  const scopes = body.scopes?.trim() || 'read,write';
  const { rawKey, keyPrefix, keyHash } = await generateApiKey();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(apiKeys).values({
    id,
    userId: user.id,
    name,
    keyPrefix,
    keyHash,
    stockId,
    scopes,
    createdAt: now,
    lastUsedAt: null,
    revokedAt: null,
  });

  return c.json(
    {
      apiKey: {
        id,
        name,
        keyPrefix,
        stockId,
        scopes,
        createdAt: now,
      },
      rawKey, // IMPORTANT: The user must copy this now; it cannot be retrieved later!
      message: '金鑰建立成功，請務必立即複製儲存，此明文金鑰將不再顯示。',
    },
    201
  );
});

/**
 * Revoke (soft delete) an API key
 */
app.delete('/:id', async (c) => {
  const user = c.get('user')!;
  const db = getDb(c.env.DB);
  const keyId = c.req.param('id');

  const [existing] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, user.id)))
    .limit(1);

  if (!existing) {
    return c.json({ error: '找不到該 API Key 或無權限操作' }, 404);
  }

  const now = new Date().toISOString();
  await db
    .update(apiKeys)
    .set({ revokedAt: now })
    .where(eq(apiKeys.id, keyId));

  return c.json({ success: true, message: 'API Key 已成功撤銷' });
});

export const apiKeysRouter = app;
export default app;

