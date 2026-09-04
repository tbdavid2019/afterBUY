import { Hono } from 'hono';
import { eq, and, isNull, desc, inArray } from 'drizzle-orm';
import { HonoEnv } from '../types.ts';
import { requireAuth } from '../middleware/auth.ts';
import { getDb, items, itemHistory, stocks, stockMembers, users } from '../db/index.ts';
import { computeItemStatus } from '../../shared/lifecycle.ts';
import { ItemCategory, TrackingMode, HealthStatus, StockRole } from '../../shared/types.ts';
import { ensureUserDefaultStock } from './stocks.ts';

export const itemsRouter = new Hono<HonoEnv>();

itemsRouter.use('*', requireAuth);

/**
 * Access control helper for a single item
 */
async function checkItemAccess(
  db: any,
  itemId: string,
  userId: string,
  requiredAction: 'view' | 'edit' | 'delete' = 'view'
): Promise<{ item: any; role: StockRole } | false | null> {
  const item = await db
    .select()
    .from(items)
    .where(and(eq(items.id, itemId), isNull(items.deletedAt)))
    .get();

  if (!item) return null; // 404

  // If item has no stockId assigned, allow original owner
  if (!item.stockId) {
    if (item.userId === userId) {
      return { item, role: 'owner' };
    }
    return false; // 403
  }

  // Check user's membership in the item's Stock space
  const member = await db
    .select()
    .from(stockMembers)
    .where(and(eq(stockMembers.stockId, item.stockId), eq(stockMembers.userId, userId)))
    .get();

  if (!member) {
    // Creator fallback
    if (item.userId === userId || item.createdByUserId === userId) {
      return { item, role: 'owner' };
    }
    return false; // 403
  }

  const role = member.role as StockRole;

  if (requiredAction === 'edit') {
    if (role === 'viewer') return false;
  } else if (requiredAction === 'delete') {
    if (role === 'viewer') return false;
    if (role === 'member') {
      // Members can only delete items they created
      if (item.createdByUserId !== userId && item.userId !== userId) {
        return false;
      }
    }
  }

  return { item, role };
}

// 1. List all active items with computed status (Supports ?stockId=... and "all")
itemsRouter.get('/', async (c) => {
  const user = c.get('user')!;
  const db = getDb(c.env.DB);
  const requestedStockId = c.req.query('stockId');

  await ensureUserDefaultStock(db, user);

  // Fetch all stocks user has membership in
  const myMemberships = await (db as any)
    .select({
      stockId: stockMembers.stockId,
      role: stockMembers.role,
      stockName: stocks.name,
      stockIcon: stocks.icon,
    })
    .from(stockMembers)
    .innerJoin(stocks, eq(stockMembers.stockId, stocks.id))
    .where(and(eq(stockMembers.userId, user.id), isNull(stocks.deletedAt)))
    .all();

  const accessibleStockIds: string[] = myMemberships.map((m: any) => m.stockId);
  const stockMetaMap = new Map<string, { name: string; icon: string; role: StockRole }>();
  myMemberships.forEach((m: any) =>
    stockMetaMap.set(m.stockId, { name: m.stockName, icon: m.stockIcon, role: m.role as StockRole })
  );

  let rawItems: any[] = [];

  if (requestedStockId && requestedStockId !== 'all') {
    // Specific stock requested
    if (!accessibleStockIds.includes(requestedStockId)) {
      return c.json({ error: '您無權訪問此 Stock' }, 403);
    }
    rawItems = await db
      .select()
      .from(items)
      .where(and(eq(items.stockId, requestedStockId), isNull(items.deletedAt)))
      .all();
  } else {
    // All Stocks aggregate view
    const allActiveItems = await db
      .select()
      .from(items)
      .where(isNull(items.deletedAt))
      .all();

    rawItems = allActiveItems.filter((it) => {
      if (it.stockId && accessibleStockIds.includes(it.stockId)) return true;
      if (it.userId === user.id) return true;
      return false;
    });
  }

  const now = new Date();
  const computedItems = rawItems.map((item) => {
    const status = computeItemStatus(
      {
        startDate: item.startDate,
        trackingMode: item.trackingMode as TrackingMode,
        cycleDays: item.cycleDays,
        paoMonths: item.paoMonths,
        expiryDate: item.expiryDate,
        warrantyDate: item.warrantyDate,
        backupStock: item.backupStock,
        minStockAlert: item.minStockAlert,
        isStored: Boolean(item.isStored),
        snoozeUntil: item.snoozeUntil,
      },
      now
    );

    const meta = item.stockId ? stockMetaMap.get(item.stockId) : null;

    return {
      ...item,
      stockName: meta?.name || '甜蜜的家',
      stockIcon: meta?.icon || '🏠',
      category: item.category as ItemCategory,
      trackingMode: item.trackingMode as TrackingMode,
      isStored: Boolean(item.isStored),
      ...status,
    };
  });

  // Sort by urgency: overdue -> due_soon -> snoozed -> healthy -> stored
  const urgencyWeight: Record<HealthStatus, number> = {
    overdue: 0,
    due_soon: 1,
    snoozed: 2,
    healthy: 3,
    out_of_stock: 4,
    stored: 5,
  };
  computedItems.sort((a, b) => {
    const diff = (urgencyWeight[a.healthStatus as HealthStatus] ?? 3) - (urgencyWeight[b.healthStatus as HealthStatus] ?? 3);
    if (diff !== 0) return diff;
    return a.remainingDays - b.remainingDays;
  });

  return c.json({ items: computedItems });
});

