import { Hono } from 'hono';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { HonoEnv } from '../types.ts';
import { requireAuth } from '../middleware/auth.ts';
import { getDb, items, itemHistory, stocks, stockMembers } from '../db/index.ts';
import { computeItemStatus, computeNextDueDate } from '../../shared/lifecycle.ts';
import { businessDate } from '../../shared/date.ts';
import { ItemCategory, TrackingMode, StockRole } from '../../shared/types.ts';
import { ensureUserDefaultStock } from './stocks.ts';
import { ITEM_PRESETS } from '../../shared/presets.ts';

export const agentApiRouter = new Hono<HonoEnv>();

/**
 * GET /api/v1/presets: Search or list common household consumable presets
 * Publicly accessible so AI Agents can discover standard templates like Costco Fish Oil (150 capsules), water filters, etc.
 */
agentApiRouter.get('/presets', (c) => {
  const q = c.req.query('q')?.trim().toLowerCase();
  const category = c.req.query('category');

  let list = ITEM_PRESETS;
  if (category) {
    list = list.filter((p) => p.category === category);
  }
  if (q) {
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.notes?.toLowerCase().includes(q) ||
        p.defaultSpecModel?.toLowerCase().includes(q)
    );
  }

  return c.json({ presets: list, total: list.length });
});

