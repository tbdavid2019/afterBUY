import type { UserSession } from '../../shared/types.ts';

const DEFAULT_SECRET = 'afterbuy-super-secure-session-secret-local-32chars';

export function generateOTP(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const code = (array[0] % 900000) + 100000;
  return code.toString();
}

export function generateRandomToken(bytes: number = 24): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashString(value: string, salt: string = 'afterbuy-salt'): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function createSessionToken(user: UserSession, secret: string = DEFAULT_SECRET): Promise<string> {
  const payload = JSON.stringify({
    ...user,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30 // 30 days
  });
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const sigHex = Array.from(new Uint8Array(signature), b => b.toString(16).padStart(2, '0')).join('');
  const b64Payload = btoa(encodeURIComponent(payload));
  return `${b64Payload}.${sigHex}`;
}

export async function verifySessionToken(token: string, secret: string = DEFAULT_SECRET): Promise<UserSession | null> {
  try {
    const [b64Payload, sigHex] = token.split('.');
    if (!b64Payload || !sigHex) return null;

    const payload = decodeURIComponent(atob(b64Payload));
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigBytes = new Uint8Array(sigHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(payload));
    if (!isValid) return null;

    const data = JSON.parse(payload);
    if (data.exp && Date.now() > data.exp) return null;

    return {
      id: data.id,
      email: data.email,
      calendarToken: data.calendarToken,
      isVip: Boolean(data.isVip)
    };
  } catch {
    return null;
  }
}