// 2. Create new item (Scoped to a Stock space)
itemsRouter.post('/', async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json<{
    name: string;
    stockId?: string;
    category?: ItemCategory;
    trackingMode?: TrackingMode;
    cycleDays?: number;
    startDate?: string;
    paoMonths?: number;
    expiryDate?: string;
    warrantyDate?: string;
    backupStock?: number;
    minStockAlert?: number;
    price?: number;
    specModel?: string;
    location?: string;
    isStored?: boolean;
    snoozeUntil?: string;
    notes?: string;
    imageUrl?: string;
  }>();

  if (!body.name || !body.name.trim()) {
    return c.json({ error: '請輸入物品名稱' }, 400);
  }

  const db = getDb(c.env.DB);
  const nowIso = new Date().toISOString();
  const todayStr = nowIso.split('T')[0];
  const itemId = crypto.randomUUID();

  // Resolve target Stock ID
  const targetStockId: string = (body.stockId && body.stockId !== 'all')
    ? body.stockId
    : await ensureUserDefaultStock(db, user);

  // Verify permission in target Stock
  const member = await db
    .select()
    .from(stockMembers)
    .where(and(eq(stockMembers.stockId, targetStockId), eq(stockMembers.userId, user.id)))
    .get();

  if (!member || member.role === 'viewer') {
    return c.json({ error: '您無權在此 Stock 新增物品' }, 403);
  }

  const newItem = {
    id: itemId,
    stockId: targetStockId,
    userId: user.id,
    createdByUserId: user.id,
    name: body.name.trim(),
    category: body.category || 'general',
    trackingMode: body.trackingMode || 'cycle',
    cycleDays: body.cycleDays ?? (body.trackingMode === 'cycle' ? 90 : null),
    startDate: body.startDate || todayStr,
    paoMonths: body.paoMonths ?? (body.trackingMode === 'pao' ? 6 : null),
    expiryDate: body.expiryDate || null,
    warrantyDate: body.warrantyDate || null,
    backupStock: Math.max(0, body.backupStock ?? 0),
    minStockAlert: Math.max(0, body.minStockAlert ?? 1),
    price: body.price !== undefined && body.price !== null ? Math.max(0, Math.round(body.price)) : null,
    specModel: body.specModel?.trim() || null,
    location: body.location?.trim() || null,
    isStored: body.isStored ? 1 : 0,
    snoozeUntil: body.snoozeUntil || null,
    notes: body.notes?.trim() || null,
    imageUrl: body.imageUrl || null,
    calendarSequence: 0,
    deletedAt: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await db.insert(items).values(newItem);

  return c.json({ success: true, item: { ...newItem, isStored: Boolean(newItem.isStored) } }, 201);
});

