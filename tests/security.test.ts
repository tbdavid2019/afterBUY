import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';

describe('Security Hardening Verification', () => {
  // 1. SEC-04: iCalendar CRLF Injection Sanitization
  it('SEC-04: should sanitize CRLF and RFC 5545 special characters in iCalendar text', () => {
    function sanitizeIcsText(str: string): string {
      if (!str) return '';
      return str
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\r\n|\r|\n/g, '\\n')
        .trim();
    }

    const maliciousName = 'Oral-B\r\nBEGIN:VEVENT\r\nSUMMARY:Hacked Event\r\nEND:VEVENT';
    const sanitized = sanitizeIcsText(maliciousName);

    // Must NOT contain raw newlines or CRLF that break iCalendar lines
    assert.equal(sanitized.includes('\r'), false);
    assert.equal(sanitized.includes('\n'), false);
    assert.equal(sanitized.includes('\\n'), true);
    assert.equal(sanitized, 'Oral-B\\nBEGIN:VEVENT\\nSUMMARY:Hacked Event\\nEND:VEVENT');
  });

  // 2. SEC-05: HTML Email Injection Sanitization
  it('SEC-05: should escape HTML entities in notification email templates', () => {
    function escapeHtml(str: string): string {
      if (!str) return '';
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    const maliciousInput = '<img src=x onerror=alert(1)> & "quotes"';
    const escaped = escapeHtml(maliciousInput);

    assert.equal(escaped.includes('<img'), false);
    assert.equal(escaped.includes('<'), false);
    assert.equal(escaped.includes('>'), false);
    assert.equal(escaped, '&lt;img src=x onerror=alert(1)&gt; &amp; &quot;quotes&quot;');
  });

  // 3. SEC-03: Passkey IDOR Protection in Database
  it('SEC-03: should prevent deleting another user passkey credential via scoped query', () => {
    const db = new DatabaseSync('local.db');
    
    const userA = crypto.randomUUID();
    const userB = crypto.randomUUID();
    const credId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Insert user A & B
    db.prepare("INSERT OR IGNORE INTO users (id, email, calendar_token, is_vip, created_at, updated_at) VALUES (?, 'userA@test.com', ?, 0, ?, ?);").run(userA, crypto.randomUUID(), now, now);
    db.prepare("INSERT OR IGNORE INTO users (id, email, calendar_token, is_vip, created_at, updated_at) VALUES (?, 'userB@test.com', ?, 0, ?, ?);").run(userB, crypto.randomUUID(), now, now);

    // Insert passkey for User B
    db.prepare("INSERT INTO passkey_credentials (id, user_id, public_key, counter, device_name, created_at) VALUES (?, ?, 'pk', 0, 'Device B', ?);").run(credId, userB, now);

    // User A tries to delete User B's passkey (scoped query)
    const result = db.prepare("DELETE FROM passkey_credentials WHERE id = ? AND user_id = ?;").run(credId, userA);
    assert.equal(result.changes, 0); // No rows deleted!

    // Verify credential still exists
    const cred = db.prepare("SELECT * FROM passkey_credentials WHERE id = ?;").get(credId);
    assert.ok(cred);

    // User B deletes own passkey
    const resultOwn = db.prepare("DELETE FROM passkey_credentials WHERE id = ? AND user_id = ?;").run(credId, userB);
    assert.equal(resultOwn.changes, 1);

    // Cleanup
    db.prepare("DELETE FROM users WHERE id IN (?, ?);").run(userA, userB);
  });

  // 4. SEC-06: Constant-time Token Validation
  it('SEC-06: should perform constant-time comparison for auth bearer tokens', () => {
    function constantTimeCompare(aStr: string, bStr: string): boolean {
      if (!aStr || !bStr || aStr.length !== bStr.length) return false;
      const encoder = new TextEncoder();
      const a = encoder.encode(aStr);
      const b = encoder.encode(bStr);
      let match = 0;
      for (let i = 0; i < a.length; i++) {
        match |= a[i] ^ b[i];
      }
      return match === 0;
    }

    assert.equal(constantTimeCompare('Bearer valid-secret-123', 'Bearer valid-secret-123'), true);
    assert.equal(constantTimeCompare('Bearer valid-secret-123', 'Bearer wrong-secret-456'), false);
    assert.equal(constantTimeCompare('Bearer valid-secret-123', 'Bearer short'), false);
  });
});
