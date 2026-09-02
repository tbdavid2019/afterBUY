import { Hono } from 'hono';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { HonoEnv } from '../types.ts';
import { requireAuth } from '../middleware/auth.ts';
import { getDb, items, itemHistory } from '../db/index.ts';
import { computeItemStatus } from '../../shared/lifecycle.ts';
import { ItemCategory, TrackingMode } from '../../shared/types.ts';

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
      },
      now
    );

    return {
      ...item,
      category: item.category as ItemCategory,
      trackingMode: item.trackingMode as TrackingMode,
      ...status,
    };
  });

  // Sort by urgency: overdue -> due_soon -> healthy, then remainingDays ascending
  const urgencyWeight = { overdue: 0, due_soon: 1, healthy: 2, out_of_stock: 3 };
  computedItems.sort((a, b) => {
    const diff = urgencyWeight[a.healthStatus] - urgencyWeight[b.healthStatus];
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
    notes: body.notes?.trim() || null,
    imageUrl: body.imageUrl || null,
    calendarSequence: 0,
    deletedAt: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await db.insert(items).values(newItem);

  return c.json({ success: true, item: newItem }, 201);
});

// 3. Update existing item (Defense-in-depth: scoped strictly by userId)
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
    notes: body.notes !== undefined ? body.notes?.trim() || null : existing.notes,
    imageUrl: body.imageUrl !== undefined ? body.imageUrl : existing.imageUrl,
    calendarSequence: existing.calendarSequence + 1,
    updatedAt: nowIso,
  };

  await db
    .update(items)
    .set(updatedData)
    .where(and(eq(items.id, itemId), eq(items.userId, user.id)));

  return c.json({ success: true, item: { ...existing, ...updatedData } });
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
