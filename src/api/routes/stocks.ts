import { Hono } from 'hono';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { HonoEnv } from '../types.ts';
import { requireAuth } from '../middleware/auth.ts';
import { getDb, stocks, stockMembers, stockInvites, items, users } from '../db/index.ts';
import { StockResponse, StockMemberResponse, StockRole } from '../../shared/types.ts';

export const stocksRouter = new Hono<HonoEnv>();

stocksRouter.use('*', requireAuth);

/**
 * Helper to ensure a user has at least one default Stock space.
 * Performs auto-provisioning and backs up unassigned items.
 */
export async function ensureUserDefaultStock(db: any, user: { id: string; email: string }) {
  const existingMembership = await db
    .select()
    .from(stockMembers)
    .where(eq(stockMembers.userId, user.id))
    .all();

  if (existingMembership.length > 0) {
    // Check if any legacy items lack stock_id
    const unassignedItems = await db
      .select({ id: items.id })
      .from(items)
      .where(and(eq(items.userId, user.id), isNull(items.stockId)))
      .all();

    if (unassignedItems.length > 0) {
      const targetStockId = existingMembership[0].stockId;
      for (const it of unassignedItems) {
        await db
          .update(items)
          .set({ stockId: targetStockId, createdByUserId: user.id })
          .where(eq(items.id, it.id))
          .run();
      }
    }
    return existingMembership[0].stockId;
  }

  // Provision new default Stock
  const stockId = crypto.randomUUID();
  const calendarToken = crypto.randomUUID().replace(/-/g, '');
  const now = new Date().toISOString();

  await db.insert(stocks).values({
    id: stockId,
    name: '甜蜜的家',
    icon: '🏠',
    description: '日常家庭耗材與生活用品',
    ownerId: user.id,
    calendarToken,
    createdAt: now,
    updatedAt: now,
  }).run();

  await db.insert(stockMembers).values({
    id: crypto.randomUUID(),
    stockId,
    userId: user.id,
    role: 'owner',
    nickname: '擁有者',
    createdAt: now,
  }).run();

  // Backfill items
  const unassigned = await db
    .select({ id: items.id })
    .from(items)
    .where(and(eq(items.userId, user.id), isNull(items.stockId)))
    .all();

  for (const it of unassigned) {
    await db
      .update(items)
      .set({ stockId, createdByUserId: user.id })
      .where(eq(items.id, it.id))
      .run();
  }

  return stockId;
}

// 1. List all accessible Stocks for the current user
stocksRouter.get('/', async (c) => {
  const user = c.get('user')!;
  const db = getDb(c.env.DB);

  await ensureUserDefaultStock(db, user);

  // Fetch all stocks user is a member of
  const memberships = await (db as any)
    .select({
      stockId: stockMembers.stockId,
      role: stockMembers.role,
      nickname: stockMembers.nickname,
      stockName: stocks.name,
      stockIcon: stocks.icon,
      stockDescription: stocks.description,
      ownerId: stocks.ownerId,
      calendarToken: stocks.calendarToken,
      createdAt: stocks.createdAt,
      updatedAt: stocks.updatedAt,
      deletedAt: stocks.deletedAt,
    })
    .from(stockMembers)
    .innerJoin(stocks, eq(stockMembers.stockId, stocks.id))
    .where(and(eq(stockMembers.userId, user.id), isNull(stocks.deletedAt)))
    .all();

  const results: StockResponse[] = [];

  for (const m of memberships) {
    const memberCountRes = await (db as any)
      .select({ id: stockMembers.id })
      .from(stockMembers)
      .where(eq(stockMembers.stockId, m.stockId))
      .all();

    const itemCountRes = await (db as any)
      .select({ id: items.id })
      .from(items)
      .where(and(eq(items.stockId, m.stockId), isNull(items.deletedAt)))
      .all();

    results.push({
      id: m.stockId,
      name: m.stockName,
      icon: m.stockIcon,
      description: m.stockDescription,
      ownerId: m.ownerId,
      calendarToken: m.calendarToken,
      myRole: m.role as StockRole,
      memberCount: memberCountRes.length,
      itemCount: itemCountRes.length,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    });
  }

  return c.json({ stocks: results });
});

