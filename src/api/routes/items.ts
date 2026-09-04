import { Hono } from 'hono';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { HonoEnv } from '../types.ts';
import { requireAuth } from '../middleware/auth.ts';
import { getDb, items, itemHistory } from '../db/index.ts';
import { computeItemStatus } from '../../shared/lifecycle.ts';
import { ItemCategory, TrackingMode, HealthStatus } from '../../shared/types.ts';

export const itemsRouter = new Hono<HonoEnv>();

itemsRouter.use('*', requireAuth);

// 1. List all active items with computed status
itemsRouter.get('/', async (c) => {
  const user = c.get('user')!;
  const db = getDb(c.env.DB);

  const rawItems = await db
    .select()
    .from(items)
    .where(and(eq(items.userId, user.id), isNull(items.deletedAt)))
    .all();

  const now = new Date();
  const computedItems = rawItems.map((item) => {
    const status = computeItemStatus({
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

    return {
      ...item,
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
    const diff = (urgencyWeight[a.healthStatus] ?? 3) - (urgencyWeight[b.healthStatus] ?? 3);
    if (diff !== 0) return diff;
    return a.remainingDays - b.remainingDays;
  });

  return c.json({ items: computedItems });
});

// 2. Create new item
itemsRouter.post('/', async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json<{
    name: string;
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
  const todayStr = new Date().toISOString().split('T')[0];
  const itemId = crypto.randomUUID();

  const newItem = {
    id: itemId,
    userId: user.id,
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

// 3. Batch Replace (One-tap mark replaced for multiple selected items)
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
    const existing = await db
      .select()
      .from(items)
      .where(and(eq(items.id, id), eq(items.userId, user.id), isNull(items.deletedAt)))
      .get();

    if (existing) {
      const newStock = Math.max(0, existing.backupStock - 1);
      const updatedData = {
        startDate: todayStr,
        backupStock: newStock,
        calendarSequence: existing.calendarSequence + 1,
        updatedAt: nowIso,
      };

      await db
        .update(items)
        .set(updatedData)
        .where(and(eq(items.id, id), eq(items.userId, user.id)));

      await db.insert(itemHistory).values({
        id: crypto.randomUUID(),
        itemId: id,
        userId: user.id,
        replacedAt: nowIso,
        previousStartDate: existing.startDate,
        stockAfterReplace: newStock,
        notes: '批次更換 (Batch Replaced)',
      });

      updatedItems.push({ ...existing, ...updatedData });
    }
  }

  return c.json({ success: true, count: updatedItems.length, items: updatedItems });
});

// 4. Batch Stock Adjustment (+/- delta)
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
    const existing = await db
      .select()
      .from(items)
      .where(and(eq(items.id, id), eq(items.userId, user.id), isNull(items.deletedAt)))
      .get();

    if (existing) {
      const newStock = Math.max(0, existing.backupStock + delta);
      await db
        .update(items)
        .set({ backupStock: newStock, updatedAt: nowIso })
        .where(and(eq(items.id, id), eq(items.userId, user.id)));

      updatedItems.push({ ...existing, backupStock: newStock });
    }
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

  for (const id of itemIds) {
    await db
      .update(items)
      .set({ deletedAt: nowIso, updatedAt: nowIso })
      .where(and(eq(items.id, id), eq(items.userId, user.id)));
  }

  return c.json({ success: true, count: itemIds.length });
});

// 6. Update existing item (Defense-in-depth: scoped strictly by userId)
itemsRouter.put('/:id', async (c) => {
  const user = c.get('user')!;
  const itemId = c.req.param('id');
  const body = await c.req.json();
  const db = getDb(c.env.DB);

  const existing = await db
    .select()
    .from(items)
    .where(and(eq(items.id, itemId), eq(items.userId, user.id), isNull(items.deletedAt)))
    .get();

  if (!existing) {
    return c.json({ error: '找不到該物品' }, 404);
  }

  const nowIso = new Date().toISOString();
  const updatedData = {
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

  await db
    .update(items)
    .set(updatedData)
    .where(and(eq(items.id, itemId), eq(items.userId, user.id)));

  return c.json({
    success: true,
    item: {
      ...existing,
      ...updatedData,
      isStored: Boolean(updatedData.isStored),
    },
  });
});

// 7. Start using a stored item (Switch from Stored to Active countdown starting today)
itemsRouter.post('/:id/start-using', async (c) => {
  const user = c.get('user')!;
  const itemId = c.req.param('id');
  const db = getDb(c.env.DB);

  const existing = await db
    .select()
    .from(items)
    .where(and(eq(items.id, itemId), eq(items.userId, user.id), isNull(items.deletedAt)))
    .get();

  if (!existing) {
    return c.json({ error: '找不到該物品' }, 404);
  }

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
    .where(and(eq(items.id, itemId), eq(items.userId, user.id)));

  return c.json({
    success: true,
    message: '物品已開始使用！計時正式啟動',
    startDate: todayStr,
    isStored: false,
  });
});

// 8. Snooze reminder (Postpone by 3, 7 or custom days)
itemsRouter.post('/:id/snooze', async (c) => {
  const user = c.get('user')!;
  const itemId = c.req.param('id');
  const { days = 7 } = await c.req.json<{ days?: number }>();
  const db = getDb(c.env.DB);

  const existing = await db
    .select()
    .from(items)
    .where(and(eq(items.id, itemId), eq(items.userId, user.id), isNull(items.deletedAt)))
    .get();

  if (!existing) {
    return c.json({ error: '找不到該物品' }, 404);
  }

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
    .where(and(eq(items.id, itemId), eq(items.userId, user.id)));

  return c.json({
    success: true,
    message: `已延後提醒 ${days} 天`,
    snoozeUntil: snoozeUntilStr,
  });
});

// 4. Soft Delete item (Retain for 30-day tombstone in WebCal)
itemsRouter.delete('/:id', async (c) => {
  const user = c.get('user')!;
  const itemId = c.req.param('id');
  const db = getDb(c.env.DB);

  const existing = await db
    .select()
    .from(items)
    .where(and(eq(items.id, itemId), eq(items.userId, user.id)))
    .get();

  if (!existing) {
    return c.json({ error: '找不到該物品' }, 404);
  }

  const nowIso = new Date().toISOString();
  await db
    .update(items)
    .set({
      deletedAt: nowIso,
      calendarSequence: existing.calendarSequence + 1,
      updatedAt: nowIso,
    })
    .where(and(eq(items.id, itemId), eq(items.userId, user.id)));

  return c.json({ success: true, message: '物品已刪除' });
});

// 5. One-tap "Mark Replaced Today" action
itemsRouter.post('/:id/replace', async (c) => {
  const user = c.get('user')!;
  const itemId = c.req.param('id');
  const db = getDb(c.env.DB);

  const existing = await db
    .select()
    .from(items)
    .where(and(eq(items.id, itemId), eq(items.userId, user.id), isNull(items.deletedAt)))
    .get();

  if (!existing) {
    return c.json({ error: '找不到該物品' }, 404);
  }

  const nowIso = new Date().toISOString();
  const todayStr = nowIso.split('T')[0];
  const newStock = Math.max(0, existing.backupStock - 1);

  // Update item start date and decrement stock
  await db
    .update(items)
    .set({
      startDate: todayStr,
      backupStock: newStock,
      calendarSequence: existing.calendarSequence + 1,
      updatedAt: nowIso,
    })
    .where(and(eq(items.id, itemId), eq(items.userId, user.id)));

  // Record history
  const historyRecord = {
    id: crypto.randomUUID(),
    itemId: existing.id,
    userId: user.id,
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

// 6. Adjust backup stock count directly
itemsRouter.post('/:id/stock', async (c) => {
  const user = c.get('user')!;
  const itemId = c.req.param('id');
  const { delta, count } = await c.req.json<{ delta?: number; count?: number }>();
  const db = getDb(c.env.DB);

  const existing = await db
    .select()
    .from(items)
    .where(and(eq(items.id, itemId), eq(items.userId, user.id), isNull(items.deletedAt)))
    .get();

  if (!existing) {
    return c.json({ error: '找不到該物品' }, 404);
  }

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
    .where(and(eq(items.id, itemId), eq(items.userId, user.id)));

  return c.json({ success: true, backupStock: newStock });
});

// 7. Get replacement history for an item
itemsRouter.get('/:id/history', async (c) => {
  const user = c.get('user')!;
  const itemId = c.req.param('id');
  const db = getDb(c.env.DB);

  const historyList = await db
    .select()
    .from(itemHistory)
    .where(and(eq(itemHistory.itemId, itemId), eq(itemHistory.userId, user.id)))
    .orderBy(desc(itemHistory.replacedAt))
    .all();

  return c.json({ history: historyList });
});
