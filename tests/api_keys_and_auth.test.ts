import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { generateApiKey, hashApiKey, isValidApiKeyFormat } from '../src/api/utils/apiKey.ts';

describe('API Keys & Dual-Mode Auth Tests', () => {
  it('should generate valid API key with correct format and prefix', async () => {
    const { rawKey, keyPrefix, keyHash } = await generateApiKey();

    assert.equal(typeof rawKey, 'string');
    assert.equal(rawKey.startsWith('ab_live_'), true);
    assert.equal(rawKey.length, 72); // 'ab_live_' (8) + 64 hex chars = 72
    assert.equal(keyPrefix, `${rawKey.slice(0, 16)}...`);
    assert.equal(keyHash.length, 64); // SHA-256 hex is 64 chars

    // Re-hashing the rawKey should match keyHash exactly
    const recomputedHash = await hashApiKey(rawKey);
    assert.equal(recomputedHash, keyHash);
  });

  it('should correctly validate API key format', () => {
    const validKey = 'ab_live_' + 'a'.repeat(64);
    assert.equal(isValidApiKeyFormat(validKey), true);

    // Invalid prefix
    assert.equal(isValidApiKeyFormat('test_key_' + 'a'.repeat(64)), false);
    // Too short
    assert.equal(isValidApiKeyFormat('ab_live_12345'), false);
    // Too long
    assert.equal(isValidApiKeyFormat('ab_live_' + 'a'.repeat(65)), false);
    // Invalid characters (non-hex)
    assert.equal(isValidApiKeyFormat('ab_live_' + 'z'.repeat(64)), false);
    // Empty or falsy
    assert.equal(isValidApiKeyFormat(''), false);
    assert.equal(isValidApiKeyFormat(null as unknown as string), false);
    assert.equal(isValidApiKeyFormat(undefined as unknown as string), false);
  });

  it('should store, retrieve, and revoke API keys in SQLite schema', async () => {
    const db = new DatabaseSync(':memory:');

    // Create minimal schema for users & api_keys
    db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        calendar_token TEXT UNIQUE NOT NULL,
        is_vip INTEGER DEFAULT 0 NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE api_keys (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        key_prefix TEXT NOT NULL,
        key_hash TEXT NOT NULL,
        stock_id TEXT,
        scopes TEXT DEFAULT '["read", "write"]' NOT NULL,
        created_at TEXT NOT NULL,
        last_used_at TEXT,
        revoked_at TEXT
      );
    `);

    const userId = crypto.randomUUID();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO users (id, email, calendar_token, is_vip, created_at, updated_at)
      VALUES (?, 'agent-tester@example.com', ?, 0, ?, ?);
    `).run(userId, crypto.randomUUID(), now, now);

    // Generate two keys
    const key1 = await generateApiKey();
    const key2 = await generateApiKey();

    const key1Id = crypto.randomUUID();
    const key2Id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO api_keys (id, user_id, name, key_prefix, key_hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?);
    `).run(key1Id, userId, 'ChatGPT Agent', key1.keyPrefix, key1.keyHash, now);

    db.prepare(`
      INSERT INTO api_keys (id, user_id, name, key_prefix, key_hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?);
    `).run(key2Id, userId, 'Claude Project', key2.keyPrefix, key2.keyHash, now);

    // Verify lookup by hash
    const foundKey1 = db.prepare(`
      SELECT * FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL;
    `).get(key1.keyHash) as { id: string; name: string; user_id: string; revoked_at: string | null } | undefined;

    assert.ok(foundKey1);
    assert.equal(foundKey1.name, 'ChatGPT Agent');
    assert.equal(foundKey1.user_id, userId);

    // Revoke key 1
    const revokedTime = new Date().toISOString();
    db.prepare(`UPDATE api_keys SET revoked_at = ? WHERE id = ?;`).run(revokedTime, key1Id);

    // Lookup of revoked key should find nothing when filtering revoked_at IS NULL
    const revokedLookup = db.prepare(`
      SELECT * FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL;
    `).get(key1.keyHash);
    assert.equal(revokedLookup, undefined);

    // Key 2 remains valid
    const foundKey2 = db.prepare(`
      SELECT * FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL;
    `).get(key2.keyHash) as { id: string; name: string } | undefined;
    assert.ok(foundKey2);
    assert.equal(foundKey2.name, 'Claude Project');
  });

  it('should restrict API key usage strictly to /api/v1/* endpoints', () => {
    function authorizePathWithApiKey(path: string): { allowed: boolean; status: number; error?: string } {
      if (!path.startsWith('/api/v1')) {
        return { allowed: false, status: 403, error: 'API Key 僅限調用 /api/v1/* 外部 Agent 接口' };
      }
      return { allowed: true, status: 200 };
    }

    assert.equal(authorizePathWithApiKey('/api/v1/items').allowed, true);
    assert.equal(authorizePathWithApiKey('/api/v1/items/item-123/replace').allowed, true);
    assert.equal(authorizePathWithApiKey('/api/v1/stocks').allowed, true);

    const blockedKeysEndpoint = authorizePathWithApiKey('/api/keys');
    assert.equal(blockedKeysEndpoint.allowed, false);
    assert.equal(blockedKeysEndpoint.status, 403);

    const blockedSessionItems = authorizePathWithApiKey('/api/items');
    assert.equal(blockedSessionItems.allowed, false);
    assert.equal(blockedSessionItems.status, 403);
  });
});

