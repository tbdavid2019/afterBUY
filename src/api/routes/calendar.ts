import { Hono } from 'hono';
import { eq, and, or, isNull, gte } from 'drizzle-orm';
import { HonoEnv } from '../types.ts';
import { requireAuth } from '../middleware/auth.ts';
import { getDb, users, items } from '../db/index.ts';
import { computeNextDueDate } from '../../shared/lifecycle.ts';
import { TrackingMode } from '../../shared/types.ts';
import { generateRandomToken } from '../utils/auth.ts';

export const calendarRouter = new Hono<HonoEnv>();

// 1. Dynamic RFC 5545 WebCal stream endpoint
calendarRouter.get('/:token.ics', async (c) => {
  const token = c.req.param('token');
  if (!token) {
    return c.text('400 Bad Request: Missing calendar token', 400);
  }

  const db = getDb(c.env.DB);
  const user = await db.select().from(users).where(eq(users.calendarToken, token)).get();
  if (!user) {
    return c.text('401 Unauthorized: Invalid or revoked calendar token', 401);
  }

  // Look for active items OR items deleted within the last 30 days (tombstones)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const userItems = await db
    .select()
    .from(items)
    .where(
      and(
        eq(items.userId, user.id),
        or(isNull(items.deletedAt), gte(items.deletedAt, thirtyDaysAgo))
      )
    )
    .all();

  const appOrigin = c.env.APP_ORIGIN || 'https://afterbuy.app';
  const nowIsoCompact = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const events = userItems.map((item) => {
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

    if (isCancelled) {
      return [
        'BEGIN:VEVENT',
        `UID:item-${item.id}@afterbuy.app`,
        `DTSTAMP:${nowIsoCompact}`,
        `DTSTART;VALUE=DATE:${dueDateFormatted}`,
        `DTEND;VALUE=DATE:${dueDateFormatted}`,
        `SUMMARY:已取消：${item.name}`,
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
      `SUMMARY:🔄 該換了：${item.name} (${actionText})`,
      `DESCRIPTION:類別: ${item.category}\\n目前備品庫存: ${item.backupStock}\\n點擊前往 afterBUY 查看並更換: ${appOrigin}`,
      `SEQUENCE:${sequence}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:提醒：${item.name} 今日該更換/到期！`,
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
    'X-WR-CALNAME:afterBUY 耗材更換與保固提醒',
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

// 2. Rotate/Revoke Calendar Token (Protected)
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
    message: '行事曆訂閱金鑰已重新產生，舊連結已全面失效',
    calendarToken: newToken,
  });
});