// 1. OpenAPI 3.1 Specification Endpoint (Publicly accessible for ChatGPT Actions and API explorers)
agentApiRouter.get('/openapi.json', (c) => {
  const origin = c.env.APP_ORIGIN || 'https://afterbuy.david888.com';

  const openApiDoc = {
    openapi: '3.1.0',
    info: {
      title: 'afterBUY Consumable & Inventory Management API',
      version: '2026.10.07.1',
      description:
        'RESTful API for AI Agents to manage home & personal consumables, interval replacement countdowns, warranty dates, and spare stock inventory.',
      contact: {
        name: 'afterBUY Support',
        url: 'https://afterbuy.app',
      },
    },
    servers: [
      {
        url: origin,
        description: 'Current Environment API Server',
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'Provide your afterBUY Personal API Key (Format: ab_live_...)',
        },
      },
      schemas: {
        Item: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            stockId: { type: 'string' },
            name: { type: 'string', example: 'Oral-B 電動牙刷刷頭' },
            category: {
              type: 'string',
              enum: ['bathroom', 'kitchen', 'medicine', 'skincare', 'appliances', 'clothing', 'electronics', 'general'],
            },
            trackingMode: {
              type: 'string',
              enum: ['cycle', 'pao', 'expiry', 'warranty', 'quantity'],
            },
            cycleDays: { type: 'integer', example: 90 },
            startDate: { type: 'string', format: 'date', example: '2026-10-07' },
            paoMonths: { type: 'integer', example: 6 },
            expiryDate: { type: 'string', format: 'date' },
            warrantyDate: { type: 'string', format: 'date' },
            initialQuantity: { type: 'number', example: 150 },
            currentQuantity: { type: 'number', example: 120 },
            dailyUsage: { type: 'number', example: 2 },
            quantityUnit: { type: 'string', example: '顆' },
            activeUnits: { type: 'integer', example: 1, description: 'Number of active units concurrently opened/in-use across rooms' },
            backupStock: { type: 'integer', example: 2 },
            minStockAlert: { type: 'integer', example: 1 },
            price: { type: 'number', example: 699 },
            specModel: { type: 'string', example: '150顆/瓶' },
            location: { type: 'string', example: '客廳藥箱' },
            isStored: { type: 'boolean', example: false },
            notes: { type: 'string' },
            imageUrl: { type: 'string' },
            healthStatus: {
              type: 'string',
              enum: ['normal', 'due_soon', 'overdue', 'stored', 'snoozed'],
            },
            nextDueDate: { type: 'string', format: 'date' },
            remainingDays: { type: 'integer', example: 45 },
            needsRestock: { type: 'boolean', example: false },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/api/v1/items': {
        get: {
          summary: 'List consumables with status filters',
          operationId: 'listItems',
          parameters: [
            {
              name: 'status',
              in: 'query',
              schema: {
                type: 'string',
                enum: [
                  'all',
                  'overdue',
                  'due_today',
                  'due_soon',
                  'low_stock',
                  'out_of_stock',
                  'in_stock',
                  'needs_restock',
                  'quantity_depleted',
                  'normal',
                  'stored',
                  'snoozed',
                ],
              },
              description: 'Primary filter: overdue, due_today, due_soon (countdown), low_stock (<minStockAlert), out_of_stock (0 spares), in_stock (>0 spares), needs_restock (low stock or 0 quantity), quantity_depleted (active bottle empty), stored (paused), snoozed',
            },
            {
              name: 'stockStatus',
              in: 'query',
              schema: { type: 'string', enum: ['all', 'in_stock', 'out_of_stock', 'low_stock'] },
              description: 'Filter strictly by unopened backup spare stock in drawer/cabinet',
            },
            {
              name: 'dueWithinDays',
              in: 'query',
              schema: { type: 'integer', example: 7 },
              description: 'Custom threshold for due_soon items (e.g. 3, 7, 14, 30 days)',
            },
            {
              name: 'category',
              in: 'query',
              schema: { type: 'string' },
              description: 'Filter by item category (bathroom, kitchen, medicine, skincare, appliances, clothing, electronics, general)',
            },
            {
              name: 'trackingMode',
              in: 'query',
              schema: { type: 'string', enum: ['cycle', 'quantity', 'pao', 'expiry', 'warranty'] },
              description: 'Filter by tracking mode',
            },
            {
              name: 'isStored',
              in: 'query',
              schema: { type: 'boolean' },
              description: 'Filter items stored / not yet in active use',
            },
            {
              name: 'dueBefore',
              in: 'query',
              schema: { type: 'string', format: 'date' },
              description: 'Filter items expiring or due on or before YYYY-MM-DD',
            },
            {
              name: 'dueAfter',
              in: 'query',
              schema: { type: 'string', format: 'date' },
              description: 'Filter items expiring or due on or after YYYY-MM-DD',
            },
            {
              name: 'location',
              in: 'query',
              schema: { type: 'string' },
              description: 'Filter by home storage location (e.g. 客廳藥箱, 浴室鏡櫃)',
            },
            {
              name: 'q',
              in: 'query',
              schema: { type: 'string' },
              description: 'Search keyword matching item name, model, notes, or location',
            },
            {
              name: 'stockId',
              in: 'query',
              schema: { type: 'string' },
              description: 'Filter items by specific stock space ID',
            },
            {
              name: 'sortBy',
              in: 'query',
              schema: { type: 'string', enum: ['dueDate', 'backupStock', 'quantity', 'startDate', 'name', 'price', 'updatedAt'] },
              description: 'Sort items by specific field (default dueDate)',
            },
            {
              name: 'sortOrder',
              in: 'query',
              schema: { type: 'string', enum: ['asc', 'desc'] },
              description: 'Sort direction (default asc)',
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 50 },
              description: 'Pagination limit (max 200)',
            },
            {
              name: 'offset',
              in: 'query',
              schema: { type: 'integer', default: 0 },
              description: 'Pagination offset',
            },
          ],
          responses: {
            '200': {
              description: 'List of items with calculated status and comprehensive summary',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      items: { type: 'array', items: { $ref: '#/components/schemas/Item' } },
                      total: { type: 'integer' },
                      limit: { type: 'integer' },
                      offset: { type: 'integer' },
                      summary: {
                        type: 'object',
                        properties: {
                          total: { type: 'integer' },
                          overdue: { type: 'integer' },
                          dueToday: { type: 'integer' },
                          dueSoon: { type: 'integer' },
                          lowStock: { type: 'integer' },
                          outOfStock: { type: 'integer' },
                          inStock: { type: 'integer' },
                          quantityDepleted: { type: 'integer' },
                          needsRestock: { type: 'integer' },
                          stored: { type: 'integer' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          summary: 'Create a new consumable item',
          operationId: 'createItem',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    presetId: { type: 'string', description: 'Preset ID from /api/v1/presets to auto-fill defaults (e.g. costco-fish-oil, brita-filter)' },
                    name: { type: 'string', description: 'Consumable item name (required if no presetId)' },
                    category: {
                      type: 'string',
                      enum: ['bathroom', 'kitchen', 'medicine', 'skincare', 'appliances', 'clothing', 'electronics', 'general'],
                    },
                    trackingMode: {
                      type: 'string',
                      enum: ['cycle', 'pao', 'expiry', 'warranty', 'quantity'],
                      description: 'cycle: interval replacement; pao: period after opening; expiry: best before date; warranty: warranty expiry; quantity: unit consumption countdown',
                    },
                    cycleDays: { type: 'integer', description: 'Replacement cycle in days (for cycle mode, e.g. 90)' },
                    startDate: { type: 'string', format: 'date', description: 'Start/opened date (defaults to today)' },
                    paoMonths: { type: 'integer', description: 'Months valid after opening (for pao mode, e.g. 6)' },
                    expiryDate: { type: 'string', format: 'date', description: 'Expiration date (for expiry mode)' },
                    warrantyDate: { type: 'string', format: 'date', description: 'Warranty end date (for warranty mode)' },
                    initialQuantity: { type: 'number', description: 'Active package capacity/count (for quantity mode, e.g. 150)' },
                    currentQuantity: { type: 'number', description: 'Current remaining count in active package (for quantity mode)' },
                    dailyUsage: { type: 'number', description: 'Estimated daily consumed amount (for quantity mode, e.g. 2)' },
                    quantityUnit: { type: 'string', description: 'Unit name (e.g. 顆, 錠, 包, 片)' },
                    activeUnits: { type: 'integer', description: 'Active units concurrently opened and in use across rooms (default 1)' },
                    backupStock: { type: 'integer', description: 'Unopened spare units in stock cabinet (e.g. 2)' },
                    minStockAlert: { type: 'integer', description: 'Safety stock warning threshold (default 1)' },
                    price: { type: 'number' },
                    specModel: { type: 'string', description: 'Specification/model (e.g. 150顆/瓶)' },
                    location: { type: 'string', description: 'Storage location' },
                    isStored: { type: 'boolean', description: 'Whether item is stored/paused' },
                    notes: { type: 'string' },
                    stockId: { type: 'string', description: 'Target stock space ID (defaults to user stock)' },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Item created' },
          },
        },
      },
      '/api/v1/items/{id}': {
        get: {
          summary: 'Get item details and replacement history',
          operationId: 'getItem',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Item details' },
            '404': { description: 'Item not found' },
          },
        },
        patch: {
          summary: 'Update item fields',
          operationId: 'updateItem',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: {
            '200': { description: 'Item updated' },
          },
        },
        delete: {
          summary: 'Delete item',
          operationId: 'deleteItem',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Item deleted' },
          },
        },
      },
      '/api/v1/items/{id}/replace': {
        post: {
          summary: 'Trigger "Replaced Today" action (resets countdown and decrements backup stock)',
          operationId: 'replaceItem',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Replacement recorded' },
          },
        },
      },
      '/api/v1/items/{id}/consume': {
        post: {
          summary: 'Deduct consumable quantity',
          operationId: 'consumeItem',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { amount: { type: 'number', example: 2 } },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Quantity deducted' },
          },
        },
      },
      '/api/v1/items/{id}/restock': {
        post: {
          summary: 'Restock / add backup spare inventory count (e.g. bought 2 backup bottles)',
          operationId: 'restockItem',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'Item ID',
            },
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    delta: { type: 'number', description: 'Number of backup spare units to add (default 1)', example: 2 },
                    backupStock: { type: 'number', description: 'Or explicitly set the absolute backup stock count' },
                    note: { type: 'string', description: 'Restock log note (e.g. 好市多補貨採購)' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Backup stock updated' },
            '404': { description: 'Item not found' },
          },
        },
      },
      '/api/v1/presets': {
        get: {
          summary: 'Search and list common household consumable presets (e.g. Costco Fish Oil 150 capsules, Brita filters, tissues)',
          operationId: 'listPresets',
          parameters: [
            {
              name: 'q',
              in: 'query',
              schema: { type: 'string' },
              description: 'Keyword search matching preset name, specification, or notes (e.g. 魚油, 濾芯, 衛生紙)',
            },
            {
              name: 'category',
              in: 'query',
              schema: { type: 'string' },
              description: 'Category filter',
            },
          ],
          responses: {
            '200': { description: 'List of consumable templates' },
          },
        },
      },
      '/api/v1/stocks': {
        get: {
          summary: 'List available stock spaces',
          operationId: 'listStocks',
          responses: {
            '200': { description: 'List of accessible stock spaces' },
          },
        },
      },
    },
  };

  return c.json(openApiDoc, 200, {
    'Cache-Control': 'public, max-age=3600',
  });
});