// 3. Batch Replace
itemsRouter.post('/batch-replace', async (c) => {
  const user = c.get('user')!;
  const { itemIds } = await c.req.json<{ itemIds?: string[] }>();
  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    return c.json({ error: '請提供要更換的物品 ID 清單' }, 400);
  }

  const db = getDb(c.env.DB);
  const nowIso = new Date().toISOString();
  const todayStr = nowIso.split('T')[0];
  const updatedItems: any[] = [];

  for (const id of itemIds) {
    const access = await checkItemAccess(db, id, user.id, 'edit');
    if (!access) continue;

    const existing = access.item;
    const newStock = Math.max(0, existing.backupStock - 1);
    const updatedData = {
      startDate: todayStr,
      backupStock: newStock,
      calendarSequence: existing.calendarSequence + 1,
      updatedAt: nowIso,
    };

    await db.update(items).set(updatedData).where(eq(items.id, id));

    await db.insert(itemHistory).values({
      id: crypto.randomUUID(),
      itemId: id,
      userId: user.id,
      replacedByUserId: user.id,
      replacedAt: nowIso,
      previousStartDate: existing.startDate,
      stockAfterReplace: newStock,
      notes: '批次更換 (Batch Replaced)',
    });

    updatedItems.push({ ...existing, ...updatedData });
  }

  return c.json({ success: true, count: updatedItems.length, items: updatedItems });
});

// 4. Batch Stock Adjustment
itemsRouter.post('/batch-stock', async (c) => {
  const user = c.get('user')!;
  const { itemIds, delta } = await c.req.json<{ itemIds?: string[]; delta?: number }>();
  if (!Array.isArray(itemIds) || itemIds.length === 0 || typeof delta !== 'number') {
    return c.json({ error: '請提供物品 ID 清單與庫存調整數值' }, 400);
  }

  const db = getDb(c.env.DB);
  const nowIso = new Date().toISOString();
  const updatedItems: any[] = [];

  for (const id of itemIds) {
    const access = await checkItemAccess(db, id, user.id, 'edit');
    if (!access) continue;

    const existing = access.item;
    const newStock = Math.max(0, existing.backupStock + delta);
    await db.update(items).set({ backupStock: newStock, updatedAt: nowIso }).where(eq(items.id, id));
    updatedItems.push({ ...existing, backupStock: newStock });
  }

  return c.json({ success: true, count: updatedItems.length, items: updatedItems });
});

// 5. Batch Delete
itemsRouter.post('/batch-delete', async (c) => {
  const user = c.get('user')!;
  const { itemIds } = await c.req.json<{ itemIds?: string[] }>();
  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    return c.json({ error: '請提供要刪除的物品 ID 清單' }, 400);
  }

  const db = getDb(c.env.DB);
  const nowIso = new Date().toISOString();
  let deletedCount = 0;

  for (const id of itemIds) {
    const access = await checkItemAccess(db, id, user.id, 'delete');
    if (!access) continue;

    await db.update(items).set({ deletedAt: nowIso, updatedAt: nowIso }).where(eq(items.id, id));
    deletedCount++;
  }

  return c.json({ success: true, count: deletedCount });
});

