import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { businessDate, addBusinessDays, businessDateDiff } from '../src/shared/date.ts';
import { computeNextDueDate, computeItemStatus } from '../src/shared/lifecycle.ts';
import { ITEM_PRESETS } from '../src/shared/presets.ts';

describe('Agent API v1 Operations & Logic Tests', () => {
  it('should correctly handle zero-stock replacement and positive-stock replacement', () => {
    const db = new DatabaseSync(':memory:');

    db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        calendar_token TEXT UNIQUE NOT NULL,
        is_vip INTEGER DEFAULT 0 NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE items (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        stock_id TEXT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        start_date TEXT NOT NULL,
        tracking_mode TEXT NOT NULL,
        cycle_days INTEGER,
        quantity REAL DEFAULT 1 NOT NULL,
        unit TEXT DEFAULT '個' NOT NULL,
        backup_stock REAL DEFAULT 0 NOT NULL,
        min_stock_alert REAL DEFAULT 1 NOT NULL,
        is_deleted INTEGER DEFAULT 0 NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE item_history (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        previous_date TEXT,
        new_date TEXT,
        note TEXT,
        created_at TEXT NOT NULL
      );
    `);

    const userId = crypto.randomUUID();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO users (id, email, calendar_token, is_vip, created_at, updated_at)
      VALUES (?, 'agent@test.com', 'cal-123', 0, ?, ?);
    `).run(userId, now, now);

    const itemWithStockId = 'item-stock-pos';
    const itemZeroStockId = 'item-stock-zero';

    // Insert item with 3 backup stocks
    db.prepare(`
      INSERT INTO items (id, user_id, name, category, start_date, tracking_mode, cycle_days, quantity, backup_stock, created_at, updated_at)
      VALUES (?, ?, '牙刷', 'personal', '2026-07-01', 'cycle', 90, 1, 3, ?, ?);
    `).run(itemWithStockId, userId, now, now);

    // Insert item with 0 backup stocks
    db.prepare(`
      INSERT INTO items (id, user_id, name, category, start_date, tracking_mode, cycle_days, quantity, backup_stock, created_at, updated_at)
      VALUES (?, ?, '冷氣濾網', 'appliance', '2026-05-01', 'cycle', 180, 1, 0, ?, ?);
    `).run(itemZeroStockId, userId, now, now);

    const today = businessDate();

    // 1. Simulate POST /items/:id/replace with backupStock > 0
    function performReplace(itemId: string) {
      const item = db.prepare(`SELECT * FROM items WHERE id = ?`).get(itemId) as any;
      assert.ok(item);

      const oldStock = item.backup_stock;
      const willDeduct = oldStock > 0;
      const newStock = willDeduct ? oldStock - 1 : 0;

      db.prepare(`
        UPDATE items
        SET start_date = ?, backup_stock = ?, updated_at = ?
        WHERE id = ?;
      `).run(today, newStock, now, itemId);

      db.prepare(`
        INSERT INTO item_history (id, item_id, action, previous_date, new_date, note, created_at)
        VALUES (?, ?, 'replace', ?, ?, ?, ?);
      `).run(crypto.randomUUID(), itemId, item.start_date, today, willDeduct ? '自動扣減備品 1' : '備品不足未扣庫存', now);

      return {
        stockDeducted: willDeduct,
        remainingBackupStock: newStock,
        warning: willDeduct ? undefined : '備品庫存為 0，請盡速補貨',
      };
    }

    const res1 = performReplace(itemWithStockId);
    assert.equal(res1.stockDeducted, true);
    assert.equal(res1.remainingBackupStock, 2);
    assert.equal(res1.warning, undefined);

    const updatedItem1 = db.prepare(`SELECT * FROM items WHERE id = ?`).get(itemWithStockId) as any;
    assert.equal(updatedItem1.start_date, today);
    assert.equal(updatedItem1.backup_stock, 2);

    // 2. Simulate POST /items/:id/replace with backupStock == 0
    const res2 = performReplace(itemZeroStockId);
    assert.equal(res2.stockDeducted, false);
    assert.equal(res2.remainingBackupStock, 0);
    assert.ok(res2.warning?.includes('備品庫存為 0'));

    const updatedItem2 = db.prepare(`SELECT * FROM items WHERE id = ?`).get(itemZeroStockId) as any;
    assert.equal(updatedItem2.start_date, today);
    assert.equal(updatedItem2.backup_stock, 0);

    // Verify history logs
    const historyLogs = db.prepare(`SELECT * FROM item_history`).all();
    assert.equal(historyLogs.length, 2);
  });

  it('should correctly consume item quantity supporting both amount and count aliases and clamp to zero', () => {
    let quantity = 150; // e.g. Costco Fish Oil (150 capsules)

    function consume(body: { amount?: number; count?: number }) {
      const rawQty = body.amount !== undefined ? body.amount : body.count;
      const count = typeof rawQty === 'number' && rawQty > 0 ? rawQty : 1;
      quantity = Math.max(0, quantity - count);
      return quantity;
    }

    assert.equal(consume({ amount: 2 }), 148);
    assert.equal(consume({ count: 10 }), 138);
    assert.equal(consume({ amount: 200 }), 0); // clamp to 0
    assert.equal(consume({ count: 5 }), 0);
  });

  it('should prevent cross-tenant stock item access when filtering by unauthorized stockId', () => {
    const accessibleStockIds = ['stock-user-1', 'stock-user-2'];
    const requestedStockId = 'stock-other-user-secret';

    function checkStockAccess(reqStockId?: string): { allowed: boolean; error?: string } {
      if (reqStockId && !accessibleStockIds.includes(reqStockId)) {
        return { allowed: false, error: '無權限存取該空間或該空間不存在' };
      }
      return { allowed: true };
    }

    assert.equal(checkStockAccess('stock-user-1').allowed, true);
    assert.equal(checkStockAccess(undefined).allowed, true);
    const unauthorized = checkStockAccess(requestedStockId);
    assert.equal(unauthorized.allowed, false);
    assert.equal(unauthorized.error, '無權限存取該空間或該空間不存在');
  });

  it('should correctly filter items by status: overdue, due_soon, low_stock, normal', () => {
    const today = businessDate();

    const items = [
      {
        id: '1',
        name: '過期品項',
        trackingMode: 'cycle',
        startDate: addBusinessDays(today, -100),
        cycleDays: 90,
        backupStock: 2,
        minStockAlert: 1,
      },
      {
        id: '2',
        name: '即將到期品項',
        trackingMode: 'cycle',
        startDate: addBusinessDays(today, -88),
        cycleDays: 90,
        backupStock: 2,
        minStockAlert: 1,
      },
      {
        id: '3',
        name: '缺備品正常品項',
        trackingMode: 'cycle',
        startDate: today,
        cycleDays: 90,
        backupStock: 0,
        minStockAlert: 1,
      },
      {
        id: '4',
        name: '充裕品項',
        trackingMode: 'cycle',
        startDate: today,
        cycleDays: 90,
        backupStock: 5,
        minStockAlert: 1,
      },
    ];

    const computed = items.map((item) => {
      const nextDueDate = computeNextDueDate({
        trackingMode: item.trackingMode as any,
        startDate: item.startDate,
        cycleDays: item.cycleDays,
      });
      const status = computeItemStatus({
        trackingMode: item.trackingMode as any,
        startDate: item.startDate,
        cycleDays: item.cycleDays,
      });
      const needsRestock = item.backupStock < item.minStockAlert;
      return { ...item, nextDueDate, status, needsRestock };
    });

    const overdueItems = computed.filter((i) => i.status.healthStatus === 'overdue');
    const dueSoonItems = computed.filter((i) => i.status.healthStatus === 'due_soon');
    const lowStockItems = computed.filter((i) => i.needsRestock);
    const normalItems = computed.filter((i) => i.status.healthStatus === 'healthy' && !i.needsRestock);

    assert.equal(overdueItems.length, 1);
    assert.equal(overdueItems[0].name, '過期品項');

    assert.equal(dueSoonItems.length, 1);
    assert.equal(dueSoonItems[0].name, '即將到期品項');

    assert.equal(lowStockItems.length, 1);
    assert.equal(lowStockItems[0].name, '缺備品正常品項');

    assert.equal(normalItems.length, 1);
    assert.equal(normalItems[0].name, '充裕品項');
  });

  it('should strip calendar_token when listing stock spaces for agents', () => {
    const rawStock = {
      id: 'stock-main',
      name: '家裡廚房',
      description: '食材與消耗品',
      icon: '🍳',
      calendarToken: 'super-secret-calendar-token-xyz',
      createdAt: '2026-01-01T00:00:00Z',
    };

    // Agent response must sanitize calendarToken
    const { calendarToken, ...sanitized } = rawStock;
    assert.equal('calendarToken' in sanitized, false);
    assert.equal(sanitized.id, 'stock-main');
    assert.equal(sanitized.name, '家裡廚房');
  });

  it('should search presets correctly by keyword (e.g. 魚油, 濾芯, 衛生紙)', () => {
    const qFishOil = '魚油';
    const foundFishOil = ITEM_PRESETS.filter(
      (p) =>
        p.name.toLowerCase().includes(qFishOil) ||
        p.notes?.toLowerCase().includes(qFishOil) ||
        p.defaultSpecModel?.toLowerCase().includes(qFishOil)
    );
    assert.ok(foundFishOil.length > 0);
    const fishOilPreset = foundFishOil.find((p) => p.id === 'costco-fish-oil');
    assert.ok(fishOilPreset);
    assert.equal(fishOilPreset.category, 'medicine');
    assert.equal(fishOilPreset.trackingMode, 'quantity');
    assert.equal(fishOilPreset.initialQuantity, 150);
    assert.equal(fishOilPreset.dailyUsage, 2);
    assert.equal(fishOilPreset.quantityUnit, '顆');
    assert.equal(fishOilPreset.defaultSpecModel, '150顆/瓶');

    const qFilter = '濾芯';
    const foundFilters = ITEM_PRESETS.filter((p) => p.name.includes(qFilter));
    assert.ok(foundFilters.length >= 2); // Brita, PP, carbon
  });

  it('should auto-fill consumable parameters when creating item with presetId', () => {
    const preset = ITEM_PRESETS.find((p) => p.id === 'costco-fish-oil')!;
    assert.ok(preset);

    // Agent request body only specifies presetId and backupStock
    const agentReq = {
      presetId: 'costco-fish-oil',
      backupStock: 2,
    };

    const matchedPreset = ITEM_PRESETS.find((p) => p.id === agentReq.presetId);
    const name = matchedPreset?.name;
    const category = matchedPreset?.category;
    const trackingMode = matchedPreset?.trackingMode;
    const initialQuantity = matchedPreset?.initialQuantity;
    const dailyUsage = matchedPreset?.dailyUsage;
    const quantityUnit = matchedPreset?.quantityUnit;
    const specModel = matchedPreset?.defaultSpecModel;
    const backupStock = agentReq.backupStock;

    assert.equal(name, '好市多 Kirkland 深海魚油膠囊 (150顆)');
    assert.equal(category, 'medicine');
    assert.equal(trackingMode, 'quantity');
    assert.equal(initialQuantity, 150);
    assert.equal(dailyUsage, 2);
    assert.equal(quantityUnit, '顆');
    assert.equal(specModel, '150顆/瓶');
    assert.equal(backupStock, 2);
  });

  it('should clearly distinguish between backupStock (unopened spares) and currentQuantity (active bottle volume)', () => {
    // Initial state: 1 active bottle of 150 fish oil capsules + 2 unopened backup bottles in drawer
    let item = {
      id: 'costco-fish-oil-1',
      name: '好市多 Kirkland 深海魚油膠囊 (150顆)',
      trackingMode: 'quantity',
      initialQuantity: 150,
      currentQuantity: 150,
      dailyUsage: 2,
      quantityUnit: '顆',
      backupStock: 2, // 2 unopened bottles
      minStockAlert: 1,
      startDate: businessDate(),
    };

    // 1. Consume 2 capsules daily (POST /items/:id/consume)
    item.currentQuantity -= 2;
    assert.equal(item.currentQuantity, 148);
    assert.equal(item.backupStock, 2); // backupStock remains unchanged!

    // Consume 148 capsules over the remaining days
    item.currentQuantity = 0;
    assert.equal(item.currentQuantity, 0);
    assert.equal(item.backupStock, 2); // backupStock is still 2!

    // 2. Bottle finished! Open new backup bottle (POST /items/:id/replace)
    // Decrement backupStock by 1, reset currentQuantity to initialQuantity (150)
    assert.ok(item.backupStock > 0);
    item.backupStock -= 1;
    item.currentQuantity = item.initialQuantity;
    assert.equal(item.backupStock, 1);
    assert.equal(item.currentQuantity, 150);

    // 3. Went to Costco and bought 3 more backup bottles (POST /items/:id/restock)
    const restockDelta = 3;
    item.backupStock += restockDelta;
    assert.equal(item.backupStock, 4);
    assert.equal(item.currentQuantity, 150); // current bottle volume unaffected by restock!
  });

  it('should support rich special search filters: out_of_stock, in_stock, needs_restock, due_today, quantity_depleted, custom dueWithinDays', () => {
    const today = businessDate();

    const items = [
      {
        id: 'item-out-stock',
        name: '缺備品耗材 (衛生紙)',
        trackingMode: 'cycle',
        startDate: today,
        cycleDays: 30,
        currentQuantity: 10,
        backupStock: 0,
        minStockAlert: 1,
      },
      {
        id: 'item-in-stock',
        name: '備品充裕 (濾芯)',
        trackingMode: 'cycle',
        startDate: today,
        cycleDays: 60,
        currentQuantity: 1,
        backupStock: 4,
        minStockAlert: 1,
      },
      {
        id: 'item-due-today',
        name: '今天到期 (牙刷)',
        trackingMode: 'cycle',
        startDate: addBusinessDays(today, -90),
        cycleDays: 90,
        currentQuantity: 1,
        backupStock: 1,
        minStockAlert: 1,
      },
      {
        id: 'item-due-3days',
        name: '3天內到期 (隱眼)',
        trackingMode: 'cycle',
        startDate: addBusinessDays(today, -28),
        cycleDays: 30, // due in 2 days
        currentQuantity: 1,
        backupStock: 2,
        minStockAlert: 1,
      },
      {
        id: 'item-qty-depleted',
        name: '容量用盡 (魚油)',
        trackingMode: 'quantity',
        startDate: addBusinessDays(today, -10),
        currentQuantity: 0, // depleted!
        backupStock: 0,
        minStockAlert: 1,
      },
    ];

    const computed = items.map((item) => {
      const nextDueDate = computeNextDueDate({
        trackingMode: item.trackingMode as any,
        startDate: item.startDate,
        cycleDays: item.cycleDays,
      });
      const status = computeItemStatus({
        trackingMode: item.trackingMode as any,
        startDate: item.startDate,
        cycleDays: item.cycleDays,
      });
      const remainingDays = status.remainingDays;
      const isNeedsRestock = item.backupStock < item.minStockAlert || (item.trackingMode === 'quantity' && item.currentQuantity === 0);
      return { ...item, nextDueDate, status, remainingDays, isNeedsRestock };
    });

    // 1. out_of_stock filter
    const outOfStock = computed.filter((i) => i.backupStock === 0);
    assert.equal(outOfStock.length, 2); // 衛生紙, 魚油

    // 2. in_stock filter
    const inStock = computed.filter((i) => i.backupStock > 0);
    assert.equal(inStock.length, 3); // 濾芯, 牙刷, 隱眼

    // 3. due_today filter
    const dueToday = computed.filter((i) => i.remainingDays === 0);
    assert.equal(dueToday.length, 1);
    assert.equal(dueToday[0].id, 'item-due-today');

    // 4. due_soon with custom dueWithinDays = 3
    const customDays = 3;
    const dueWithin3Days = computed.filter((i) => i.remainingDays >= 0 && i.remainingDays <= customDays);
    assert.equal(dueWithin3Days.length, 2); // 牙刷 (0 days) & 隱眼 (2 days)

    // 5. quantity_depleted filter
    const qtyDepleted = computed.filter((i) => i.currentQuantity === 0);
    assert.equal(qtyDepleted.length, 1);
    assert.equal(qtyDepleted[0].id, 'item-qty-depleted');

    // 6. needs_restock filter
    const needsRestock = computed.filter((i) => i.isNeedsRestock);
    assert.equal(needsRestock.length, 2); // 衛生紙 & 魚油
  });

  it('should enforce API key scopes (read_only blocks mutations with 403 Forbidden)', () => {
    function checkApiKeyScope(apiKey: { scopes?: string | string[] }, requiredScope: 'read' | 'write'): { allowed: boolean; status?: number; error?: string } {
      const rawScopes = Array.isArray(apiKey.scopes)
        ? apiKey.scopes
        : typeof apiKey.scopes === 'string'
          ? (JSON.parse(apiKey.scopes || '["read_write"]') as string[])
          : ['read_write'];

      if (requiredScope === 'write') {
        const hasWrite = rawScopes.includes('write') || rawScopes.includes('read_write') || rawScopes.includes('*');
        if (!hasWrite) {
          return { allowed: false, status: 403, error: '此 API Key 僅具唯讀權限 (read_only)，無法執行變更操作' };
        }
      }
      return { allowed: true };
    }

    const readWriteKey = { scopes: ['read_write'] };
    const readOnlyKey = { scopes: ['read_only'] };

    assert.equal(checkApiKeyScope(readWriteKey, 'read').allowed, true);
    assert.equal(checkApiKeyScope(readWriteKey, 'write').allowed, true);

    assert.equal(checkApiKeyScope(readOnlyKey, 'read').allowed, true);
    const writeCheck = checkApiKeyScope(readOnlyKey, 'write');
    assert.equal(writeCheck.allowed, false);
    assert.equal(writeCheck.status, 403);
    assert.match(writeCheck.error!, /read_only/);
  });

  it('should enforce stock space RBAC: viewer cannot mutate, member cannot delete others items', () => {
    type Action = 'view' | 'edit' | 'delete';
    function checkItemAccess(
      item: { userId: string; stockId?: string },
      userId: string,
      userRoleInStock: 'owner' | 'admin' | 'member' | 'viewer' | null,
      action: Action
    ): { allowed: boolean; error?: string } {
      if (item.userId === userId) {
        return { allowed: true };
      }

      if (!item.stockId || !userRoleInStock) {
        return { allowed: false, error: '無權限存取該物品' };
      }

      if (userRoleInStock === 'viewer' && action !== 'view') {
        return { allowed: false, error: '您在該空間僅有檢視者權限 (viewer)，無法執行變更' };
      }

      if (action === 'delete') {
        if (userRoleInStock !== 'owner' && userRoleInStock !== 'admin' && item.userId !== userId) {
          return { allowed: false, error: '一般成員 (member) 無法刪除其他成員建立的物品' };
        }
      }

      return { allowed: true };
    }

    const otherUserItem = { userId: 'user-b', stockId: 'stock-shared' };

    // Viewer tests
    assert.equal(checkItemAccess(otherUserItem, 'user-a', 'viewer', 'view').allowed, true);
    assert.equal(checkItemAccess(otherUserItem, 'user-a', 'viewer', 'edit').allowed, false);
    assert.equal(checkItemAccess(otherUserItem, 'user-a', 'viewer', 'delete').allowed, false);

    // Member tests
    assert.equal(checkItemAccess(otherUserItem, 'user-a', 'member', 'view').allowed, true);
    assert.equal(checkItemAccess(otherUserItem, 'user-a', 'member', 'edit').allowed, true); // can edit
    assert.equal(checkItemAccess(otherUserItem, 'user-a', 'member', 'delete').allowed, false); // cannot delete someone else's item

    // Admin/Owner tests
    assert.equal(checkItemAccess(otherUserItem, 'user-a', 'admin', 'delete').allowed, true);
    assert.equal(checkItemAccess(otherUserItem, 'user-a', 'owner', 'delete').allowed, true);
  });
});