// All endpoints below require authentication (Cookie or Bearer ab_live_...)
agentApiRouter.use('/*', requireAuth);

/**
 * Helper to enforce API key read/write scopes
 */
function checkApiKeyScope(apiKey: any, mode: 'read' | 'write'): boolean {
  if (!apiKey || !apiKey.scopes) return true;
  if (mode === 'write') {
    const raw = String(apiKey.scopes).toLowerCase();
    const scopes = raw.split(',').map((s) => s.trim());
    if (scopes.includes('read') && !scopes.includes('write') && !scopes.includes('*') && !scopes.includes('all')) {
      return false;
    }
    if (scopes.includes('read_only')) {
      return false;
    }
  }
  return true;
}

/**
 * Helper to check item ownership & stock boundary with action-level RBAC enforcement
 */
async function checkAgentItemAccess(
  db: any,
  itemId: string,
  userId: string,
  scopedStockId?: string | null,
  requiredAction: 'view' | 'edit' | 'delete' = 'view'
): Promise<{ item: any; error?: string; status: number }> {
  const item = await db
    .select()
    .from(items)
    .where(and(eq(items.id, itemId), isNull(items.deletedAt)))
    .get();

  if (!item) {
    return { item: null, error: '找不到該物品或該物品已被刪除', status: 404 };
  }

  // If API key is scoped to a specific stock, ensure item matches
  if (scopedStockId && item.stockId !== scopedStockId) {
    return { item: null, error: '無權限存取該空間的物品', status: 403 };
  }

  // Check user membership and role in stock
  if (item.stockId) {
    const member = await db
      .select()
      .from(stockMembers)
      .where(and(eq(stockMembers.stockId, item.stockId), eq(stockMembers.userId, userId)))
      .get();

    if (!member) {
      if (item.userId !== userId && item.createdByUserId !== userId) {
        return { item: null, error: '無權限存取此空間物品', status: 403 };
      }
    } else {
      const role = member.role as StockRole;
      if (requiredAction === 'edit' && role === 'viewer') {
        return { item: null, error: '僅檢視者角色無權編輯或更換此空間物品', status: 403 };
      }
      if (requiredAction === 'delete') {
        if (role === 'viewer') {
          return { item: null, error: '僅檢視者角色無權刪除此空間物品', status: 403 };
        }
        if (role === 'member' && item.createdByUserId !== userId && item.userId !== userId) {
          return { item: null, error: '一般成員僅能刪除自己建立的物品', status: 403 };
        }
      }
    }
  } else if (item.userId !== userId && item.createdByUserId !== userId) {
    return { item: null, error: '無權限存取此物品', status: 403 };
  }

  return { item, status: 200 };
}

/**
 * GET /api/v1/items: Query consumables with status and search filters
 */
