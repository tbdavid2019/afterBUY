import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { eq, and } from 'drizzle-orm';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { isoBase64URL, isoUint8Array } from '@simplewebauthn/server/helpers';
import { HonoEnv } from '../types.ts';
import { getDb, users, passkeyCredentials, notificationSettings } from '../db/index.ts';
import { generateOTP, generateRandomToken, hashString, createSessionToken, verifySessionToken } from '../utils/auth.ts';
import { UserSession } from '../../shared/types.ts';

export const authRouter = new Hono<HonoEnv>();

// Helper to get effective origin and RP ID
function getRPInfo(c: any) {
  const host = c.req.header('host') || 'localhost:5173';
  const hostname = host.split(':')[0];
  const origin = c.env.APP_ORIGIN || (host.includes('localhost') ? `http://${host}` : `https://${host}`);
  return { rpID: hostname, origin, rpName: c.env.APP_NAME || 'afterBUY' };
}

// 1. Send Email OTP
authRouter.post('/otp/send', async (c) => {
  const { email } = await c.req.json<{ email?: string }>();
  if (!email || !email.includes('@')) {
    return c.json({ error: '請輸入有效的 Email 地址' }, 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const kv = c.env.KV;

  // Rate limit: 1 per 60s
  if (kv) {
    const minLock = await kv.get(`rate:otp:min:${normalizedEmail}`);
    if (minLock) {
      return c.json({ error: '發送過於頻繁，請於 60 秒後再試' }, 429);
    }
    const dayCountStr = await kv.get(`rate:otp:day:${normalizedEmail}`);
    const dayCount = dayCountStr ? parseInt(dayCountStr, 10) : 0;
    if (dayCount >= 5) {
      return c.json({ error: '今日驗證碼發送次數已達上限 (5次)' }, 429);
    }
  }

  const otp = generateOTP();
  const otpHashed = await hashString(otp, normalizedEmail);

  // Store in KV with 10 min TTL
  if (kv) {
    await kv.put(`otp:${normalizedEmail}`, otpHashed, { expirationTtl: 600 });
    await kv.put(`rate:otp:min:${normalizedEmail}`, '1', { expirationTtl: 60 });
    const dayCountStr = await kv.get(`rate:otp:day:${normalizedEmail}`);
    const dayCount = dayCountStr ? parseInt(dayCountStr, 10) : 0;
    await kv.put(`rate:otp:day:${normalizedEmail}`, (dayCount + 1).toString(), { expirationTtl: 86400 });
  }

  // Send email via Resend if key exists
  if (c.env.RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${c.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: c.env.EMAIL_FROM || 'afterBUY <notifications@afterbuy.app>',
          to: [normalizedEmail],
          subject: `【afterBUY】您的登入驗證碼為 ${otp}`,
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 12px;">
              <h2 style="color: #38bdf8; margin-bottom: 12px;">afterBUY 買了之後</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #94a3b8;">您好！請使用以下 6 位數驗證碼登入您的帳戶（10分鐘內有效）：</p>
              <div style="text-align: center; margin: 24px 0;">
                <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #38bdf8; background: #1e293b; padding: 12px 24px; border-radius: 8px; border: 1px solid #334155;">${otp}</span>
              </div>
              <p style="font-size: 13px; color: #64748b;">若非您本人操作，請忽略此信件。</p>
            </div>
          `,
        }),
      });
    } catch (err) {
      console.error('Failed to send Resend email:', err);
    }
  } else {
    // In local dev without Resend key, log to console only
    console.log(`[DEV OTP] Verification code for ${normalizedEmail} is: ${otp}`);
  }

  // SEC-02 Fixed: Never expose OTP code in HTTP response JSON
  return c.json({
    success: true,
    message: '驗證碼已寄出',
  });
});

// 2. Verify Email OTP & Session Issuance
authRouter.post('/otp/verify', async (c) => {
  const { email, code } = await c.req.json<{ email?: string; code?: string }>();
  if (!email || !code) {
    return c.json({ error: '請輸入 Email 與 6 位數驗證碼' }, 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const kv = c.env.KV;
  const inputHash = await hashString(code.trim(), normalizedEmail);

  if (kv) {
    const storedHash = await kv.get(`otp:${normalizedEmail}`);
    if (!storedHash || storedHash !== inputHash) {
      return c.json({ error: '驗證碼錯誤或已過期' }, 400);
    }
    await kv.delete(`otp:${normalizedEmail}`);
  }

  const db = getDb(c.env.DB);
  const now = new Date().toISOString();

  // Find or provision user
  let userRecord = await db.select().from(users).where(eq(users.email, normalizedEmail)).get();

  if (!userRecord) {
    const newUserId = crypto.randomUUID();
    const calendarToken = generateRandomToken(32);
    userRecord = {
      id: newUserId,
      email: normalizedEmail,
      calendarToken,
      isVip: 0,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(users).values(userRecord);

    // Create default notification settings
    await db.insert(notificationSettings).values({
      userId: newUserId,
      emailEnabled: 1,
      pushEnabled: 1,
      warningDaysBefore: 3,
      warningDayOf: 1,
      preferredHour: 8,
      updatedAt: now,
    });
  }

  const userSession: UserSession = {
    id: userRecord.id,
    email: userRecord.email,
    calendarToken: userRecord.calendarToken,
    isVip: Boolean(userRecord.isVip),
  };

  const sessionToken = await createSessionToken(userSession, c.env.SESSION_SECRET);
  setCookie(c, 'afterbuy_session', sessionToken, {
    httpOnly: true,
    secure: !c.req.header('host')?.includes('localhost'),
    sameSite: 'Lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return c.json({ success: true, user: userSession });
});

// 3. Passkey Registration Options
authRouter.get('/passkey/register-options', async (c) => {
  const sessionToken = getCookie(c, 'afterbuy_session');
  if (!sessionToken) return c.json({ error: '請先登入以綁定 Passkey' }, 401);

  const user = await verifySessionToken(sessionToken, c.env.SESSION_SECRET);
  if (!user) return c.json({ error: '登入已過期' }, 401);

  const db = getDb(c.env.DB);
  const existingCreds = await db
    .select()
    .from(passkeyCredentials)
    .where(eq(passkeyCredentials.userId, user.id))
    .all();

  const { rpID, rpName } = getRPInfo(c);

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: isoUint8Array.fromUTF8String(user.id),
    userName: user.email,
    userDisplayName: user.email.split('@')[0],
    attestationType: 'none',
    excludeCredentials: existingCreds.map((cred) => ({
      id: cred.id,
      transports: cred.transports ? JSON.parse(cred.transports) : undefined,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  if (c.env.KV) {
    await c.env.KV.put(`challenge:passkey:reg:${user.id}`, options.challenge, { expirationTtl: 300 });
  }

  return c.json(options);
});

// 4. Passkey Registration Verify
authRouter.post('/passkey/register-verify', async (c) => {
  const sessionToken = getCookie(c, 'afterbuy_session');
  if (!sessionToken) return c.json({ error: '請先登入以綁定 Passkey' }, 401);

  const user = await verifySessionToken(sessionToken, c.env.SESSION_SECRET);
  if (!user) return c.json({ error: '登入已過期' }, 401);

  const body = await c.req.json();
  const { response, deviceName } = body;

  const expectedChallenge = c.env.KV ? await c.env.KV.get(`challenge:passkey:reg:${user.id}`) : null;
  if (!expectedChallenge) {
    return c.json({ error: 'Passkey 註冊逾時，請重試' }, 400);
  }

  const { rpID, origin } = getRPInfo(c);

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return c.json({ error: 'Passkey 驗證失敗' }, 400);
  }

  const { credential } = verification.registrationInfo;
  const db = getDb(c.env.DB);
  const now = new Date().toISOString();

  await db.insert(passkeyCredentials).values({
    id: credential.id,
    userId: user.id,
    publicKey: isoBase64URL.fromBuffer(credential.publicKey),
    counter: credential.counter,
    deviceName: deviceName || 'Touch ID / Face ID 裝置',
    transports: response.response.transports ? JSON.stringify(response.response.transports) : null,
    createdAt: now,
    lastUsedAt: now,
  });

  if (c.env.KV) {
    await c.env.KV.delete(`challenge:passkey:reg:${user.id}`);
  }

  return c.json({ success: true, message: 'Passkey 綁定成功！' });
});

// 5. Passkey Authentication Options (1-Click Login)
authRouter.post('/passkey/auth-options', async (c) => {
  const { rpID } = getRPInfo(c);
  const challengeId = generateRandomToken(16);

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
  });

  if (c.env.KV) {
    await c.env.KV.put(`challenge:passkey:auth:${challengeId}`, options.challenge, { expirationTtl: 300 });
  }

  return c.json({ options, challengeId });
});

// 6. Passkey Authentication Verify
authRouter.post('/passkey/auth-verify', async (c) => {
  const { response, challengeId } = await c.req.json();
  if (!challengeId) return c.json({ error: '無效的認證請求' }, 400);

  const expectedChallenge = c.env.KV ? await c.env.KV.get(`challenge:passkey:auth:${challengeId}`) : null;
  if (!expectedChallenge) {
    return c.json({ error: '登入挑戰已逾時，請重試' }, 400);
  }

  const db = getDb(c.env.DB);
  const credRecord = await db
    .select()
    .from(passkeyCredentials)
    .where(eq(passkeyCredentials.id, response.id))
    .get();

  if (!credRecord) {
    return c.json({ error: '找不到此裝置的 Passkey 憑證' }, 400);
  }

  const userRecord = await db.select().from(users).where(eq(users.id, credRecord.userId)).get();
  if (!userRecord) {
    return c.json({ error: '用戶不存在' }, 400);
  }

  const { rpID, origin } = getRPInfo(c);

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: credRecord.id,
      publicKey: isoBase64URL.toBuffer(credRecord.publicKey),
      counter: credRecord.counter,
    },
  });

  if (!verification.verified) {
    return c.json({ error: '生物辨識驗證失敗' }, 400);
  }

  const now = new Date().toISOString();
  await db
    .update(passkeyCredentials)
    .set({
      counter: verification.authenticationInfo.newCounter,
      lastUsedAt: now,
    })
    .where(eq(passkeyCredentials.id, credRecord.id));

  if (c.env.KV) {
    await c.env.KV.delete(`challenge:passkey:auth:${challengeId}`);
  }

  const userSession: UserSession = {
    id: userRecord.id,
    email: userRecord.email,
    calendarToken: userRecord.calendarToken,
    isVip: Boolean(userRecord.isVip),
  };

  const sessionToken = await createSessionToken(userSession, c.env.SESSION_SECRET);
  setCookie(c, 'afterbuy_session', sessionToken, {
    httpOnly: true,
    secure: !c.req.header('host')?.includes('localhost'),
    sameSite: 'Lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return c.json({ success: true, user: userSession });
});

// 7. Get Current User Session & Passkey devices
authRouter.get('/me', async (c) => {
  const sessionToken = getCookie(c, 'afterbuy_session');
  if (!sessionToken) return c.json({ user: null });

  const user = await verifySessionToken(sessionToken, c.env.SESSION_SECRET);
  if (!user) return c.json({ user: null });

  const db = getDb(c.env.DB);
  const allCreds = await db
    .select()
    .from(passkeyCredentials)
    .where(eq(passkeyCredentials.userId, user.id))
    .all();

  const devices = allCreds.map(cred => ({
    id: cred.id,
    deviceName: cred.deviceName,
    createdAt: cred.createdAt,
    lastUsedAt: cred.lastUsedAt,
  }));

  return c.json({ user, devices });
});

// 8. Delete a Passkey Credential (SEC-03 Fixed: Scoped by userId to prevent IDOR)
authRouter.delete('/passkey/:id', async (c) => {
  const sessionToken = getCookie(c, 'afterbuy_session');
  if (!sessionToken) return c.json({ error: '請先登入' }, 401);

  const user = await verifySessionToken(sessionToken, c.env.SESSION_SECRET);
  if (!user) return c.json({ error: '登入已過期' }, 401);

  const credId = c.req.param('id');
  const db = getDb(c.env.DB);

  await db
    .delete(passkeyCredentials)
    .where(and(eq(passkeyCredentials.id, credId), eq(passkeyCredentials.userId, user.id)))
    .run();

  return c.json({ success: true, message: 'Passkey 憑證已刪除' });
});

// 9. Logout
authRouter.post('/logout', async (c) => {
  deleteCookie(c, 'afterbuy_session');
  return c.json({ success: true, message: '已安全登出' });
});
