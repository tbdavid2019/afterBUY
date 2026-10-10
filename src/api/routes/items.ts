import { Hono } from 'hono';
import { eq, and, isNull, desc, inArray } from 'drizzle-orm';
import { HonoEnv } from '../types.ts';
import { requireAuth } from '../middleware/auth.ts';
import { getDb, items, itemHistory, stocks, stockMembers, users } from '../db/index.ts';
import { computeItemStatus, computeActiveUnitsStatus } from '../../shared/lifecycle.ts';
import { ItemCategory, TrackingMode, HealthStatus, StockRole, ActiveUnitInstance } from '../../shared/types.ts';
import { ensureUserDefaultStock } from './stocks.ts';
import { addBusinessDays, businessDate } from '../../shared/date.ts';
import { hashString } from '../utils/auth.ts';

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
    let parsedActiveUnitsData: ActiveUnitInstance[] | null = null;
    if (item.activeUnitsData) {
      try {
        parsedActiveUnitsData = typeof item.activeUnitsData === 'string' ? JSON.parse(item.activeUnitsData) : item.activeUnitsData;
      } catch {
        parsedActiveUnitsData = null;
      }
    }

    if (parsedActiveUnitsData && parsedActiveUnitsData.length > 0) {
      parsedActiveUnitsData = computeActiveUnitsStatus(
        {
          startDate: item.startDate,
          trackingMode: item.trackingMode as TrackingMode,
          cycleDays: item.cycleDays,
          paoMonths: item.paoMonths,
          expiryDate: item.expiryDate,
          warrantyDate: item.warrantyDate,
          initialQuantity: item.initialQuantity,
          currentQuantity: item.currentQuantity,
          dailyUsage: item.dailyUsage,
          quantityUnit: item.quantityUnit,
          backupStock: item.backupStock,
          minStockAlert: item.minStockAlert,
          isStored: Boolean(item.isStored),
          snoozeUntil: item.snoozeUntil,
          activeUnitsData: parsedActiveUnitsData,
          updatedAt: item.updatedAt,
          quantityUpdatedAt: item.quantityUpdatedAt,
        },
        now
      );
    }

    const status = computeItemStatus(
      {
        startDate: item.startDate,
        trackingMode: item.trackingMode as TrackingMode,
        cycleDays: item.cycleDays,
        paoMonths: item.paoMonths,
        expiryDate: item.expiryDate,
        warrantyDate: item.warrantyDate,
        initialQuantity: item.initialQuantity,
        currentQuantity: item.currentQuantity,
        dailyUsage: item.dailyUsage,
        quantityUnit: item.quantityUnit,
        activeUnits: item.activeUnits,
        activeUnitsData: parsedActiveUnitsData,
        backupStock: item.backupStock,
        minStockAlert: item.minStockAlert,
        isStored: Boolean(item.isStored),
        snoozeUntil: item.snoozeUntil,
        updatedAt: item.updatedAt,
        quantityUpdatedAt: item.quantityUpdatedAt,
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
      activeUnitsData: parsedActiveUnitsData,
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

  c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  return c.json({ items: computedItems });
});

