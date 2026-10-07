import { Hono } from 'hono';
import { eq, and, isNull } from 'drizzle-orm';
import webpush from 'web-push';
import { HonoEnv } from '../types.ts';
import { requireAuth } from '../middleware/auth.ts';
import { getDb, users, items, notificationSettings, pushSubscriptions, stocks, stockMembers } from '../db/index.ts';
import { computeNextDueDate } from '../../shared/lifecycle.ts';
import { TrackingMode } from '../../shared/types.ts';
import { businessDate, businessDateDiff } from '../../shared/date.ts';

export const notificationsRouter = new Hono<HonoEnv>();

// HTML escaping helper (SEC-05 Fixed)
function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatNotificationDays(daysRemaining: number): string {
  if (daysRemaining === 0) return '今日到期';
  if (daysRemaining < 0) return `已過期 ${Math.abs(daysRemaining)} 天`;
  return `剩餘 ${daysRemaining} 天`;
}

// 1. Get Notification Settings
notificationsRouter.get('/settings', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = getDb(c.env.DB);

  let settings = await db
    .select()
    .from(notificationSettings)
    .where(eq(notificationSettings.userId, user.id))
    .get();

  if (!settings) {
    const nowIso = new Date().toISOString();
    settings = {
      userId: user.id,
      emailEnabled: 1,
      pushEnabled: 1,
      warningDaysBefore: 3,
      warningDayOf: 1,
      preferredHour: 9,
      cycleExpiryAlert: 1,
      stockLowAlert: 1,
      usageLowAlert: 1,
      expiryWarningDays: 7,
      updatedAt: nowIso,
    };
    try {
      await db.insert(notificationSettings).values(settings);
    } catch {
      // Ignore if table was partially initialized
    }
  }

  return c.json({
    settings: {
      emailEnabled: Boolean(settings.emailEnabled),
      pushEnabled: Boolean(settings.pushEnabled),
      warningDaysBefore: settings.warningDaysBefore ?? 3,
      warningDayOf: Boolean(settings.warningDayOf),
      preferredHour: settings.preferredHour ?? 9,
      cycleExpiryAlert: (settings as any).cycleExpiryAlert !== undefined ? Boolean((settings as any).cycleExpiryAlert) : true,
      stockLowAlert: (settings as any).stockLowAlert !== undefined ? Boolean((settings as any).stockLowAlert) : true,
      usageLowAlert: (settings as any).usageLowAlert !== undefined ? Boolean((settings as any).usageLowAlert) : true,
      expiryWarningDays: (settings as any).expiryWarningDays ?? 7,
    },
  });
});

// 2. Update Notification Settings
notificationsRouter.put('/settings', requireAuth, async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json<{
    emailEnabled?: boolean;
    pushEnabled?: boolean;
    warningDaysBefore?: number;
    warningDayOf?: boolean;
    preferredHour?: number;
    cycleExpiryAlert?: boolean;
    stockLowAlert?: boolean;
    usageLowAlert?: boolean;
    expiryWarningDays?: number;
  }>();

  const db = getDb(c.env.DB);
  const nowIso = new Date().toISOString();

  await db
    .update(notificationSettings)
    .set({
      emailEnabled: body.emailEnabled !== undefined ? (body.emailEnabled ? 1 : 0) : undefined,
      pushEnabled: body.pushEnabled !== undefined ? (body.pushEnabled ? 1 : 0) : undefined,
      warningDaysBefore: body.warningDaysBefore !== undefined ? body.warningDaysBefore : undefined,
      warningDayOf: body.warningDayOf !== undefined ? (body.warningDayOf ? 1 : 0) : undefined,
      preferredHour: body.preferredHour !== undefined ? body.preferredHour : undefined,
      cycleExpiryAlert: body.cycleExpiryAlert !== undefined ? (body.cycleExpiryAlert ? 1 : 0) : undefined,
      stockLowAlert: body.stockLowAlert !== undefined ? (body.stockLowAlert ? 1 : 0) : undefined,
      usageLowAlert: body.usageLowAlert !== undefined ? (body.usageLowAlert ? 1 : 0) : undefined,
      expiryWarningDays: body.expiryWarningDays !== undefined ? body.expiryWarningDays : undefined,
      updatedAt: nowIso,
    })
    .where(eq(notificationSettings.userId, user.id));

  return c.json({ success: true, message: '通知偏好已儲存' });
});