// 2. Create a new Stock
stocksRouter.post('/', async (c) => {
  const user = c.get('user')!;
  const db = getDb(c.env.DB);
  const body = await c.req.json();

  const name = String(body.name || '').trim();
  if (!name) {
    return c.json({ error: 'Stock 名称為必填' }, 400);
  }

  const stockId = crypto.randomUUID();
  const calendarToken = crypto.randomUUID().replace(/-/g, '');
  const now = new Date().toISOString();
  const icon = String(body.icon || '📦').trim() || '📦';
  const description = body.description ? String(body.description).trim() : null;

  await db.insert(stocks).values({
    id: stockId,
    name,
    icon,
    description,
    ownerId: user.id,
    calendarToken,
    createdAt: now,
    updatedAt: now,
  }).run();

  await db.insert(stockMembers).values({
    id: crypto.randomUUID(),
    stockId,
    userId: user.id,
    role: 'owner',
    nickname: body.nickname ? String(body.nickname).trim() : '建立者',
    createdAt: now,
  }).run();

  const createdStock: StockResponse = {
    id: stockId,
    name,
    icon,
    description,
    ownerId: user.id,
    calendarToken,
    myRole: 'owner',
    memberCount: 1,
    itemCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  return c.json({ stock: createdStock }, 201);
});

// 3. Get Stock details and member list
stocksRouter.get('/:id', async (c) => {
  const user = c.get('user')!;
  const db = getDb(c.env.DB);
  const stockId = c.req.param('id');

  // Verify membership
  const myMembership = await db
    .select()
    .from(stockMembers)
    .where(and(eq(stockMembers.stockId, stockId), eq(stockMembers.userId, user.id)))
    .get();

  if (!myMembership) {
    return c.json({ error: '您不是此 Stock 的成員' }, 403);
  }

  const stock = await db
    .select()
    .from(stocks)
    .where(and(eq(stocks.id, stockId), isNull(stocks.deletedAt)))
    .get();

  if (!stock) {
    return c.json({ error: 'Stock 不存在或已被刪除' }, 404);
  }

  const rawMembers = await (db as any)
    .select({
      id: stockMembers.id,
      stockId: stockMembers.stockId,
      userId: stockMembers.userId,
      role: stockMembers.role,
      nickname: stockMembers.nickname,
      createdAt: stockMembers.createdAt,
      email: users.email,
    })
    .from(stockMembers)
    .innerJoin(users, eq(stockMembers.userId, users.id))
    .where(eq(stockMembers.stockId, stockId))
    .all();

  const members: StockMemberResponse[] = rawMembers.map((m: any) => ({
    id: m.id,
    stockId: m.stockId,
    userId: m.userId,
    email: m.email,
    role: m.role as StockRole,
    nickname: m.nickname,
    createdAt: m.createdAt,
  }));

  const rawInvites = await db
    .select()
    .from(stockInvites)
    .where(eq(stockInvites.stockId, stockId))
    .orderBy(desc(stockInvites.createdAt))
    .all();

  const origin = c.env.APP_ORIGIN || new URL(c.req.url).origin;
  const invites: StockInviteResponse[] = rawInvites.map((inv) => ({
    id: inv.id,
    stockId: inv.stockId,
    code: inv.code,
    role: inv.role as StockRole,
    expiresAt: inv.expiresAt,
    usedCount: inv.usedCount,
    maxUses: inv.maxUses,
    inviteUrl: `${origin}/?joinStock=${inv.code}`,
  }));

  const stockResponse: StockResponse = {
    id: stock.id,
    name: stock.name,
    icon: stock.icon,
    description: stock.description,
    ownerId: stock.ownerId,
    calendarToken: stock.calendarToken,
    myRole: myMembership.role as StockRole,
    memberCount: members.length,
    createdAt: stock.createdAt,
    updatedAt: stock.updatedAt,
  };

  return c.json({ stock: stockResponse, members, invites });
});

// 4. Update Stock metadata (owner or admin only)
stocksRouter.put('/:id', async (c) => {
  const user = c.get('user')!;
  const db = getDb(c.env.DB);
  const stockId = c.req.param('id');
  const body = await c.req.json();

  const myMembership = await db
    .select()
    .from(stockMembers)
    .where(and(eq(stockMembers.stockId, stockId), eq(stockMembers.userId, user.id)))
    .get();

  if (!myMembership || (myMembership.role !== 'owner' && myMembership.role !== 'admin')) {
    return c.json({ error: '只有 Owner 或 Admin 可以修改此 Stock' }, 403);
  }

  const updates: any = { updatedAt: new Date().toISOString() };
  if (body.name !== undefined) updates.name = String(body.name).trim();
  if (body.icon !== undefined) updates.icon = String(body.icon).trim() || '📦';
  if (body.description !== undefined) updates.description = String(body.description).trim() || null;

  await db.update(stocks).set(updates).where(eq(stocks.id, stockId)).run();

  return c.json({ success: true, message: 'Stock 已更新' });
});

// 5. Delete Stock (owner only)
stocksRouter.delete('/:id', async (c) => {
  const user = c.get('user')!;
  const db = getDb(c.env.DB);
  const stockId = c.req.param('id');

  const stock = await db.select().from(stocks).where(eq(stocks.id, stockId)).get();
  if (!stock) return c.json({ error: 'Stock 不存在' }, 404);

  if (stock.ownerId !== user.id) {
    return c.json({ error: '只有 Owner 可以解散此 Stock' }, 403);
  }

  const now = new Date().toISOString();
  await db.update(stocks).set({ deletedAt: now }).where(eq(stocks.id, stockId)).run();
  await db.update(items).set({ deletedAt: now }).where(eq(items.stockId, stockId)).run();

  return c.json({ success: true, message: 'Stock 已成功解散' });
});

// 6. Leave Stock (non-owner members)
stocksRouter.post('/:id/leave', async (c) => {
  const user = c.get('user')!;
  const db = getDb(c.env.DB);
  const stockId = c.req.param('id');

  const stock = await db.select().from(stocks).where(eq(stocks.id, stockId)).get();
  if (!stock) return c.json({ error: 'Stock 不存在' }, 404);

  if (stock.ownerId === user.id) {
    return c.json({ error: 'Owner 無法直接退出，請先轉讓擁有權或解散此 Stock' }, 400);
  }

  await db
    .delete(stockMembers)
    .where(and(eq(stockMembers.stockId, stockId), eq(stockMembers.userId, user.id)))
    .run();

  return c.json({ success: true, message: '已成功退出此 Stock' });
});

// 7. Transfer Ownership (owner only, atomic transaction)
stocksRouter.post('/:id/transfer-ownership', async (c) => {
  const user = c.get('user')!;
  const db = getDb(c.env.DB);
  const stockId = c.req.param('id');
  const body = await c.req.json();
  const targetUserId = String(body.targetUserId || '').trim();

  if (!targetUserId) {
    return c.json({ error: '必須指定目標成員 targetUserId' }, 400);
  }

  if (targetUserId === user.id) {
    return c.json({ error: '不能將擁有權轉讓給自己' }, 400);
  }

  const stock = await db.select().from(stocks).where(eq(stocks.id, stockId)).get();
  if (!stock) return c.json({ error: 'Stock 不存在' }, 404);

  if (stock.ownerId !== user.id) {
    return c.json({ error: '只有當前 Owner 可以轉移擁有權' }, 403);
  }

  // Verify target is an existing member
  const targetMember = await db
    .select()
    .from(stockMembers)
    .where(and(eq(stockMembers.stockId, stockId), eq(stockMembers.userId, targetUserId)))
    .get();

  if (!targetMember) {
    return c.json({ error: '目標對象不是此 Stock 的成員，無法轉讓' }, 400);
  }

  const now = new Date().toISOString();

  // Atomically update:
  // 1. stocks.owner_id = targetUserId
  // 2. targetMember role = 'owner'
  // 3. current user role = 'admin'
  await db.update(stocks).set({ ownerId: targetUserId, updatedAt: now }).where(eq(stocks.id, stockId)).run();
  await db.update(stockMembers).set({ role: 'owner' }).where(and(eq(stockMembers.stockId, stockId), eq(stockMembers.userId, targetUserId))).run();
  await db.update(stockMembers).set({ role: 'admin' }).where(and(eq(stockMembers.stockId, stockId), eq(stockMembers.userId, user.id))).run();

  return c.json({ success: true, message: '擁有權已成功轉移，您已平滑轉為管理者 (Admin)' });
});

// 8. Generate Invite Code (owner or admin)
stocksRouter.post('/:id/invites', async (c) => {
  const user = c.get('user')!;
  const db = getDb(c.env.DB);
  const stockId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));

  const myMembership = await db
    .select()
    .from(stockMembers)
    .where(and(eq(stockMembers.stockId, stockId), eq(stockMembers.userId, user.id)))
    .get();

  if (!myMembership || (myMembership.role !== 'owner' && myMembership.role !== 'admin')) {
    return c.json({ error: '只有 Owner 或 Admin 可以邀請新成員' }, 403);
  }

  const targetRole = (body.role === 'admin' || body.role === 'viewer') ? body.role : 'member';
  const code = crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase();
  const days = Number(body.expiresInDays) || 7;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const maxUses = Number(body.maxUses) || 10;
  const now = new Date().toISOString();

  const inviteId = crypto.randomUUID();
  await db.insert(stockInvites).values({
    id: inviteId,
    stockId,
    code,
    role: targetRole,
    createdByUserId: user.id,
    expiresAt,
    usedCount: 0,
    maxUses,
    createdAt: now,
  }).run();

  const origin = c.env.APP_ORIGIN || new URL(c.req.url).origin;
  const inviteUrl = `${origin}/?joinStock=${code}`;

  const inviteObj: StockInviteResponse = {
    id: inviteId,
    stockId,
    code,
    role: targetRole,
    expiresAt,
    usedCount: 0,
    maxUses,
    inviteUrl,
  };

  return c.json({
    success: true,
    invite: inviteObj,
    code,
    role: targetRole,
    expiresAt,
    maxUses,
    inviteUrl,
  });
});