// 2. Create new item (Scoped to a Stock space)
itemsRouter.post('/', async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json<{
    guestSourceId?: string;
    name: string;
    stockId?: string;
    category?: ItemCategory;
    trackingMode?: TrackingMode;
    cycleDays?: number;
    startDate?: string;
    paoMonths?: number;
    expiryDate?: string;
    warrantyDate?: string;
    initialQuantity?: number;
    currentQuantity?: number;
    dailyUsage?: number;
    quantityUnit?: string;
    activeUnits?: number;
    activeUnitsData?: ActiveUnitInstance[] | string;
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
  if (body.guestSourceId !== undefined && (typeof body.guestSourceId !== 'string' || !/^guest-[a-zA-Z0-9-]{1,120}$/.test(body.guestSourceId))) {
    return c.json({ error: '試用物品來源識別碼無效' }, 400);
  }

  const db = getDb(c.env.DB);
  const nowIso = new Date().toISOString();
  const todayStr = businessDate();
  // Stable per account and source item, so a lost response or page reload
  // cannot create a second copy. The primary key also handles concurrent tabs.
  const itemId = body.guestSourceId
    ? `guest-import-${await hashString(JSON.stringify([user.id, body.guestSourceId]), 'afterbuy-guest-import')}`
    : crypto.randomUUID();

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

  const isQuantityMode = body.trackingMode === 'quantity';
  const initialQty = isQuantityMode ? Math.max(1, body.initialQuantity ?? 60) : null;
  const dailyRate = isQuantityMode ? Math.max(0.01, body.dailyUsage ?? 1) : null;
  const currentQty = isQuantityMode
    ? (body.currentQuantity !== undefined && body.currentQuantity !== null ? Math.max(0, body.currentQuantity) : null)
    : null;

  const MAX_ACTIVE_UNITS = 30;
  let activeUnitsCount = body.activeUnits ? Math.min(MAX_ACTIVE_UNITS, Math.max(1, Math.floor(Number(body.activeUnits) || 1))) : 1;
  let finalActiveUnitsDataStr: string | null = null;
  let computedStartDate = body.startDate || todayStr;

  if (body.activeUnitsData) {
    let parsed: any[] = [];
    try {
      parsed = typeof body.activeUnitsData === 'string' ? JSON.parse(body.activeUnitsData) : body.activeUnitsData;
    } catch {
      parsed = [];
    }
    if (Array.isArray(parsed) && parsed.length > 0) {
      const bounded = parsed.slice(0, MAX_ACTIVE_UNITS);
      activeUnitsCount = bounded.length;
      finalActiveUnitsDataStr = JSON.stringify(
        bounded.map((u, i) => ({
          id: u.id || `u-${crypto.randomUUID().slice(0, 8)}`,
          label: typeof u.label === 'string' && u.label.trim() ? u.label.trim() : `位置 ${i + 1}`,
          startDate: typeof u.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(u.startDate) ? u.startDate : todayStr,
        }))
      );
      const validDates = bounded
        .map((u) => u.startDate)
        .filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
        .sort();
      if (validDates.length > 0) {
        computedStartDate = validDates[0];
      }
    }
  } else if (activeUnitsCount > 1) {
    const defaultLabels = ['位置 1', '位置 2', '位置 3', '位置 4', '位置 5', '位置 6', '位置 7', '位置 8'];
    const generated = Array.from({ length: activeUnitsCount }, (_, i) => ({
      id: `u-${crypto.randomUUID().slice(0, 8)}`,
      label: defaultLabels[i] || `位置 ${i + 1}`,
      startDate: computedStartDate,
    }));
    finalActiveUnitsDataStr = JSON.stringify(generated);
  }

  const newItem = {
    id: itemId,
    stockId: targetStockId,
    userId: user.id,
    createdByUserId: user.id,
    name: body.name.trim(),
    category: body.category || 'general',
    trackingMode: body.trackingMode || 'cycle',
    cycleDays: body.cycleDays ?? (
      body.trackingMode === 'cycle'
        ? 90
        : isQuantityMode && initialQty && dailyRate
          ? Math.ceil(initialQty / dailyRate)
          : null
    ),
    startDate: computedStartDate,
    paoMonths: body.paoMonths ?? (body.trackingMode === 'pao' ? 6 : null),
    expiryDate: body.expiryDate || null,
    warrantyDate: body.warrantyDate || null,
    initialQuantity: initialQty,
    currentQuantity: currentQty,
    dailyUsage: dailyRate,
    quantityUnit: isQuantityMode ? (body.quantityUnit?.trim() || '顆') : null,
    activeUnits: activeUnitsCount,
    activeUnitsData: finalActiveUnitsDataStr,
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
    quantityUpdatedAt: body.quantityUpdatedAt || nowIso,
  };

  if (body.guestSourceId) {
    const inserted = await db.insert(items).values(newItem).onConflictDoNothing({ target: items.id }).returning().get();
    if (!inserted) {
      const access = await checkItemAccess(db, itemId, user.id);
      if (access === false) return c.json({ error: '無權讀取先前帶入的物品' }, 403);
      if (!access) return c.json({ error: '先前帶入的物品已刪除，重試不會重新建立' }, 409);
      return c.json({ success: true, item: { ...access.item, isStored: Boolean(access.item.isStored) } });
    }
  } else {
    await db.insert(items).values(newItem);
  }

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
  const todayStr = businessDate();
  const updatedItems: any[] = [];

  for (const id of itemIds) {
    const access = await checkItemAccess(db, id, user.id, 'edit');
    if (!access) continue;

    const existing = access.item;
    if (existing.isStored || (existing.trackingMode !== 'cycle' && existing.trackingMode !== 'pao' && existing.trackingMode !== 'quantity')) continue;
    const isQuantity = existing.trackingMode === 'quantity';
    const newStock = Math.max(0, existing.backupStock - 1);
    const updatedData: any = {
      startDate: todayStr,
      backupStock: newStock,
      snoozeUntil: null,
      calendarSequence: existing.calendarSequence + 1,
      updatedAt: nowIso,
    };
    if (isQuantity) {
      updatedData.currentQuantity = existing.initialQuantity ?? 60;
      updatedData.quantityUpdatedAt = nowIso;
    }

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

    await db.update(items).set({
      deletedAt: nowIso,
      calendarSequence: access.item.calendarSequence + 1,
      updatedAt: nowIso,
    }).where(eq(items.id, id));
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

  let activeUnitsCount = body.activeUnits !== undefined ? Math.min(30, Math.max(1, Math.floor(Number(body.activeUnits) || 1))) : (existing.activeUnits ?? 1);
  let finalActiveUnitsDataStr = existing.activeUnitsData;

  if (body.activeUnitsData !== undefined) {
    if (body.activeUnitsData === null) {
      finalActiveUnitsDataStr = null;
    } else {
      let parsed: any[] = [];
      try {
        parsed = typeof body.activeUnitsData === 'string' ? JSON.parse(body.activeUnitsData) : body.activeUnitsData;
      } catch {
        parsed = [];
      }
      if (Array.isArray(parsed) && parsed.length > 0) {
        const bounded = parsed.slice(0, 30);
        activeUnitsCount = bounded.length;
        finalActiveUnitsDataStr = JSON.stringify(
          bounded.map((u, i) => ({
            id: u.id || `u-${crypto.randomUUID().slice(0, 8)}`,
            label: typeof u.label === 'string' && u.label.trim() ? u.label.trim() : `位置 ${i + 1}`,
            startDate: typeof u.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(u.startDate) ? u.startDate : (body.startDate || existing.startDate),
          }))
        );
      } else {
        finalActiveUnitsDataStr = null;
      }
    }
  }

  const updatedData: any = {
    name: body.name !== undefined ? body.name.trim() : existing.name,
    category: body.category || existing.category,
    trackingMode: body.trackingMode || existing.trackingMode,
    cycleDays: body.cycleDays !== undefined ? body.cycleDays : existing.cycleDays,
    startDate: body.startDate || existing.startDate,
    paoMonths: body.paoMonths !== undefined ? body.paoMonths : existing.paoMonths,
    expiryDate: body.expiryDate !== undefined ? body.expiryDate : existing.expiryDate,
    warrantyDate: body.warrantyDate !== undefined ? body.warrantyDate : existing.warrantyDate,
    initialQuantity: body.initialQuantity !== undefined ? (body.initialQuantity !== null ? Math.max(1, body.initialQuantity) : null) : existing.initialQuantity,
    currentQuantity: body.currentQuantity !== undefined ? (body.currentQuantity !== null ? Math.max(0, body.currentQuantity) : null) : existing.currentQuantity,
    dailyUsage: body.dailyUsage !== undefined ? (body.dailyUsage !== null ? Math.max(0.01, body.dailyUsage) : null) : existing.dailyUsage,
    quantityUnit: body.quantityUnit !== undefined ? (body.quantityUnit?.trim() || null) : existing.quantityUnit,
    activeUnits: activeUnitsCount,
    activeUnitsData: finalActiveUnitsDataStr,
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
    quantityUpdatedAt: (body.currentQuantity !== undefined && body.currentQuantity !== existing.currentQuantity)
      ? nowIso
      : (body.quantityUpdatedAt !== undefined ? body.quantityUpdatedAt : existing.quantityUpdatedAt),
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
  const todayStr = businessDate();

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
  const snoozeUntilStr = addBusinessDays(new Date(), Math.max(1, days));
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

// 10. One-tap "Mark Replaced Today" action (Supports targeted unit replacement via { unitId })
itemsRouter.post('/:id/replace', async (c) => {
  const user = c.get('user')!;
  const itemId = c.req.param('id');
  const body = await c.req.json<{ unitId?: string }>().catch(() => ({ unitId: undefined }));
  const db = getDb(c.env.DB);

  const access = await checkItemAccess(db, itemId, user.id, 'edit');
  if (access === null) return c.json({ error: '找不到該物品' }, 404);
  if (access === false) return c.json({ error: '權限不足' }, 403);

  const existing = access.item;
  if (existing.isStored || (existing.trackingMode !== 'cycle' && existing.trackingMode !== 'pao' && existing.trackingMode !== 'quantity')) {
    return c.json({ error: '只有啟用中的週期、開封保存期或數量耗用物品可以標記更換' }, 400);
  }
  const nowIso = new Date().toISOString();
  const todayStr = businessDate();
  const newStock = Math.max(0, existing.backupStock - 1);
  let existingUnits: ActiveUnitInstance[] = [];
  if (existing.activeUnitsData) {
    try {
      existingUnits = typeof existing.activeUnitsData === 'string' ? JSON.parse(existing.activeUnitsData) : existing.activeUnitsData;
    } catch {
      existingUnits = [];
    }
  }

  const isMultiUnit = Array.isArray(existingUnits) && existingUnits.length > 1;
  const resetQty = existing.trackingMode === 'quantity'
    ? (isMultiUnit ? existing.currentQuantity : (existing.initialQuantity ?? 60))
    : null;

  let replacedUnitLabel: string | null = null;
  let updatedUnitsDataStr: string | null = existing.activeUnitsData;
  let newStartDate = todayStr;

  if (Array.isArray(existingUnits) && existingUnits.length > 0) {
    let targetIndex = -1;
    if (body?.unitId) {
      targetIndex = existingUnits.findIndex((u) => u.id === body.unitId);
    }
    if (targetIndex === -1) {
      // If unitId was not given or not found, target the unit with the earliest startDate (most overdue)
      const sortedWithIndex = existingUnits.map((u, i) => ({ u, i })).sort((a, b) => (a.u.startDate || '').localeCompare(b.u.startDate || ''));
      targetIndex = sortedWithIndex[0]?.i ?? -1;
    }

    if (targetIndex !== -1) {
      replacedUnitLabel = existingUnits[targetIndex].label;
      existingUnits[targetIndex] = {
        ...existingUnits[targetIndex],
        startDate: todayStr,
      };
      updatedUnitsDataStr = JSON.stringify(existingUnits);
      const sortedDates = existingUnits.map((u) => u.startDate).sort();
      newStartDate = sortedDates[0] || todayStr;
    }
  }

  await db
    .update(items)
    .set({
      startDate: newStartDate,
      backupStock: newStock,
      currentQuantity: resetQty,
      activeUnitsData: updatedUnitsDataStr,
      snoozeUntil: null,
      calendarSequence: existing.calendarSequence + 1,
      updatedAt: nowIso,
      quantityUpdatedAt: nowIso,
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
    notes: replacedUnitLabel
      ? `已換新【${replacedUnitLabel}】（維持 ${existing.activeUnits || existingUnits.length} 在用），備品扣減 1`
      : (existing.trackingMode === 'quantity'
        ? (existing.backupStock > 0
            ? (existing.activeUnits && existing.activeUnits > 1
                ? `已開啟新備品替換 1 ${existing.quantityUnit === '顆' ? '瓶' : (existing.quantityUnit || '包')}（維持 ${existing.activeUnits} ${existing.quantityUnit || '包'}在用），備品扣減 1`
                : `已開啟新一${existing.quantityUnit === '顆' ? '瓶' : '包'}，備品扣減 1`)
            : '已重置數量，備品已耗盡')
        : (existing.backupStock > 0
            ? (existing.activeUnits && existing.activeUnits > 1
                ? `已開封新備品替換 1 件（維持 ${existing.activeUnits} 件在用），備品扣減 1`
                : '已扣減 1 個備品庫存')
            : '無備品庫存（需採購）')),
  };
  await db.insert(itemHistory).values(historyRecord);

  return c.json({
    success: true,
    message: replacedUnitLabel
      ? `已換新【${replacedUnitLabel}】！`
      : (existing.activeUnits && existing.activeUnits > 1
          ? (existing.trackingMode === 'quantity' ? `已開啟新備品（維持 ${existing.activeUnits} 在用）！` : `已開封新備品（維持 ${existing.activeUnits} 在用）！`)
          : (existing.trackingMode === 'quantity' ? '已開啟新備品！容量已重置' : '已記錄更換！計時器已重置')),
    newStock,
    startDate: newStartDate,
    activeUnitsData: existingUnits.length > 0 ? existingUnits : null,
    currentQuantity: resetQty,
  });
});

// 11. Consume quantity (e.g. -2 fish oil pills or -1 trash bag)
itemsRouter.post('/:id/consume', async (c) => {
  const user = c.get('user')!;
  const itemId = c.req.param('id');
  const body = await c.req.json<{ amount?: number }>().catch(() => ({ amount: undefined }));
  const db = getDb(c.env.DB);

  const access = await checkItemAccess(db, itemId, user.id, 'edit');
  if (access === null) return c.json({ error: '找不到該物品' }, 404);
  if (access === false) return c.json({ error: '權限不足' }, 403);

  const existing = access.item;
  if (existing.isStored || existing.trackingMode !== 'quantity') {
    return c.json({ error: '只有啟用中的數量耗用物品可以記錄耗用' }, 400);
  }

  const consumeAmount = Math.max(0.01, body.amount ?? existing.dailyUsage ?? 1);
  const now = new Date();
  const status = computeItemStatus(existing, now);
  const currentRem = status.remainingQuantity ?? existing.initialQuantity ?? 60;
  const newCurrentQuantity = Math.max(0, Math.round((currentRem - consumeAmount) * 100) / 100);
  const nowIso = now.toISOString();

  await db
    .update(items)
    .set({
      currentQuantity: newCurrentQuantity,
      updatedAt: nowIso,
      quantityUpdatedAt: nowIso,
    })
    .where(eq(items.id, itemId));

  return c.json({
    success: true,
    message: `已記錄耗用 ${consumeAmount} ${existing.quantityUnit || '個'}`,
    currentQuantity: newCurrentQuantity,
  });
});

// 12. Undo replace operation (rollback startDate, backupStock, snooze, and delete history entry)
itemsRouter.post('/:id/undo-replace', async (c) => {
  const user = c.get('user')!;
  const itemId = c.req.param('id');
  const body = await c.req.json<{
    previousStartDate?: string;
    previousBackupStock?: number;
    previousSnoozeUntil?: string | null;
    previousCurrentQuantity?: number | null;
    previousQuantityUpdatedAt?: string | null;
    previousActiveUnitsData?: string | null;
  }>().catch(() => ({}));
  const db = getDb(c.env.DB);

  const access = await checkItemAccess(db, itemId, user.id, 'edit');
  if (access === null) return c.json({ error: '找不到該物品' }, 404);
  if (access === false) return c.json({ error: '權限不足' }, 403);

  const existing = access.item;
  const nowIso = new Date().toISOString();

  // Find latest history entry to clean up
  const latestHistory = await db
    .select()
    .from(itemHistory)
    .where(eq(itemHistory.itemId, itemId))
    .orderBy(desc(itemHistory.replacedAt))
    .limit(1)
    .get();

  const restoredStartDate = body.previousStartDate || (latestHistory ? latestHistory.previousStartDate : existing.startDate);
  let restoredStock = existing.backupStock;
  if (typeof body.previousBackupStock === 'number') {
    restoredStock = body.previousBackupStock;
  } else if (latestHistory && latestHistory.notes?.includes('備品扣減 1')) {
    restoredStock = existing.backupStock + 1;
  } else if (latestHistory && latestHistory.notes?.includes('已扣減 1 個備品庫存')) {
    restoredStock = existing.backupStock + 1;
  }

  const restoredSnooze = body.previousSnoozeUntil !== undefined ? body.previousSnoozeUntil : existing.snoozeUntil;
  const restoredQuantity = body.previousCurrentQuantity !== undefined ? body.previousCurrentQuantity : existing.currentQuantity;
  const restoredQuantityUpdatedAt = body.previousQuantityUpdatedAt !== undefined ? body.previousQuantityUpdatedAt : existing.quantityUpdatedAt;
  const restoredActiveUnitsData = body.previousActiveUnitsData !== undefined ? body.previousActiveUnitsData : existing.activeUnitsData;

  await db
    .update(items)
    .set({
      startDate: restoredStartDate,
      backupStock: restoredStock,
      currentQuantity: restoredQuantity,
      quantityUpdatedAt: restoredQuantityUpdatedAt,
      activeUnitsData: restoredActiveUnitsData,
      snoozeUntil: restoredSnooze,
      calendarSequence: existing.calendarSequence + 1,
      updatedAt: nowIso,
    })
    .where(eq(items.id, itemId));

  if (latestHistory) {
    await db.delete(itemHistory).where(eq(itemHistory.id, latestHistory.id));
  }

  return c.json({
    success: true,
    message: '已成功復原更換狀態',
    item: {
      ...existing,
      startDate: restoredStartDate,
      backupStock: restoredStock,
      currentQuantity: restoredQuantity,
      quantityUpdatedAt: restoredQuantityUpdatedAt,
      snoozeUntil: restoredSnooze,
    },
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
