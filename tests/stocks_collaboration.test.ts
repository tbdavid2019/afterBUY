import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';

describe('Stock Collaboration & RBAC Integration Tests', () => {
  // Setup in-memory SQLite database
  const db = new DatabaseSync(':memory:');

  // Initialize schema
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      calendar_token TEXT UNIQUE NOT NULL,
      is_vip INTEGER DEFAULT 0 NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE stocks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT DEFAULT '🏠' NOT NULL,
      owner_user_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE stock_members (
      id TEXT PRIMARY KEY,
      stock_id TEXT NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL, -- 'owner' | 'admin' | 'member' | 'viewer'
      joined_at TEXT NOT NULL,
      UNIQUE(stock_id, user_id)
    );

    CREATE TABLE stock_invites (
      id TEXT PRIMARY KEY,
      stock_id TEXT NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
      code TEXT UNIQUE NOT NULL,
      role TEXT DEFAULT 'member' NOT NULL,
      created_by_user_id TEXT NOT NULL REFERENCES users(id),
      max_uses INTEGER DEFAULT 10 NOT NULL,
      used_count INTEGER DEFAULT 0 NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      stock_id TEXT NOT NULL REFERENCES stocks(id),
      created_by_user_id TEXT REFERENCES users(id),
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      start_date TEXT NOT NULL,
      tracking_mode TEXT NOT NULL,
      cycle_days INTEGER,
      backup_stock INTEGER DEFAULT 0 NOT NULL,
      is_archived INTEGER DEFAULT 0 NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  const now = new Date().toISOString();
  const userA = crypto.randomUUID(); // Owner
  const userB = crypto.randomUUID(); // Invited member -> New Owner
  const userC = crypto.randomUUID(); // Viewer

  it('should initialize users and default stock space', () => {
    db.prepare(`INSERT INTO users VALUES (?, 'owner@test.com', 'tok_a', 0, ?, ?)`).run(userA, now, now);
    db.prepare(`INSERT INTO users VALUES (?, 'member@test.com', 'tok_b', 0, ?, ?)`).run(userB, now, now);
    db.prepare(`INSERT INTO users VALUES (?, 'viewer@test.com', 'tok_c', 0, ?, ?)`).run(userC, now, now);

    const stockId = crypto.randomUUID();
    db.prepare(`INSERT INTO stocks VALUES (?, '甜蜜的家', '家庭共享備品庫', '🏠', ?, ?, ?)`).run(stockId, userA, now, now);
    db.prepare(`INSERT INTO stock_members VALUES (?, ?, ?, 'owner', ?)`).run(crypto.randomUUID(), stockId, userA, now);

    const stock = db.prepare(`SELECT * FROM stocks WHERE id = ?`).get(stockId) as any;
    assert.equal(stock.name, '甜蜜的家');
    assert.equal(stock.owner_user_id, userA);

    const member = db.prepare(`SELECT * FROM stock_members WHERE stock_id = ? AND user_id = ?`).get(stockId, userA) as any;
    assert.equal(member.role, 'owner');
  });

  it('should handle invite generation, verification, and joining', () => {
    const stock = db.prepare(`SELECT id FROM stocks LIMIT 1`).get() as any;
    const inviteId = crypto.randomUUID();
    const inviteCode = 'TESTCODE';
    const expiresAt = new Date(Date.now() + 86400000).toISOString();

    // Create invite
    db.prepare(`
      INSERT INTO stock_invites (id, stock_id, code, role, created_by_user_id, max_uses, used_count, expires_at, created_at)
      VALUES (?, ?, ?, 'member', ?, 5, 0, ?, ?)
    `).run(inviteId, stock.id, inviteCode, userA, expiresAt, now);

    // Join with valid code
    const invite = db.prepare(`SELECT * FROM stock_invites WHERE code = ?`).get(inviteCode) as any;
    assert.ok(invite);
    assert.ok(new Date(invite.expires_at).getTime() > Date.now());
    assert.ok(invite.used_count < invite.max_uses);

    // User B joins
    db.prepare(`INSERT INTO stock_members VALUES (?, ?, ?, ?, ?)`).run(crypto.randomUUID(), stock.id, userB, invite.role, now);
    db.prepare(`UPDATE stock_invites SET used_count = used_count + 1 WHERE id = ?`).run(invite.id);

    // User C joins as viewer
    db.prepare(`INSERT INTO stock_members VALUES (?, ?, ?, 'viewer', ?)`).run(crypto.randomUUID(), stock.id, userC, now);

    const members = db.prepare(`SELECT * FROM stock_members WHERE stock_id = ?`).all(stock.id) as any[];
    assert.equal(members.length, 3);
  });

  it('should enforce role-based access control (RBAC)', () => {
    const stock = db.prepare(`SELECT id FROM stocks LIMIT 1`).get() as any;

    function canModify(role: string): boolean {
      return ['owner', 'admin', 'member'].includes(role);
    }
    function canManageMembers(role: string): boolean {
      return ['owner', 'admin'].includes(role);
    }

    const memberA = db.prepare(`SELECT role FROM stock_members WHERE stock_id = ? AND user_id = ?`).get(stock.id, userA) as any;
    const memberB = db.prepare(`SELECT role FROM stock_members WHERE stock_id = ? AND user_id = ?`).get(stock.id, userB) as any;
    const memberC = db.prepare(`SELECT role FROM stock_members WHERE stock_id = ? AND user_id = ?`).get(stock.id, userC) as any;

    assert.equal(canModify(memberA.role), true, 'Owner can modify items');
    assert.equal(canModify(memberB.role), true, 'Member can modify items');
    assert.equal(canModify(memberC.role), false, 'Viewer cannot modify items');

    assert.equal(canManageMembers(memberA.role), true, 'Owner can manage members');
    assert.equal(canManageMembers(memberB.role), false, 'Member cannot manage members');
    assert.equal(canManageMembers(memberC.role), false, 'Viewer cannot manage members');
  });

  it('should execute atomic ownership transfer cleanly', () => {
    const stock = db.prepare(`SELECT id, owner_user_id FROM stocks LIMIT 1`).get() as any;
    assert.equal(stock.owner_user_id, userA);

    // Attempt transfer: User A transfers to User B
    const targetUserId = userB;
    const callerUserId = userA;

    // Check caller is owner
    assert.equal(stock.owner_user_id, callerUserId, 'Caller must be current owner');

    // Check target is a member
    const targetMember = db.prepare(`SELECT role FROM stock_members WHERE stock_id = ? AND user_id = ?`).get(stock.id, targetUserId) as any;
    assert.ok(targetMember, 'Target must be a member of the stock');

    // Atomic transaction execution
    db.exec('BEGIN TRANSACTION');
    db.prepare(`UPDATE stocks SET owner_user_id = ?, updated_at = ? WHERE id = ?`).run(targetUserId, now, stock.id);
    db.prepare(`UPDATE stock_members SET role = 'owner' WHERE stock_id = ? AND user_id = ?`).run(stock.id, targetUserId);
    db.prepare(`UPDATE stock_members SET role = 'admin' WHERE stock_id = ? AND user_id = ?`).run(stock.id, callerUserId);
    db.exec('COMMIT');

    // Verify state after transfer
    const updatedStock = db.prepare(`SELECT owner_user_id FROM stocks WHERE id = ?`).get(stock.id) as any;
    assert.equal(updatedStock.owner_user_id, userB, 'New owner should be user B');

    const roleA = db.prepare(`SELECT role FROM stock_members WHERE stock_id = ? AND user_id = ?`).get(stock.id, userA) as any;
    const roleB = db.prepare(`SELECT role FROM stock_members WHERE stock_id = ? AND user_id = ?`).get(stock.id, userB) as any;
    assert.equal(roleB.role, 'owner', 'User B should now have role owner');
    assert.equal(roleA.role, 'admin', 'User A should safely be demoted to admin');
  });

  it('should support All-in-One item aggregation across multiple stocks', () => {
    // Create second stock for user B
    const stock2Id = crypto.randomUUID();
    db.prepare(`INSERT INTO stocks VALUES (?, '工作室裝備', '工具與電子元件', '⚡', ?, ?, ?)`).run(stock2Id, userB, now, now);
    db.prepare(`INSERT INTO stock_members VALUES (?, ?, ?, 'owner', ?)`).run(crypto.randomUUID(), stock2Id, userB, now);

    const stock1 = db.prepare(`SELECT id FROM stocks WHERE name = '甜蜜的家'`).get() as any;

    // Add item to stock 1
    const item1Id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO items (id, user_id, stock_id, created_by_user_id, name, category, start_date, tracking_mode, cycle_days, backup_stock, is_archived, created_at, updated_at)
      VALUES (?, ?, ?, ?, '音波牙刷刷頭', 'bathroom', '2026-01-01', 'cycle', 90, 2, 0, ?, ?)
    `).run(item1Id, userA, stock1.id, userA, now, now);

    // Add item to stock 2
    const item2Id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO items (id, user_id, stock_id, created_by_user_id, name, category, start_date, tracking_mode, cycle_days, backup_stock, is_archived, created_at, updated_at)
      VALUES (?, ?, ?, ?, '3D 列印噴頭 0.4mm', 'electronics', '2026-02-01', 'cycle', 180, 5, 0, ?, ?)
    `).run(item2Id, userB, stock2Id, userB, now, now);

    // Query All-in-One items for User B (User B is in both stock 1 and stock 2)
    const accessibleStocks = db.prepare(`SELECT stock_id FROM stock_members WHERE user_id = ?`).all(userB) as any[];
    const stockIds = accessibleStocks.map(s => s.stock_id);
    assert.equal(stockIds.length, 2);

    const placeholders = stockIds.map(() => '?').join(',');
    const allItems = db.prepare(`
      SELECT i.*, s.name as stock_name, s.icon as stock_icon
      FROM items i
      JOIN stocks s ON i.stock_id = s.id
      WHERE i.stock_id IN (${placeholders}) AND i.is_archived = 0
    `).all(...stockIds) as any[];

    assert.equal(allItems.length, 2, 'User B should see items from both accessible stocks');
    const names = allItems.map(i => `${i.stock_icon} [${i.stock_name}] ${i.name}`);
    assert.ok(names.some(n => n.includes('[甜蜜的家] 音波牙刷刷頭')));
    assert.ok(names.some(n => n.includes('[工作室裝備] 3D 列印噴頭 0.4mm')));
  });
});