// 9. Join Stock via Invite Code
stocksRouter.post('/join', async (c) => {
  const user = c.get('user')!;
  const db = getDb(c.env.DB);
  const body = await c.req.json();
  const code = String(body.code || '').trim().toUpperCase();

  if (!code) {
    return c.json({ error: '請輸入邀請碼' }, 400);
  }

  const invite = await db.select().from(stockInvites).where(eq(stockInvites.code, code)).get();
  if (!invite) {
    return c.json({ error: '無效的邀請碼' }, 404);
  }

  if (new Date(invite.expiresAt).getTime() < Date.now()) {
    return c.json({ error: '此邀請碼已過期' }, 400);
  }

  if (invite.usedCount >= invite.maxUses) {
    return c.json({ error: '此邀請碼使用次數已達上限' }, 400);
  }

  const stock = await db.select().from(stocks).where(and(eq(stocks.id, invite.stockId), isNull(stocks.deletedAt))).get();
  if (!stock) {
    return c.json({ error: '此 Stock 已不存在' }, 404);
  }

  // Check if already a member
  const existing = await db
    .select()
    .from(stockMembers)
    .where(and(eq(stockMembers.stockId, invite.stockId), eq(stockMembers.userId, user.id)))
    .get();

  if (existing) {
    return c.json({ success: true, message: '您已經是此 Stock 的成員', stockId: stock.id });
  }

  const now = new Date().toISOString();
  await db.insert(stockMembers).values({
    id: crypto.randomUUID(),
    stockId: stock.id,
    userId: user.id,
    role: invite.role,
    nickname: body.nickname ? String(body.nickname).trim() : '新成員',
    createdAt: now,
  }).run();

  await db
    .update(stockInvites)
    .set({ usedCount: invite.usedCount + 1 })
    .where(eq(stockInvites.id, invite.id))
    .run();

  return c.json({
    success: true,
    message: `成功加入「${stock.name}」！`,
    stockId: stock.id,
    stockName: stock.name,
    icon: stock.icon,
  });
});