// 3. Get VAPID Public Key for Web Push
notificationsRouter.get('/vapid-key', async (c) => {
  const vapidPublicKey = c.env.VAPID_PUBLIC_KEY || 'BFG7...dummy_local_key';
  return c.json({ publicKey: vapidPublicKey });
});

// 4. Register Web Push Subscription
notificationsRouter.post('/push-subscribe', requireAuth, async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json<{
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }>();

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return c.json({ error: '無效的 Push 訂閱參數' }, 400);
  }

  const db = getDb(c.env.DB);
  const nowIso = new Date().toISOString();

  // Upsert subscription
  const existing = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, body.endpoint))
    .get();

  if (existing) {
    await db
      .update(pushSubscriptions)
      .set({
        userId: user.id,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
      })
      .where(eq(pushSubscriptions.endpoint, body.endpoint));
  } else {
    await db.insert(pushSubscriptions).values({
      id: crypto.randomUUID(),
      userId: user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      createdAt: nowIso,
    });
  }

  return c.json({ success: true, message: 'Web Push 裝置訂閱成功' });
});

// 5. Scheduled Cron Notification Dispatcher
export async function dispatchScheduledNotifications(env: HonoEnv['Bindings']) {
  const db = getDb(env.DB);
  const todayStr = businessDate();

  // Configure VAPID if available
  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      env.VAPID_SUBJECT || 'mailto:support@afterbuy.app',
      env.VAPID_PUBLIC_KEY,
      env.VAPID_PRIVATE_KEY
    );
  }

  // Query all active users
  const allUsers = await db.select().from(users).all();

  for (const u of allUsers) {
    // Get user's notification settings
    const settings = await db
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, u.id))
      .get();

    const cycleExpiryAlert = (settings as any)?.cycleExpiryAlert !== undefined ? Boolean((settings as any).cycleExpiryAlert) : true;
    const stockLowAlert = (settings as any)?.stockLowAlert !== undefined ? Boolean((settings as any).stockLowAlert) : true;
    const usageLowAlert = (settings as any)?.usageLowAlert !== undefined ? Boolean((settings as any).usageLowAlert) : true;
    const warningDays = settings?.warningDaysBefore ?? 3;
    const expiryWarningDays = (settings as any)?.expiryWarningDays ?? 7;
    const emailEnabled = settings ? Boolean(settings.emailEnabled) : true;
    const pushEnabled = settings ? Boolean(settings.pushEnabled) : true;

    // Get user's accessible stocks
    const userMemberships = await (db as any)
      .select({
        stockId: stockMembers.stockId,
        stockName: stocks.name,
      })
      .from(stockMembers)
      .innerJoin(stocks, eq(stockMembers.stockId, stocks.id))
      .where(and(eq(stockMembers.userId, u.id), isNull(stocks.deletedAt)))
      .all();

    const accessibleStockIds: string[] = userMemberships.map((m: any) => m.stockId);
    const stockNameMap = new Map<string, string>();
    userMemberships.forEach((m: any) => stockNameMap.set(m.stockId, m.stockName));

    // Get user's active items across all accessible stocks
    const allItems = await db.select().from(items).where(isNull(items.deletedAt)).all();
    const userItems = allItems.filter((it) => {
      if (it.stockId && accessibleStockIds.includes(it.stockId)) return true;
      if (it.userId === u.id) return true;
      return false;
    });

    // 1. 耗材到期提醒 (週期更換與有效期限)
    const cycleExpiryItems: Array<{ item: typeof items.$inferSelect; daysRemaining: number; nextDue: string; stockName: string }> = [];

    // 2. 備品庫存提醒 (備品低於安全庫存)
    const lowStockItems: Array<{ item: typeof items.$inferSelect; backupStock: number; minStock: number; stockName: string }> = [];

    // 3. 用量提醒 (剩餘顆數/容量偏低與預估快用完)
    const lowUsageItems: Array<{ item: typeof items.$inferSelect; remainingQty: number; remainingDays: number; stockName: string; unit: string }> = [];

    for (const item of userItems) {
      const stockName = (item.stockId && stockNameMap.get(item.stockId)) || '甜蜜的家';

      // --- 提醒維度 2: 備品庫存提醒 (獨立判定，不論更換日期) ---
      if (stockLowAlert) {
        const minStock = item.minStockAlert ?? 1;
        if (item.backupStock < minStock) {
          lowStockItems.push({
            item,
            backupStock: item.backupStock,
            minStock,
            stockName,
          });
        }
      }

      // --- 提醒維度 3: 用量提醒 (針對數量追蹤模式獨立計算) ---
      if (item.trackingMode === 'quantity') {
        if (usageLowAlert) {
          if (!item.isStored && (!item.snoozeUntil || item.snoozeUntil <= todayStr)) {
            const initQty = item.initialQuantity || 60;
            const rate = Math.max(0.01, item.dailyUsage || 1);
            const remainingQty = item.currentQuantity !== null && item.currentQuantity !== undefined
              ? Math.max(0, item.currentQuantity)
              : Math.max(0, initQty - (businessDateDiff(item.startDate, todayStr) * rate));
            const remainingDays = Math.ceil(remainingQty / rate);

            if (remainingDays <= warningDays || remainingQty <= 0) {
              lowUsageItems.push({
                item,
                remainingQty: Math.round(remainingQty * 10) / 10,
                remainingDays,
                stockName,
                unit: item.quantityUnit || '顆',
              });
            }
          }
        }
      } else {
        // --- 提醒維度 1: 耗材到期提醒 (週期更換與有效期限) ---
        if (cycleExpiryAlert) {
          if (item.isStored && item.trackingMode !== 'expiry' && item.trackingMode !== 'warranty') continue;
          if (item.snoozeUntil && item.snoozeUntil > todayStr) continue;

          const nextDue = computeNextDueDate({
            trackingMode: item.trackingMode as TrackingMode,
            startDate: item.startDate,
            cycleDays: item.cycleDays,
            paoMonths: item.paoMonths,
            expiryDate: item.expiryDate,
            warrantyDate: item.warrantyDate,
          });

          const daysRemaining = businessDateDiff(todayStr, nextDue);
          const thresholdDays = item.trackingMode === 'expiry' ? expiryWarningDays : warningDays;

          if (daysRemaining <= thresholdDays) {
            cycleExpiryItems.push({ item, daysRemaining, nextDue, stockName });
          }
        }
      }
    }

    const totalUrgent = cycleExpiryItems.length + lowStockItems.length + lowUsageItems.length;
    if (totalUrgent === 0) continue;

    // A. Send Web Push (分開維度精確提示)
    if (pushEnabled && env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
      const subs = await db
        .select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, u.id))
        .all();

      for (const sub of subs) {
        try {
          const parts: string[] = [];
          if (cycleExpiryItems.length > 0) parts.push(`${cycleExpiryItems.length} 項到期`);
          if (lowStockItems.length > 0) parts.push(`${lowStockItems.length} 項缺備品`);
          if (lowUsageItems.length > 0) parts.push(`${lowUsageItems.length} 項用量偏低`);

          let title = `【補貨日記】您有 ${totalUrgent} 項生活提醒（${parts.join('、')}）`;
          if (totalUrgent === 1) {
            if (cycleExpiryItems[0]) title = `【到期】[${cycleExpiryItems[0].stockName}] ${cycleExpiryItems[0].item.name} 該換了！`;
            else if (lowStockItems[0]) title = `【缺備品】[${lowStockItems[0].stockName}] ${lowStockItems[0].item.name} 備品不足需補貨！`;
            else if (lowUsageItems[0]) title = `【用量告急】[${lowUsageItems[0].stockName}] ${lowUsageItems[0].item.name} 即將用完！`;
          }

          const bodyParts: string[] = [];
          cycleExpiryItems.slice(0, 2).forEach((i) => bodyParts.push(`⏳ ${i.item.name} (${formatNotificationDays(i.daysRemaining)})`));
          lowStockItems.slice(0, 2).forEach((i) => bodyParts.push(`📦 ${i.item.name} (剩 ${i.backupStock} 備品)`));
          lowUsageItems.slice(0, 2).forEach((i) => bodyParts.push(`💧 ${i.item.name} (剩 ${i.remainingQty} ${i.unit})`));
          const body = bodyParts.join(' · ');

          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify({
              title,
              body,
              url: env.APP_ORIGIN || 'https://afterbuy.app',
            })
          );
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id)).run();
          }
        }
      }
    }

    // B. Send Email Digest (三大獨立模組排版: 到期提醒 + 備品提醒 + 用量提醒)
    if (emailEnabled && env.RESEND_API_KEY) {
      try {
        const sectionsHtml: string[] = [];

        // 1. 到期更換區塊
        if (cycleExpiryItems.length > 0) {
          const rows = cycleExpiryItems.map((i) => `
            <tr style="border-bottom: 1px solid #334155;">
              <td style="padding: 10px 8px; font-weight: 600; color: #f8fafc;">
                <span style="font-size: 11px; background: #334155; color: #FB923C; padding: 2px 6px; border-radius: 4px; margin-right: 6px;">${escapeHtml(i.stockName)}</span>
                ${escapeHtml(i.item.name)}
              </td>
              <td style="padding: 10px 8px; color: ${i.daysRemaining <= 0 ? '#f43f5e' : '#f59e0b'};">
                ${i.daysRemaining === 0 ? '🔥 今日到期' : i.daysRemaining < 0 ? `🔥 已過期 ${Math.abs(i.daysRemaining)} 天` : `⏳ 剩餘 ${i.daysRemaining} 天`}
              </td>
              <td style="padding: 10px 8px; color: #94a3b8;">備品: ${i.item.backupStock}</td>
            </tr>
          `).join('');

          sectionsHtml.push(`
            <div style="margin-bottom: 20px;">
              <h3 style="color: #f59e0b; margin: 0 0 10px 0; font-size: 14px; font-weight: bold; border-bottom: 1px solid #334155; padding-bottom: 6px;">
                📅 到期更換提醒 (${cycleExpiryItems.length} 項)
              </h3>
              <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                <tbody>${rows}</tbody>
              </table>
            </div>
          `);
        }

        // 2. 備品庫存不足區塊
        if (lowStockItems.length > 0) {
          const rows = lowStockItems.map((i) => `
            <tr style="border-bottom: 1px solid #334155;">
              <td style="padding: 10px 8px; font-weight: 600; color: #f8fafc;">
                <span style="font-size: 11px; background: #334155; color: #38bdf8; padding: 2px 6px; border-radius: 4px; margin-right: 6px;">${escapeHtml(i.stockName)}</span>
                ${escapeHtml(i.item.name)}
              </td>
              <td style="padding: 10px 8px; color: #f43f5e; font-weight: bold;">
                現存備品: ${i.backupStock}
              </td>
              <td style="padding: 10px 8px; color: #94a3b8;">安全庫存門檻: ${i.minStock} (請補貨)</td>
            </tr>
          `).join('');

          sectionsHtml.push(`
            <div style="margin-bottom: 20px;">
              <h3 style="color: #38bdf8; margin: 0 0 10px 0; font-size: 14px; font-weight: bold; border-bottom: 1px solid #334155; padding-bottom: 6px;">
                📦 備品庫存提醒 (${lowStockItems.length} 項低於安全庫存)
              </h3>
              <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                <tbody>${rows}</tbody>
              </table>
            </div>
          `);
        }

        // 3. 用量快用完區塊
        if (lowUsageItems.length > 0) {
          const rows = lowUsageItems.map((i) => `
            <tr style="border-bottom: 1px solid #334155;">
              <td style="padding: 10px 8px; font-weight: 600; color: #f8fafc;">
                <span style="font-size: 11px; background: #334155; color: #a78bfa; padding: 2px 6px; border-radius: 4px; margin-right: 6px;">${escapeHtml(i.stockName)}</span>
                ${escapeHtml(i.item.name)}
              </td>
              <td style="padding: 10px 8px; color: #a78bfa; font-weight: bold;">
                剩餘 ${i.remainingQty} ${escapeHtml(i.unit)}
              </td>
              <td style="padding: 10px 8px; color: #94a3b8;">預估可用: ${i.remainingDays} 天</td>
            </tr>
          `).join('');

          sectionsHtml.push(`
            <div style="margin-bottom: 20px;">
              <h3 style="color: #a78bfa; margin: 0 0 10px 0; font-size: 14px; font-weight: bold; border-bottom: 1px solid #334155; padding-bottom: 6px;">
                💧 用量快用完提醒 (${lowUsageItems.length} 項即將用罄)
              </h3>
              <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                <tbody>${rows}</tbody>
              </table>
            </div>
          `);
        }

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: env.EMAIL_FROM || '補貨日記 <notifications@create360.ai>',
            to: [u.email],
            subject: `【補貨日記 晨間提醒】您有 ${totalUrgent} 項耗材、備品或用量提醒`,
            html: `
              <div style="font-family: sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 12px;">
                <h2 style="color: #FB923C; margin-bottom: 8px;">補貨日記 晨間更換與庫存提醒</h2>
                <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">早安！以下是您所屬備品庫中需要注意的耗材更換、備品不足與用量預警：</p>
                ${sectionsHtml.join('')}
                <div style="text-align: center; margin-top: 24px;">
                  <a href="${env.APP_ORIGIN || 'https://afterbuy.app'}" style="display: inline-block; background: #FB923C; color: #0f172a; font-weight: bold; padding: 12px 24px; border-radius: 8px; text-decoration: none;">開啟 補貨日記 處理</a>
                </div>
              </div>
            `,
          }),
        });
      } catch (err) {
        console.error('Failed to send daily digest email:', err);
      }
    }
  }
}

// 6. Cron trigger HTTP endpoint (SEC-06 Fixed: constant-time comparison)
notificationsRouter.post('/cron-trigger', async (c) => {
  const authHeader = c.req.header('Authorization');
  const expectedSecret = c.env.CRON_SECRET || 'afterbuy-cron-secret-local';
  const expectedBearer = `Bearer ${expectedSecret}`;

  if (!authHeader || authHeader.length !== expectedBearer.length) {
    return c.json({ error: '401 Unauthorized' }, 401);
  }

  // Constant-time comparison
  const encoder = new TextEncoder();
  const a = encoder.encode(authHeader);
  const b = encoder.encode(expectedBearer);
  let match = 0;
  for (let i = 0; i < a.length; i++) {
    match |= a[i] ^ b[i];
  }

  if (match !== 0) {
    return c.json({ error: '401 Unauthorized' }, 401);
  }

  await dispatchScheduledNotifications(c.env);
  return c.json({ success: true, message: '排程通知處理完畢' });
});
