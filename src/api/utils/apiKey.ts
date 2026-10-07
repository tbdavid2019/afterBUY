/**
 * API Key Utilities for afterBUY Agent Authentication
 * Standard format: ab_live_<32_random_bytes_in_hex> (72 chars total)
 */

export const API_KEY_PREFIX = 'ab_live_';
export const RAW_KEY_LENGTH = API_KEY_PREFIX.length + 64; // 8 + 64 = 72 chars

/**
 * Computes SHA-256 hash of a string using Web Crypto API.
 */
export async function hashApiKey(rawKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(rawKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validates whether a token conforms to the afterBUY API key format.
 */
export function isValidApiKeyFormat(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  if (!token.startsWith(API_KEY_PREFIX)) return false;
  if (token.length !== RAW_KEY_LENGTH) return false;
  const hexPart = token.slice(API_KEY_PREFIX.length);
  return /^[0-9a-f]{64}$/i.test(hexPart);
}

/**
 * Generates a new cryptographically secure API key.
 * Returns rawKey (to display once), keyPrefix (for display), and keyHash (for DB).
 */
export async function generateApiKey(): Promise<{
  rawKey: string;
  keyPrefix: string;
  keyHash: string;
}> {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const hexPart = Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  const rawKey = `${API_KEY_PREFIX}${hexPart}`;
  const keyPrefix = `${rawKey.slice(0, 16)}...`;
  const keyHash = await hashApiKey(rawKey);

  return {
    rawKey,
    keyPrefix,
    keyHash,
  };
}