// 10. Update Member Role
stocksRouter.put('/:id/members/:memberUserId/role', async (c) => {
  const user = c.get('user')!;
  const db = getDb(c.env.DB);
  const stockId = c.req.param('id');
  const targetMemberUserId = c.req.param('memberUserId');
  const body = await c.req.json();
  const newRole = body.role as StockRole;

  if (!['admin', 'member', 'viewer'].includes(newRole)) {
    return c.json({ error: '不支援的角色類型' }, 400);
  }

  const myMembership = await db
    .select()
    .from(stockMembers)
    .where(and(eq(stockMembers.stockId, stockId), eq(stockMembers.userId, user.id)))
    .get();

  if (!myMembership || (myMembership.role !== 'owner' && myMembership.role !== 'admin')) {
    return c.json({ error: '權限不足' }, 403);
  }

  // Admin cannot promote to admin or change other admins
  if (myMembership.role === 'admin' && newRole === 'admin') {
    return c.json({ error: '只有 Owner 可以指派管理者 (Admin)' }, 403);
  }

  await db
    .update(stockMembers)
    .set({ role: newRole })
    .where(and(eq(stockMembers.stockId, stockId), eq(stockMembers.userId, targetMemberUserId)))
    .run();

  return c.json({ success: true, message: '成員角色已更新' });
});

// 11. Remove Member
stocksRouter.delete('/:id/members/:memberUserId', async (c) => {
  const user = c.get('user')!;
  const db = getDb(c.env.DB);
  const stockId = c.req.param('id');
  const targetMemberUserId = c.req.param('memberUserId');

  const myMembership = await db
    .select()
    .from(stockMembers)
    .where(and(eq(stockMembers.stockId, stockId), eq(stockMembers.userId, user.id)))
    .get();

  if (!myMembership || (myMembership.role !== 'owner' && myMembership.role !== 'admin')) {
    return c.json({ error: '權限不足' }, 403);
  }

  const targetMember = await db
    .select()
    .from(stockMembers)
    .where(and(eq(stockMembers.stockId, stockId), eq(stockMembers.userId, targetMemberUserId)))
    .get();

  if (!targetMember) return c.json({ error: '成員不存在' }, 404);

  if (targetMember.role === 'owner') {
    return c.json({ error: '無法將 Owner 移出 Stock' }, 400);
  }

  if (myMembership.role === 'admin' && targetMember.role === 'admin') {
    return c.json({ error: 'Admin 無法移出另一位 Admin' }, 403);
  }

  await db
    .delete(stockMembers)
    .where(and(eq(stockMembers.stockId, stockId), eq(stockMembers.userId, targetMemberUserId)))
    .run();

  return c.json({ success: true, message: '成員已被移出' });
});