agentApiRouter.get('/items', async (c) => {
  const user = c.get('user')!;
  const apiKey = c.get('apiKey');
  const db = getDb(c.env.DB);

  await ensureUserDefaultStock(db, user);

  // Extract query parameters
  const requestedStockId = c.req.query('stockId');
  const statusFilter = c.req.query('status') || 'all';
  const stockStatusFilter = c.req.query('stockStatus');
  const customDueDaysRaw = c.req.query('dueWithinDays');
  const customDueDays = customDueDaysRaw ? parseInt(customDueDaysRaw, 10) : null;
  const categoryFilter = c.req.query('category');
  const trackingModeFilter = c.req.query('trackingMode');
  const isStoredParam = c.req.query('isStored');
  const dueBefore = c.req.query('dueBefore');
  const dueAfter = c.req.query('dueAfter');
  const startedBefore = c.req.query('startedBefore');
  const startedAfter = c.req.query('startedAfter');
  const locationFilter = c.req.query('location')?.trim().toLowerCase();
  const q = c.req.query('q')?.trim().toLowerCase();
  const sortBy = c.req.query('sortBy') || 'dueDate';
  const sortOrder = c.req.query('sortOrder') === 'desc' ? 'desc' : 'asc';
  const limitParam = parseInt(c.req.query('limit') || '50', 10);
  const limit = isNaN(limitParam) ? 50 : Math.min(Math.max(1, limitParam), 200);
  const offsetParam = parseInt(c.req.query('offset') || '0', 10);
  const offset = isNaN(offsetParam) ? 0 : Math.max(0, offsetParam);

  const myMemberships = await (db as any)
    .select({ stockId: stockMembers.stockId })
    .from(stockMembers)
    .innerJoin(stocks, eq(stockMembers.stockId, stocks.id))
    .where(and(eq(stockMembers.userId, user.id), isNull(stocks.deletedAt)))
    .all();

  const accessibleStockIds: string[] = myMemberships.map((m: any) => m.stockId);

  // Validate stock filter & apiKey scope (prevent IDOR or cross-tenant leakage)
  let targetStockId: string | undefined;
  if (apiKey?.stockId) {
    if (requestedStockId && requestedStockId !== apiKey.stockId) {
      return c.json({ error: '此 API Key 僅限存取特定空間' }, 403);
    }
    targetStockId = apiKey.stockId;
  } else if (requestedStockId) {
    if (!accessibleStockIds.includes(requestedStockId)) {
      return c.json({ error: '無權限存取該空間或該空間不存在' }, 403);
    }
    targetStockId = requestedStockId;
  }

  let rawItems = await (db as any)
    .select()
    .from(items)
    .where(isNull(items.deletedAt))
    .all();

  // Filter items user can access
  rawItems = rawItems.filter((i: any) => {
    const isAccessible = i.stockId ? accessibleStockIds.includes(i.stockId) : i.userId === user.id;
    if (!isAccessible) return false;
    if (targetStockId) {
      return i.stockId === targetStockId;
    }
    return true;
  });

  const now = new Date();
  let summary = {
    total: 0,
    overdue: 0,
    dueToday: 0,
    dueSoon: 0,
    lowStock: 0,
    outOfStock: 0,
    inStock: 0,
    quantityDepleted: 0,
    needsRestock: 0,
    stored: 0,
  };

  const processed = rawItems.map((raw: any) => {
    const status = computeItemStatus(raw, now);
    const isOverdue = status.healthStatus === 'overdue';
    const isDueToday = !raw.isStored && status.remainingDays === 0;
    const isDueSoon = status.healthStatus === 'due_soon';
    const isLowStock = raw.backupStock < raw.minStockAlert;
    const isOutOfStock = raw.backupStock === 0;
    const hasInStock = raw.backupStock > 0;
    const isQuantityDepleted = raw.trackingMode === 'quantity' && (status.remainingQuantity ?? raw.currentQuantity ?? 0) === 0;
    const needsRestock = isLowStock || isQuantityDepleted;
    const isStored = Boolean(raw.isStored);

    summary.total++;
    if (isOverdue) summary.overdue++;
    if (isDueToday) summary.dueToday++;
    if (isDueSoon) summary.dueSoon++;
    if (isLowStock) summary.lowStock++;
    if (isOutOfStock) summary.outOfStock++;
    if (hasInStock) summary.inStock++;
    if (isQuantityDepleted) summary.quantityDepleted++;
    if (needsRestock) summary.needsRestock++;
    if (isStored) summary.stored++;

    return {
      id: raw.id,
      stockId: raw.stockId,
      name: raw.name,
      category: raw.category,
      trackingMode: raw.trackingMode,
      cycleDays: raw.cycleDays,
      startDate: raw.startDate,
      paoMonths: raw.paoMonths,
      expiryDate: raw.expiryDate,
      warrantyDate: raw.warrantyDate,
      initialQuantity: raw.initialQuantity,
      currentQuantity: status.remainingQuantity ?? raw.currentQuantity,
      dailyUsage: raw.dailyUsage,
      quantityUnit: raw.quantityUnit,
      activeUnits: raw.activeUnits ?? 1,
      backupStock: raw.backupStock,
      minStockAlert: raw.minStockAlert,
      price: raw.price,
      specModel: raw.specModel,
      location: raw.location,
      isStored,
      notes: raw.notes,
      imageUrl: raw.imageUrl,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      // Computed status fields
      healthStatus: status.healthStatus,
      nextDueDate: status.nextDueDate,
      totalDays: status.totalDays,
      elapsedDays: status.elapsedDays,
      daysUntilStart: status.daysUntilStart,
      remainingDays: status.remainingDays,
      percentageRemaining: status.percentageRemaining,
      needsRestock,
      burnRate: status.burnRate,
      isDueToday,
      isOutOfStock,
      isQuantityDepleted,
    };
  });

  // Apply rich filters
  let filtered = processed;

  if (categoryFilter) {
    filtered = filtered.filter((i) => i.category === categoryFilter);
  }

  if (trackingModeFilter) {
    filtered = filtered.filter((i) => i.trackingMode === trackingModeFilter);
  }

  if (isStoredParam !== undefined) {
    const isStoredBool = isStoredParam === 'true' || isStoredParam === '1';
    filtered = filtered.filter((i) => i.isStored === isStoredBool);
  }

  if (dueBefore) {
    filtered = filtered.filter((i) => i.nextDueDate && i.nextDueDate <= dueBefore);
  }
  if (dueAfter) {
    filtered = filtered.filter((i) => i.nextDueDate && i.nextDueDate >= dueAfter);
  }
  if (startedBefore) {
    filtered = filtered.filter((i) => i.startDate && i.startDate <= startedBefore);
  }
  if (startedAfter) {
    filtered = filtered.filter((i) => i.startDate && i.startDate >= startedAfter);
  }

  if (locationFilter) {
    filtered = filtered.filter((i) => i.location?.toLowerCase().includes(locationFilter));
  }

  if (q) {
    filtered = filtered.filter((i) => {
      const matchName = i.name?.toLowerCase().includes(q);
      const matchNotes = i.notes?.toLowerCase().includes(q);
      const matchSpec = i.specModel?.toLowerCase().includes(q);
      const matchLocation = i.location?.toLowerCase().includes(q);
      return matchName || matchNotes || matchSpec || matchLocation;
    });
  }

  // Stock status filter
  if (stockStatusFilter === 'in_stock') {
    filtered = filtered.filter((i) => i.backupStock > 0);
  } else if (stockStatusFilter === 'out_of_stock') {
    filtered = filtered.filter((i) => i.backupStock === 0);
  } else if (stockStatusFilter === 'low_stock') {
    filtered = filtered.filter((i) => i.backupStock < i.minStockAlert);
  }

  // Lifecycle status filter
  if (statusFilter === 'overdue') {
    filtered = filtered.filter((i) => i.healthStatus === 'overdue');
  } else if (statusFilter === 'due_today') {
    filtered = filtered.filter((i) => i.isDueToday);
  } else if (statusFilter === 'due_soon') {
    if (customDueDays !== null) {
      filtered = filtered.filter(
        (i) => !i.isStored && i.remainingDays !== null && i.remainingDays >= 0 && i.remainingDays <= customDueDays
      );
    } else {
      filtered = filtered.filter((i) => i.healthStatus === 'due_soon');
    }
  } else if (statusFilter === 'low_stock') {
    filtered = filtered.filter((i) => i.backupStock < i.minStockAlert);
  } else if (statusFilter === 'out_of_stock' || statusFilter === 'depleted') {
    filtered = filtered.filter((i) => i.backupStock === 0);
  } else if (statusFilter === 'in_stock' || statusFilter === 'has_backup') {
    filtered = filtered.filter((i) => i.backupStock > 0);
  } else if (statusFilter === 'needs_restock') {
    filtered = filtered.filter((i) => i.needsRestock);
  } else if (statusFilter === 'quantity_depleted' || statusFilter === 'empty') {
    filtered = filtered.filter((i) => i.isQuantityDepleted);
  } else if (statusFilter === 'normal' || statusFilter === 'healthy') {
    filtered = filtered.filter((i) => i.healthStatus === 'normal' || i.healthStatus === 'healthy');
  } else if (statusFilter === 'stored') {
    filtered = filtered.filter((i) => i.isStored);
  } else if (statusFilter === 'snoozed') {
    filtered = filtered.filter((i) => i.healthStatus === 'snoozed');
  }

  // Sorting
  filtered.sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'dueDate') {
      const dateA = a.nextDueDate || '9999-12-31';
      const dateB = b.nextDueDate || '9999-12-31';
      cmp = dateA.localeCompare(dateB);
    } else if (sortBy === 'backupStock') {
      cmp = (a.backupStock || 0) - (b.backupStock || 0);
    } else if (sortBy === 'quantity') {
      cmp = (a.currentQuantity || 0) - (b.currentQuantity || 0);
    } else if (sortBy === 'startDate') {
      cmp = (a.startDate || '').localeCompare(b.startDate || '');
    } else if (sortBy === 'price') {
      cmp = (a.price || 0) - (b.price || 0);
    } else if (sortBy === 'updatedAt') {
      cmp = (a.updatedAt || '').localeCompare(b.updatedAt || '');
    } else {
      cmp = (a.name || '').localeCompare(b.name || '');
    }
    return sortOrder === 'desc' ? -cmp : cmp;
  });

  const total = filtered.length;
  const pagedItems = filtered.slice(offset, offset + limit);

  c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  return c.json({
    items: pagedItems,
    total,
    limit,
    offset,
    summary,
  });
});

