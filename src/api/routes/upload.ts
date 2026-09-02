import { Hono } from 'hono';
import { HonoEnv } from '../types.ts';
import { requireAuth } from '../middleware/auth.ts';

export const uploadRouter = new Hono<HonoEnv>();

// Upload image to Cloudflare R2
uploadRouter.post('/upload', requireAuth, async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'];

  if (!file || !(file instanceof File)) {
    return c.json({ error: '請提供有效的圖片檔案' }, 400);
  }

  // Size limit 5MB
  if (file.size > 5 * 1024 * 1024) {
    return c.json({ error: '圖片大小不能超過 5MB' }, 400);
  }

  const ext = file.name.split('.').pop() || 'jpg';
  const fileKey = `photos/${crypto.randomUUID()}.${ext}`;

  if (c.env.R2) {
    const arrayBuffer = await file.arrayBuffer();
    await c.env.R2.put(fileKey, arrayBuffer, {
      httpMetadata: { contentType: file.type || 'image/jpeg' },
    });
    return c.json({ success: true, url: `/api/media/${fileKey}` });
  }

  // Local fallback: convert to base64 data url for local dev
  const arrayBuffer = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  const dataUrl = `data:${file.type || 'image/jpeg'};base64,${base64}`;

  return c.json({ success: true, url: dataUrl });
});

// Serve media from Cloudflare R2
uploadRouter.get('/media/*', async (c) => {
  const key = c.req.path.replace('/api/media/', '');
  if (!key || !c.env.R2) {
    return c.notFound();
  }

  const object = await c.env.R2.get(key);
  if (!object) {
    return c.notFound();
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  return new Response(object.body, { headers });
});