// 6. Update existing item
itemsRouter.put('/:id', async (c) => {
  const user = c.get('user')!;
  const itemId = c.req.param('id');
  const body = await c.req.json();
  const db = getDb(c.env.DB);

  const access = await checkItemAccess(db, itemId, user.id, 'edit');
  if (access === null) return c.json({ error: '找不到該物品' }, 404);
  if (access === false) return c.json({ error: '您無權修改此物品' }, 403);

  const existing = access.item;
  const nowIso = new Date().toISOString();
  const updatedData: any = {
    name: body.name !== undefined ? body.name.trim() : existing.name,
    category: body.category || existing.category,
    trackingMode: body.trackingMode || existing.trackingMode,
    cycleDays: body.cycleDays !== undefined ? body.cycleDays : existing.cycleDays,
    startDate: body.startDate || existing.startDate,
    paoMonths: body.paoMonths !== undefined ? body.paoMonths : existing.paoMonths,
    expiryDate: body.expiryDate !== undefined ? body.expiryDate : existing.expiryDate,
    warrantyDate: body.warrantyDate !== undefined ? body.warrantyDate : existing.warrantyDate,
    backupStock: body.backupStock !== undefined ? Math.max(0, body.backupStock) : existing.backupStock,
    minStockAlert: body.minStockAlert !== undefined ? Math.max(0, body.minStockAlert) : existing.minStockAlert,
    price: body.price !== undefined ? (body.price === null ? null : Math.max(0, Math.round(body.price))) : existing.price,
    specModel: body.specModel !== undefined ? body.specModel?.trim() || null : existing.specModel,
    location: body.location !== undefined ? body.location?.trim() || null : existing.location,
    isStored: body.isStored !== undefined ? (body.isStored ? 1 : 0) : existing.isStored,
    snoozeUntil: body.snoozeUntil !== undefined ? body.snoozeUntil : existing.snoozeUntil,
    notes: body.notes !== undefined ? body.notes?.trim() || null : existing.notes,
    imageUrl: body.imageUrl !== undefined ? body.imageUrl : existing.imageUrl,
    calendarSequence: existing.calendarSequence + 1,
    updatedAt: nowIso,
  };

  if (body.stockId && body.stockId !== existing.stockId) {
    // Changing item to another stock requires membership in target stock
    const targetMember = await db
      .select()
      .from(stockMembers)
      .where(and(eq(stockMembers.stockId, body.stockId), eq(stockMembers.userId, user.id)))
      .get();
    if (targetMember && targetMember.role !== 'viewer') {
      updatedData.stockId = body.stockId;
    }
  }

  await db.update(items).set(updatedData).where(eq(items.id, itemId));

  return c.json({
    success: true,
    item: {
      ...existing,
      ...updatedData,
      isStored: Boolean(updatedData.isStored),
    },
  });
});

// 7. Start using a stored item
itemsRouter.post('/:id/start-using', async (c) => {
  const user = c.get('user')!;
  const itemId = c.req.param('id');
  const db = getDb(c.env.DB);

  const access = await checkItemAccess(db, itemId, user.id, 'edit');
  if (access === null) return c.json({ error: '找不到該物品' }, 404);
  if (access === false) return c.json({ error: '權限不足' }, 403);

  const existing = access.item;
  const nowIso = new Date().toISOString();
  const todayStr = nowIso.split('T')[0];

  await db
    .update(items)
    .set({
      isStored: 0,
      startDate: todayStr,
      snoozeUntil: null,
      calendarSequence: existing.calendarSequence + 1,
      updatedAt: nowIso,
    })
    .where(eq(items.id, itemId));

  return c.json({
    success: true,
    message: '物品已開始使用！計時正式啟動',
    startDate: todayStr,
    isStored: false,
  });
});

// 8. Snooze reminder
itemsRouter.post('/:id/snooze', async (c) => {
  const user = c.get('user')!;
  const itemId = c.req.param('id');
  const { days = 7 } = await c.req.json<{ days?: number }>();
  const db = getDb(c.env.DB);

  const access = await checkItemAccess(db, itemId, user.id, 'edit');
  if (access === null) return c.json({ error: '找不到該物品' }, 404);
  if (access === false) return c.json({ error: '權限不足' }, 403);

  const existing = access.item;
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + Math.max(1, days));
  const snoozeUntilStr = targetDate.toISOString().split('T')[0];
  const nowIso = new Date().toISOString();

  await db
    .update(items)
    .set({
      snoozeUntil: snoozeUntilStr,
      calendarSequence: existing.calendarSequence + 1,
      updatedAt: nowIso,
    })
    .where(eq(items.id, itemId));

  return c.json({
    success: true,
    message: `已延後提醒 ${days} 天`,
    snoozeUntil: snoozeUntilStr,
  });
});

// 9. Soft Delete item
itemsRouter.delete('/:id', async (c) => {
  const user = c.get('user')!;
  const itemId = c.req.param('id');
  const db = getDb(c.env.DB);

  const access = await checkItemAccess(db, itemId, user.id, 'delete');
  if (access === null) return c.json({ error: '找不到該物品' }, 404);
  if (access === false) return c.json({ error: '您無權刪除此物品' }, 403);

  const existing = access.item;
  const nowIso = new Date().toISOString();
  await db
    .update(items)
    .set({
      deletedAt: nowIso,
      calendarSequence: existing.calendarSequence + 1,
      updatedAt: nowIso,
    })
    .where(eq(items.id, itemId));

  return c.json({ success: true, message: '物品已刪除' });
});