/**
 * POST /api/v1/items: Create consumable item
 */
agentApiRouter.post('/items', async (c) => {
  const user = c.get('user')!;
  const apiKey = c.get('apiKey');
  const db = getDb(c.env.DB);

  if (!checkApiKeyScope(apiKey, 'write')) {
    return c.json({ error: '此 API Key 僅具備讀取權限 (Read-only API key)' }, 403);
  }

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '無效的 JSON 請求內容' }, 400);
  }

  // Preset auto-fill logic: match by presetId or item name keyword
  let matchedPreset = body.presetId
    ? ITEM_PRESETS.find((p) => p.id === body.presetId)
    : null;
  if (!matchedPreset && body.name) {
    const rawTrim = body.name.trim().toLowerCase();
    matchedPreset = ITEM_PRESETS.find(
      (p) => p.name.toLowerCase() === rawTrim || p.name.toLowerCase().includes(rawTrim)
    );
  }

  const name = body.name?.trim() || matchedPreset?.name;
  if (!name) {
    return c.json({ error: '物品名稱為必填（或提供有效的 presetId）' }, 400);
  }

  const category = (body.category || matchedPreset?.category || 'general') as ItemCategory;
  const trackingMode = (body.trackingMode || matchedPreset?.trackingMode || 'cycle') as TrackingMode;

  // Resolve target stock space
  let targetStockId = apiKey?.stockId || body.stockId;
  if (!targetStockId) {
    const defaultStock = await ensureUserDefaultStock(db, user);
    targetStockId = defaultStock.id;
  }

  // Verify stock membership
  const member = await (db as any)
    .select()
    .from(stockMembers)
    .where(and(eq(stockMembers.stockId, targetStockId), eq(stockMembers.userId, user.id)))
    .get();

  if (!member) {
    return c.json({ error: '無權限在此備品庫建立物品' }, 403);
  }

  if (member.role === 'viewer') {
    return c.json({ error: '僅檢視者角色無權在此空間建立物品' }, 403);
  }

  const id = crypto.randomUUID();
  const todayStr = businessDate();
  const startDate = body.startDate || todayStr;
  const now = new Date().toISOString();

  const cycleDays =
    trackingMode === 'cycle'
      ? body.cycleDays !== undefined
        ? Number(body.cycleDays)
        : (matchedPreset?.cycleDays ?? 90)
      : null;
  const paoMonths =
    trackingMode === 'pao'
      ? body.paoMonths !== undefined
        ? Number(body.paoMonths)
        : (matchedPreset?.paoMonths ?? 6)
      : null;
  const initialQuantity =
    trackingMode === 'quantity'
      ? body.initialQuantity !== undefined
        ? Number(body.initialQuantity)
        : (matchedPreset?.initialQuantity ?? 60)
      : null;
  const currentQuantity =
    trackingMode === 'quantity'
      ? body.currentQuantity !== undefined
        ? Number(body.currentQuantity)
        : (initialQuantity ?? 60)
      : null;
  const dailyUsage =
    trackingMode === 'quantity'
      ? body.dailyUsage !== undefined
        ? Number(body.dailyUsage)
        : (matchedPreset?.dailyUsage ?? 1)
      : null;
  const quantityUnit =
    body.quantityUnit || matchedPreset?.quantityUnit || (trackingMode === 'quantity' ? '顆' : null);
  const minStockAlert =
    body.minStockAlert !== undefined
      ? Number(body.minStockAlert)
      : (matchedPreset?.minStockAlert ?? 1);
  const price =
    body.price !== undefined && body.price !== null
      ? Number(body.price)
      : (matchedPreset?.defaultPrice ?? null);
  const specModel = body.specModel?.trim() || matchedPreset?.defaultSpecModel || null;
  const notes = body.notes?.trim() || matchedPreset?.notes || null;
  const imageUrl = body.imageUrl?.trim() || matchedPreset?.imageUrl || null;

  const newItemData = {
    id,
    stockId: targetStockId,
    userId: user.id,
    createdByUserId: user.id,
    name,
    category,
    trackingMode,
    cycleDays,
    startDate,
    paoMonths,
    expiryDate: trackingMode === 'expiry' ? body.expiryDate || null : null,
    warrantyDate: trackingMode === 'warranty' ? body.warrantyDate || null : null,
    initialQuantity,
    currentQuantity,
    dailyUsage,
    quantityUnit,
    activeUnits: Math.max(1, Math.floor(Number(body.activeUnits) || 1)),
    backupStock: Number(body.backupStock) || 0,
    minStockAlert,
    price,
    specModel,
    location: body.location?.trim() || null,
    isStored: body.isStored ? 1 : 0,
    notes,
    imageUrl,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(items).values(newItemData);

  const status = computeItemStatus(newItemData, new Date());
  return c.json(
    {
      item: {
        ...newItemData,
        isStored: Boolean(newItemData.isStored),
        healthStatus: status.healthStatus,
        nextDueDate: status.nextDueDate,
        remainingDays: status.remainingDays,
      },
      message: '物品已成功建立',
    },
    201
  );
});

