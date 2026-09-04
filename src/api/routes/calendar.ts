import { Hono } from 'hono';
import { eq, and, or, isNull, gte } from 'drizzle-orm';
import { HonoEnv } from '../types.ts';
import { requireAuth } from '../middleware/auth.ts';
import { getDb, users, items, stocks, stockMembers } from '../db/index.ts';
import { computeNextDueDate } from '../../shared/lifecycle.ts';
import { TrackingMode } from '../../shared/types.ts';
import { generateRandomToken } from '../utils/auth.ts';

export const calendarRouter = new Hono<HonoEnv>();

// Sanitize user strings for RFC 5545 text properties (SEC-04 Fixed)
function sanitizeIcsText(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
    .trim();
}

// 1. Dynamic RFC 5545 WebCal stream endpoint (Supports All-in-One User Token AND Single Stock Token)
calendarRouter.get('/:token.ics', async (c) => {
  const token = c.req.param('token');
  if (!token) {
    return c.text('400 Bad Request: Missing calendar token', 400);
  }

  const db = getDb(c.env.DB);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const appOrigin = c.env.APP_ORIGIN || 'https://afterbuy.app';
  const nowIsoCompact = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  // Check 1: User's All-in-One Calendar
  const user = await db.select().from(users).where(eq(users.calendarToken, token)).get();
  let calTitle = 'afterBuy 該換囉 - 全部生活備品';
  let targetItems: any[] = [];
  const stockNameMap = new Map<string, string>();

  if (user) {
    // Fetch all stocks user is member of
    const memberships = await (db as any)
      .select({
        stockId: stockMembers.stockId,
        stockName: stocks.name,
      })
      .from(stockMembers)
      .innerJoin(stocks, eq(stockMembers.stockId, stocks.id))
      .where(and(eq(stockMembers.userId, user.id), isNull(stocks.deletedAt)))
      .all();

    const accessibleStockIds: string[] = memberships.map((m: any) => m.stockId);
    memberships.forEach((m: any) => stockNameMap.set(m.stockId, m.stockName));

    const allItems = await db
      .select()
      .from(items)
      .where(or(isNull(items.deletedAt), gte(items.deletedAt, thirtyDaysAgo)))
      .all();

    targetItems = allItems.filter((it) => {
      if (it.stockId && accessibleStockIds.includes(it.stockId)) return true;
      if (it.userId === user.id) return true;
      return false;
    });
  } else {
    // Check 2: Single Stock Calendar
    const stock = await db.select().from(stocks).where(and(eq(stocks.calendarToken, token), isNull(stocks.deletedAt))).get();
    if (!stock) {
      return c.text('401 Unauthorized: Invalid or revoked calendar token', 401);
    }

    calTitle = `afterBuy 該換囉 - ${stock.name}`;
    stockNameMap.set(stock.id, stock.name);

    targetItems = await db
      .select()
      .from(items)
      .where(
        and(
          eq(items.stockId, stock.id),
          or(isNull(items.deletedAt), gte(items.deletedAt, thirtyDaysAgo))
        )
      )
      .all();
  }

  const events = targetItems.map((item) => {
    const nextDue = computeNextDueDate({
      trackingMode: item.trackingMode as TrackingMode,
      startDate: item.startDate,
      cycleDays: item.cycleDays,
      paoMonths: item.paoMonths,
      expiryDate: item.expiryDate,
      warrantyDate: item.warrantyDate,
    });

    const dueDateFormatted = nextDue.replace(/-/g, '');
    const isCancelled = Boolean(item.deletedAt);
    const sequence = isCancelled ? item.calendarSequence + 1 : item.calendarSequence;

    const actionText = item.trackingMode === 'warranty' ? '保固到期' : item.trackingMode === 'expiry' ? '有效期限' : '更換提醒';
    const safeName = sanitizeIcsText(item.name);
    const safeCategory = sanitizeIcsText(item.category);
    const stockPrefix = item.stockId && stockNameMap.has(item.stockId) ? `[${sanitizeIcsText(stockNameMap.get(item.stockId)!)}] ` : '';

    if (isCancelled) {
      return [
        'BEGIN:VEVENT',
        `UID:item-${item.id}@afterbuy.app`,
        `DTSTAMP:${nowIsoCompact}`,
        `DTSTART;VALUE=DATE:${dueDateFormatted}`,
        `DTEND;VALUE=DATE:${dueDateFormatted}`,
        `SUMMARY:已取消：${stockPrefix}${safeName}`,
        `SEQUENCE:${sequence}`,
        'STATUS:CANCELLED',
        'END:VEVENT',
      ].join('\r\n');
    }

    return [
      'BEGIN:VEVENT',
      `UID:item-${item.id}@afterbuy.app`,
      `DTSTAMP:${nowIsoCompact}`,
      `DTSTART;VALUE=DATE:${dueDateFormatted}`,
      `DTEND;VALUE=DATE:${dueDateFormatted}`,
      `SUMMARY:🔄 該換了：${stockPrefix}${safeName} (${actionText})`,
      `DESCRIPTION:空間: ${stockPrefix.replace(/[\[\]\s]/g, '') || '家庭'}\\n類別: ${safeCategory}\\n目前備品庫存: ${item.backupStock}\\n前往 afterBuy 該換囉 查看: ${appOrigin}`,
      `SEQUENCE:${sequence}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:提醒：${stockPrefix}${safeName} 今日該更換/到期！`,
      'TRIGGER:-P1D',
      'END:VALARM',
      'END:VEVENT',
    ].join('\r\n');
  });

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//afterBUY//Item Lifecycles//ZH-TW',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calTitle}`,
    'X-WR-CALDESC:自動同步生活用品、濾芯、牙刷週期與保固到期日',
    'X-WR-TIMEZONE:Asia/Taipei',
    ...events,
    'END:VCALENDAR',
  ];

  return new Response(icsLines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="afterbuy.ics"',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
});

// 2. Rotate/Revoke User All-in-One Calendar Token (Protected)
calendarRouter.post('/rotate-token', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = getDb(c.env.DB);
  const newToken = generateRandomToken(32);
  const nowIso = new Date().toISOString();

  await db
    .update(users)
    .set({
      calendarToken: newToken,
      updatedAt: nowIso,
    })
    .where(eq(users.id, user.id));

  return c.json({
    success: true,
    message: '個人全域行事曆金鑰已重新產生，舊連結已全面失效',
    calendarToken: newToken,
  });
});

// 3. Rotate Stock Calendar Token (Owner / Admin only)
calendarRouter.post('/stocks/:id/rotate-token', requireAuth, async (c) => {
  const user = c.get('user')!;
  const stockId = c.req.param('id');
  const db = getDb(c.env.DB);

  const member = await db
    .select()
    .from(stockMembers)
    .where(and(eq(stockMembers.stockId, stockId), eq(stockMembers.userId, user.id)))
    .get();

  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    return c.json({ error: '只有 Owner 或 Admin 可以輪替此 Stock 的行事曆金鑰' }, 403);
  }

  const newToken = generateRandomToken(32);
  const nowIso = new Date().toISOString();

  await db
    .update(stocks)
    .set({
      calendarToken: newToken,
      updatedAt: nowIso,
    })
    .where(eq(stocks.id, stockId));

  return c.json({
    success: true,
    message: '該 Stock 獨立行事曆金鑰已重新產生',
    calendarToken: newToken,
  });
});
