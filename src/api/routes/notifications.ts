import { Hono } from 'hono';
import { eq, and, isNull } from 'drizzle-orm';
import webpush from 'web-push';
import { HonoEnv } from '../types.ts';
import { requireAuth } from '../middleware/auth.ts';
import { getDb, users, items, notificationSettings, pushSubscriptions } from '../db/index.ts';
import { computeNextDueDate } from '../../shared/lifecycle.ts';
import { TrackingMode } from '../../shared/types.ts';

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
      preferredHour: 8,
      updatedAt: nowIso,
    };
    await db.insert(notificationSettings).values(settings);
  }

  return c.json({
    settings: {
      emailEnabled: Boolean(settings.emailEnabled),
      pushEnabled: Boolean(settings.pushEnabled),
      warningDaysBefore: settings.warningDaysBefore,
      warningDayOf: Boolean(settings.warningDayOf),
      preferredHour: settings.preferredHour,
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
  const todayStr = new Date().toISOString().split('T')[0];
  const todayDate = new Date(todayStr + 'T00:00:00');

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

    const warningDays = settings?.warningDaysBefore ?? 3;
    const emailEnabled = settings ? Boolean(settings.emailEnabled) : true;
    const pushEnabled = settings ? Boolean(settings.pushEnabled) : true;

    // Get user's active items
    const userItems = await db
      .select()
      .from(items)
      .where(and(eq(items.userId, u.id), isNull(items.deletedAt)))
      .all();

    const urgentItems: Array<{ item: typeof items.$inferSelect; daysRemaining: number; nextDue: string }> = [];

    for (const item of userItems) {
      const nextDue = computeNextDueDate({
        trackingMode: item.trackingMode as TrackingMode,
        startDate: item.startDate,
        cycleDays: item.cycleDays,
        paoMonths: item.paoMonths,
        expiryDate: item.expiryDate,
        warrantyDate: item.warrantyDate,
      });

      const due = new Date(nextDue + 'T00:00:00');
      const daysRemaining = Math.round((due.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysRemaining <= warningDays) {
        urgentItems.push({ item, daysRemaining, nextDue });
      }
    }

    if (urgentItems.length === 0) continue;

    // A. Send Web Push
    if (pushEnabled && env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
      const subs = await db
        .select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, u.id))
        .all();

      for (const sub of subs) {
        try {
          const first = urgentItems[0];
          const title = urgentItems.length === 1
            ? `【afterBUY】${first.item.name} 該換了！`
            : `【afterBUY】您有 ${urgentItems.length} 項耗材即將到期`;
          const body = urgentItems.length === 1
            ? `${first.item.name} (${first.daysRemaining <= 0 ? '今日已到期' : `剩餘 ${first.daysRemaining} 天`})`
            : urgentItems.map(i => `${i.item.name} (${i.daysRemaining}天)`).join('、');

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
            // Subscription expired or invalid -> delete
            await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id)).run();
          }
        }
      }
    }

    // B. Send Email Digest (SEC-05 Fixed: HTML escaping on user inputs)
    if (emailEnabled && env.RESEND_API_KEY) {
      try {
        const itemRows = urgentItems
          .map(
            (i) => `
            <tr style="border-bottom: 1px solid #334155;">
              <td style="padding: 12px 8px; font-weight: 600; color: #f8fafc;">${escapeHtml(i.item.name)}</td>
              <td style="padding: 12px 8px; color: ${i.daysRemaining <= 0 ? '#f43f5e' : '#f59e0b'};">
                ${i.daysRemaining <= 0 ? '🔥 今日已到期' : `⏳ 剩餘 ${i.daysRemaining} 天`}
              </td>
              <td style="padding: 12px 8px; color: #94a3b8;">備品庫存: ${i.item.backupStock}</td>
            </tr>
          `
          )
          .join('');

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: env.EMAIL_FROM || 'afterBUY <notifications@afterbuy.app>',
            to: [u.email],
            subject: `【afterBUY 晨間提醒】您有 ${urgentItems.length} 項耗材即將到期`,
            html: `
              <div style="font-family: sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 12px;">
                <h2 style="color: #38bdf8; margin-bottom: 8px;">afterBUY 晨間更換提醒</h2>
                <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">早安！以下是您家中今日或近期需要更換的生活耗材：</p>
                <table style="width: 100%; border-collapse: collapse; text-align: left; margin-bottom: 24px;">
                  <thead>
                    <tr style="border-bottom: 2px solid #475569; color: #94a3b8; font-size: 13px;">
                      <th style="padding: 8px;">物品名稱</th>
                      <th style="padding: 8px;">狀態</th>
                      <th style="padding: 8px;">備品庫存</th>
                    </tr>
                  </thead>
                  <tbody>${itemRows}</tbody>
                </table>
                <div style="text-align: center;">
                  <a href="${env.APP_ORIGIN || 'https://afterbuy.app'}" style="display: inline-block; background: #38bdf8; color: #0f172a; font-weight: bold; padding: 12px 24px; border-radius: 8px; text-decoration: none;">開啟 afterBUY 標記已換</a>
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