/**
 * GET /api/v1/items/:id: Item details with recent 10 replacement history
 */
agentApiRouter.get('/items/:id', async (c) => {
  const user = c.get('user')!;
  const apiKey = c.get('apiKey');
  const db = getDb(c.env.DB);
  const itemId = c.req.param('id');

  const access = await checkAgentItemAccess(db, itemId, user.id, apiKey?.stockId, 'view');
  if (!access.item) {
    return c.json({ error: access.error }, access.status as any);
  }
  const item = access.item;

  const status = computeItemStatus(item, new Date());

  const historyLogs = await (db as any)
    .select()
    .from(itemHistory)
    .where(eq(itemHistory.itemId, itemId))
    .orderBy(desc(itemHistory.replacedAt))
    .limit(10)
    .all();

  return c.json({
    item: {
      ...item,
      isStored: Boolean(item.isStored),
      healthStatus: status.healthStatus,
      nextDueDate: status.nextDueDate,
      remainingDays: status.remainingDays,
      needsRestock: status.needsRestock,
    },
    history: historyLogs,
  });
});

/**
 * PATCH /api/v1/items/:id: Update item details
 */
agentApiRouter.patch('/items/:id', async (c) => {
  const user = c.get('user')!;
  const apiKey = c.get('apiKey');
  const db = getDb(c.env.DB);
  const itemId = c.req.param('id');

  if (!checkApiKeyScope(apiKey, 'write')) {
    return c.json({ error: '此 API Key 僅具備讀取權限 (Read-only API key)' }, 403);
  }

  const access = await checkAgentItemAccess(db, itemId, user.id, apiKey?.stockId, 'edit');
  if (!access.item) {
    return c.json({ error: access.error }, access.status as any);
  }
  const item = access.item;

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '無效的 JSON 請求內容' }, 400);
  }

  const updates: Record<string, any> = { updatedAt: new Date().toISOString() };

  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.category !== undefined) updates.category = body.category;
  if (body.cycleDays !== undefined) updates.cycleDays = Number(body.cycleDays);
  if (body.startDate !== undefined) updates.startDate = body.startDate;
  if (body.paoMonths !== undefined) updates.paoMonths = Number(body.paoMonths);
  if (body.expiryDate !== undefined) updates.expiryDate = body.expiryDate;
  if (body.warrantyDate !== undefined) updates.warrantyDate = body.warrantyDate;
  if (body.initialQuantity !== undefined) updates.initialQuantity = Number(body.initialQuantity);
  if (body.currentQuantity !== undefined) updates.currentQuantity = Number(body.currentQuantity);
  if (body.dailyUsage !== undefined) updates.dailyUsage = Number(body.dailyUsage);
  if (body.quantityUnit !== undefined) updates.quantityUnit = body.quantityUnit;
  if (body.activeUnits !== undefined) updates.activeUnits = Math.max(1, Math.floor(Number(body.activeUnits) || 1));
  if (body.backupStock !== undefined) updates.backupStock = Number(body.backupStock);
  if (body.minStockAlert !== undefined) updates.minStockAlert = Number(body.minStockAlert);
  if (body.price !== undefined) updates.price = body.price !== null ? Number(body.price) : null;
  if (body.specModel !== undefined) updates.specModel = body.specModel?.trim() || null;
  if (body.location !== undefined) updates.location = body.location?.trim() || null;
  if (body.isStored !== undefined) updates.isStored = body.isStored ? 1 : 0;
  if (body.notes !== undefined) updates.notes = body.notes?.trim() || null;
  if (body.imageUrl !== undefined) updates.imageUrl = body.imageUrl?.trim() || null;

  await db.update(items).set(updates).where(eq(items.id, itemId));

  const updatedItem = { ...item, ...updates };
  const status = computeItemStatus(updatedItem, new Date());

  return c.json({
    item: {
      ...updatedItem,
      isStored: Boolean(updatedItem.isStored),
      healthStatus: status.healthStatus,
      nextDueDate: status.nextDueDate,
      remainingDays: status.remainingDays,
      needsRestock: status.needsRestock,
    },
    message: '物品更新成功',
  });
});

