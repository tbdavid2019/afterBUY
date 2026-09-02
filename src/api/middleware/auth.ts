import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import { HonoEnv } from '../types.ts';
import { verifySessionToken } from '../utils/auth.ts';

export const requireAuth = createMiddleware<HonoEnv>(async (c, next) => {
  const sessionToken = getCookie(c, 'afterbuy_session');
  if (!sessionToken) {
    return c.json({ error: '請先登入' }, 401);
  }

  const user = await verifySessionToken(sessionToken, c.env.SESSION_SECRET);
  if (!user) {
    return c.json({ error: '登入憑據無效或已過期' }, 401);
  }

  c.set('user', user);
  await next();
});