// 10. One-tap "Mark Replaced Today" action
itemsRouter.post('/:id/replace', async (c) => {
  const user = c.get('user')!;
  const itemId = c.req.param('id');
  const db = getDb(c.env.DB);

  const access = await checkItemAccess(db, itemId, user.id, 'edit');
  if (access === null) return c.json({ error: '找不到該物品' }, 404);
  if (access === false) return c.json({ error: '權限不足' }, 403);

  const existing = access.item;
  const nowIso = new Date().toISOString();
  const todayStr = nowIso.split('T')[0];
  const newStock = Math.max(0, existing.backupStock - 1);

  await db
    .update(items)
    .set({
      startDate: todayStr,
      backupStock: newStock,
      calendarSequence: existing.calendarSequence + 1,
      updatedAt: nowIso,
    })
    .where(eq(items.id, itemId));

  // Record history with replacedByUserId
  const historyRecord = {
    id: crypto.randomUUID(),
    itemId: existing.id,
    userId: user.id,
    replacedByUserId: user.id,
    replacedAt: nowIso,
    previousStartDate: existing.startDate,
    stockAfterReplace: newStock,
    notes: existing.backupStock > 0 ? '已扣減 1 個備品庫存' : '無備品庫存（需採購）',
  };
  await db.insert(itemHistory).values(historyRecord);

  return c.json({
    success: true,
    message: '已記錄更換！計時器已重置',
    newStock,
    startDate: todayStr,
  });
});

// 11. Adjust backup stock count directly
itemsRouter.post('/:id/stock', async (c) => {
  const user = c.get('user')!;
  const itemId = c.req.param('id');
  const { delta, count } = await c.req.json<{ delta?: number; count?: number }>();
  const db = getDb(c.env.DB);

  const access = await checkItemAccess(db, itemId, user.id, 'edit');
  if (access === null) return c.json({ error: '找不到該物品' }, 404);
  if (access === false) return c.json({ error: '權限不足' }, 403);

  const existing = access.item;
  let newStock = existing.backupStock;
  if (count !== undefined) {
    newStock = Math.max(0, count);
  } else if (delta !== undefined) {
    newStock = Math.max(0, existing.backupStock + delta);
  }

  const nowIso = new Date().toISOString();
  await db
    .update(items)
    .set({
      backupStock: newStock,
      updatedAt: nowIso,
    })
    .where(eq(items.id, itemId));

  return c.json({ success: true, backupStock: newStock });
});

// 12. Get replacement history for an item
itemsRouter.get('/:id/history', async (c) => {
  const user = c.get('user')!;
  const itemId = c.req.param('id');
  const db = getDb(c.env.DB);

  const access = await checkItemAccess(db, itemId, user.id, 'view');
  if (access === null) return c.json({ error: '找不到該物品' }, 404);
  if (access === false) return c.json({ error: '權限不足' }, 403);

  const rawHistory = await (db as any)
    .select({
      id: itemHistory.id,
      itemId: itemHistory.itemId,
      userId: itemHistory.userId,
      replacedByUserId: itemHistory.replacedByUserId,
      replacedAt: itemHistory.replacedAt,
      previousStartDate: itemHistory.previousStartDate,
      stockAfterReplace: itemHistory.stockAfterReplace,
      notes: itemHistory.notes,
      userEmail: users.email,
    })
    .from(itemHistory)
    .leftJoin(users, eq(itemHistory.replacedByUserId, users.id))
    .where(eq(itemHistory.itemId, itemId))
    .orderBy(desc(itemHistory.replacedAt))
    .all();

  const historyList = rawHistory.map((h: any) => ({
    id: h.id,
    itemId: h.itemId,
    userId: h.userId,
    replacedByUserId: h.replacedByUserId,
    replacedByNickname: h.userEmail ? h.userEmail.split('@')[0] : null,
    replacedAt: h.replacedAt,
    previousStartDate: h.previousStartDate,
    stockAfterReplace: h.stockAfterReplace,
    notes: h.notes,
  }));

  return c.json({ history: historyList });
});
