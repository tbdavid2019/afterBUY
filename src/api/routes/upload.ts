import { Hono } from 'hono';
import { HonoEnv } from '../types.ts';
import { requireAuth } from '../middleware/auth.ts';

export const uploadRouter = new Hono<HonoEnv>();

// Allowed safe image MIME types and trusted extensions
const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

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

  // Strict MIME type allowlist (prevents SVG/HTML XSS)
  const mimeType = file.type?.toLowerCase() || '';
  const safeExt = ALLOWED_MIME_TYPES[mimeType];
  if (!safeExt) {
    return c.json({ error: '僅支援 JPG, PNG, WEBP, GIF 格式圖片' }, 400);
  }

  const fileKey = `photos/${crypto.randomUUID()}.${safeExt}`;

  if (c.env.R2) {
    const arrayBuffer = await file.arrayBuffer();
    await c.env.R2.put(fileKey, arrayBuffer, {
      httpMetadata: { contentType: mimeType },
    });
    return c.json({ success: true, url: `/api/media/${fileKey}` });
  }

  // Local fallback: convert to base64 data url for local dev
  const arrayBuffer = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  const dataUrl = `data:${mimeType};base64,${base64}`;

  return c.json({ success: true, url: dataUrl });
});

// Batch Upload multiple images to Cloudflare R2
uploadRouter.post('/upload/batch', requireAuth, async (c) => {
  const formData = await c.req.formData();
  let fileEntries = formData.getAll('files').filter((f): f is File => f instanceof File);

  if (fileEntries.length === 0) {
    const single = formData.get('file');
    if (single instanceof File) {
      fileEntries.push(single);
    }
  }

  if (fileEntries.length === 0) {
    return c.json({ error: '請提供至少一張圖片檔案' }, 400);
  }

  if (fileEntries.length > 10) {
    return c.json({ error: '單次批次上傳最多 10 張圖片' }, 400);
  }

  const uploadedUrls: string[] = [];

  for (const file of fileEntries) {
    if (file.size > 5 * 1024 * 1024) continue;
    const mimeType = file.type?.toLowerCase() || '';
    const safeExt = ALLOWED_MIME_TYPES[mimeType];
    if (!safeExt) continue;

    const fileKey = `photos/${crypto.randomUUID()}.${safeExt}`;
    const arrayBuffer = await file.arrayBuffer();

    if (c.env.R2) {
      await c.env.R2.put(fileKey, arrayBuffer, {
        httpMetadata: { contentType: mimeType },
      });
      uploadedUrls.push(`/api/media/${fileKey}`);
    } else {
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      uploadedUrls.push(`data:${mimeType};base64,${base64}`);
    }
  }

  return c.json({
    success: true,
    count: uploadedUrls.length,
    urls: uploadedUrls,
  });
});

// Serve media from Cloudflare R2 with hardened security headers
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
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");

  return new Response(object.body, { headers });
});