/**
 * DELETE /api/v1/items/:id: Soft-delete item
 */
agentApiRouter.delete('/items/:id', async (c) => {
  const user = c.get('user')!;
  const apiKey = c.get('apiKey');
  const db = getDb(c.env.DB);
  const itemId = c.req.param('id');

  if (!checkApiKeyScope(apiKey, 'write')) {
    return c.json({ error: '此 API Key 僅具備讀取權限 (Read-only API key)' }, 403);
  }

  const access = await checkAgentItemAccess(db, itemId, user.id, apiKey?.stockId, 'delete');
  if (!access.item) {
    return c.json({ error: access.error }, access.status as any);
  }

  const now = new Date().toISOString();
  await db.update(items).set({
    deletedAt: now,
    calendarSequence: access.item.calendarSequence + 1,
    updatedAt: now,
  }).where(eq(items.id, itemId));

  return c.json({ success: true, message: '物品已成功刪除' });
});

/**
 * POST /api/v1/items/:id/replace: Today replaced action
 * Resets countdown, decrements backup stock if available, logs history atomically
 */
agentApiRouter.post('/items/:id/replace', async (c) => {
  const user = c.get('user')!;
  const apiKey = c.get('apiKey');
  const db = getDb(c.env.DB);
  const itemId = c.req.param('id');

  if (!checkApiKeyScope(apiKey, 'write')) {
    return c.json({ error: '此 API Key 僅具備讀取權限 (Read-only API key)' }, 403);
  }

  const access = await checkAgentItemAccess(db, itemId, user.id, apiKey?.stockId, 'edit');
  if (!access.item) {
    return c.json({ error: access.error }, access.status as any);
  }
  const item = access.item;

  const todayStr = businessDate();
  const now = new Date().toISOString();

  // Determine backup stock deduction
  let newBackupStock = item.backupStock;
  let stockDeducted = false;

  if (item.backupStock > 0) {
    newBackupStock = item.backupStock - 1;
    stockDeducted = true;
  }

  // If quantity mode, reset current quantity to initialQuantity
  const resetQty = item.trackingMode === 'quantity' && item.initialQuantity ? item.initialQuantity : item.currentQuantity;

  // Atomically update item and insert replacement history
  await db
    .update(items)
    .set({
      startDate: todayStr,
      backupStock: newBackupStock,
      currentQuantity: resetQty,
      isStored: 0,
      snoozeUntil: null,
      updatedAt: now,
    })
    .where(eq(items.id, itemId));

  await db.insert(itemHistory).values({
    id: crypto.randomUUID(),
    itemId: item.id,
    userId: user.id,
    replacedByUserId: user.id,
    replacedAt: now,
    previousStartDate: item.startDate,
    stockAfterReplace: newBackupStock,
    notes: stockDeducted ? '透過 AI Agent 記錄「今天已換」並自動扣減備品' : '透過 AI Agent 記錄「今天已換」（備品為 0 無法扣減）',
  });

  const updatedItem = {
    ...item,
    startDate: todayStr,
    backupStock: newBackupStock,
    currentQuantity: resetQty,
    isStored: 0,
    snoozeUntil: null,
    updatedAt: now,
  };

  const status = computeItemStatus(updatedItem, new Date());

  return c.json({
    success: true,
    stockDeducted,
    item: {
      ...updatedItem,
      healthStatus: status.healthStatus,
      nextDueDate: status.nextDueDate,
      remainingDays: status.remainingDays,
      needsRestock: status.needsRestock,
    },
    message: stockDeducted
      ? `已記錄今日更換，下一更換日為 ${status.nextDueDate}，備品庫存剩餘 ${newBackupStock} 件。`
      : `已記錄今日更換，下一更換日為 ${status.nextDueDate}。注意：目前備品庫存為 0，請記得補充備品！`,
  });
});

/**
 * POST /api/v1/items/:id/consume: Deduct consumable quantity
 */
agentApiRouter.post('/items/:id/consume', async (c) => {
  const user = c.get('user')!;
  const apiKey = c.get('apiKey');
  const db = getDb(c.env.DB);
  const itemId = c.req.param('id');

  if (!checkApiKeyScope(apiKey, 'write')) {
    return c.json({ error: '此 API Key 僅具備讀取權限 (Read-only API key)' }, 403);
  }

  const access = await checkAgentItemAccess(db, itemId, user.id, apiKey?.stockId, 'edit');
  if (!access.item) {
    return c.json({ error: access.error }, access.status as any);
  }
  const item = access.item;

  let body: { amount?: number; count?: number } = {};
  try {
    body = await c.req.json();
  } catch {
    // Optional body
  }

  const rawQty = body.amount !== undefined ? body.amount : body.count;
  const defaultAmount = item.dailyUsage || 1;
  const requestedAmount = typeof rawQty === 'number' && rawQty > 0 ? rawQty : defaultAmount;

  const currentAvailable = item.currentQuantity ?? item.initialQuantity ?? 0;
  const actualDeducted = Math.min(currentAvailable, requestedAmount);
  const newQuantity = Math.max(0, currentAvailable - actualDeducted);

  const now = new Date().toISOString();
  await db
    .update(items)
    .set({
      currentQuantity: newQuantity,
      updatedAt: now,
    })
    .where(eq(items.id, itemId));

  const updatedItem = { ...item, currentQuantity: newQuantity, updatedAt: now };
  const status = computeItemStatus(updatedItem, new Date());

  return c.json({
    success: true,
    requestedAmount,
    actualDeducted,
    remainingQuantity: newQuantity,
    item: {
      ...updatedItem,
      healthStatus: status.healthStatus,
      nextDueDate: status.nextDueDate,
      remainingDays: status.remainingDays,
      needsRestock: status.needsRestock,
    },
    message:
      newQuantity === 0
        ? `已扣減 ${actualDeducted} ${item.quantityUnit || '份'}，目前數量已用罄（0），建議儘速開新瓶或採購備品！`
        : `已扣減 ${actualDeducted} ${item.quantityUnit || '份'}，剩餘 ${newQuantity} ${item.quantityUnit || '份'}，預估可用約 ${status.remainingDays} 天。`,
  });
});

/**
 * POST /api/v1/items/:id/restock: Add or update backup spare inventory count
 * e.g. Purchased 2 spare bottles at Costco
 */
agentApiRouter.post('/items/:id/restock', async (c) => {
  const user = c.get('user')!;
  const apiKey = c.get('apiKey');
  const db = getDb(c.env.DB);
  const itemId = c.req.param('id');

  if (!checkApiKeyScope(apiKey, 'write')) {
    return c.json({ error: '此 API Key 僅具備讀取權限 (Read-only API key)' }, 403);
  }

  const access = await checkAgentItemAccess(db, itemId, user.id, apiKey?.stockId, 'edit');
  if (!access.item) {
    return c.json({ error: access.error }, access.status as any);
  }
  const item = access.item;

  let body: { delta?: number; amount?: number; count?: number; backupStock?: number; note?: string } = {};
  try {
    body = await c.req.json();
  } catch {
    // Optional body
  }

  const previousBackupStock = item.backupStock ?? 0;
  let newBackupStock: number;
  let addedCount: number;

  if (body.backupStock !== undefined && typeof body.backupStock === 'number') {
    newBackupStock = Math.max(0, Math.floor(body.backupStock));
    addedCount = newBackupStock - previousBackupStock;
  } else {
    const rawDelta = body.delta ?? body.amount ?? body.count ?? 1;
    const delta = typeof rawDelta === 'number' && !isNaN(rawDelta) ? Math.floor(rawDelta) : 1;
    newBackupStock = Math.max(0, previousBackupStock + delta);
    addedCount = delta;
  }

  const now = new Date().toISOString();
  await db
    .update(items)
    .set({
      backupStock: newBackupStock,
      updatedAt: now,
    })
    .where(eq(items.id, itemId));

  const noteMsg =
    body.note?.trim() ||
    (addedCount >= 0
      ? `透過 AI Agent 補充備品庫存 (+${addedCount})，目前備品庫存 ${newBackupStock} 件`
      : `透過 AI Agent 調整備品庫存 (${addedCount})，目前備品庫存 ${newBackupStock} 件`);

  await db.insert(itemHistory).values({
    id: crypto.randomUUID(),
    itemId: item.id,
    userId: user.id,
    replacedByUserId: user.id,
    replacedAt: now,
    previousStartDate: item.startDate,
    stockAfterReplace: newBackupStock,
    notes: noteMsg,
  });

  const updatedItem = { ...item, backupStock: newBackupStock, updatedAt: now };
  const status = computeItemStatus(updatedItem, new Date());

  return c.json({
    success: true,
    previousBackupStock,
    backupStock: newBackupStock,
    delta: addedCount,
    item: {
      ...updatedItem,
      isStored: Boolean(updatedItem.isStored),
      healthStatus: status.healthStatus,
      nextDueDate: status.nextDueDate,
      remainingDays: status.remainingDays,
      needsRestock: status.needsRestock,
    },
    message: `已成功補充備品庫存，目前備品剩餘 ${newBackupStock} 件。${status.needsRestock ? '（仍低於安全庫存警戒門檻）' : '（備品充足）'}`,
  });
});

/**
 * GET /api/v1/stocks: List user's stock spaces (sanitized)
 */
agentApiRouter.get('/stocks', async (c) => {
  const user = c.get('user')!;
  const apiKey = c.get('apiKey');
  const db = getDb(c.env.DB);

  await ensureUserDefaultStock(db, user);

  let query = (db as any)
    .select({
      id: stocks.id,
      name: stocks.name,
      icon: stocks.icon,
      description: stocks.description,
      ownerId: stocks.ownerId,
      role: stockMembers.role,
      createdAt: stocks.createdAt,
    })
    .from(stocks)
    .innerJoin(stockMembers, eq(stocks.id, stockMembers.stockId))
    .where(and(eq(stockMembers.userId, user.id), isNull(stocks.deletedAt)));

  let list = await query.all();

  // If apiKey is restricted to a single stock, filter down
  if (apiKey?.stockId) {
    list = list.filter((s: any) => s.id === apiKey.stockId);
  }

  return c.json({ stocks: list });
});
