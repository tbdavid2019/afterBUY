import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';

const dbPath = process.env.DATABASE_URL || 'local.db';
let db: DatabaseSync;

try {
  db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = OFF;'); // Prevent temporary constraint issues during backfill
} catch (e: any) {
  console.log(`Skipping local file migration (${dbPath}): ${e.message}`);
  process.exit(0);
}

// 1. Fetch all users
const users = db.prepare('SELECT id, email FROM users').all() as { id: string; email: string }[];
console.log(`Found ${users.length} users to check for stock provisioning.`);

for (const user of users) {
  // Check if user has an owned stock
  const existingMember = db.prepare("SELECT stock_id FROM stock_members WHERE user_id = ? AND role = 'owner'").get(user.id);

  let stockId: string;
  const now = new Date().toISOString();

  if (!existingMember) {
    stockId = crypto.randomUUID();
    const calendarToken = crypto.randomUUID().replace(/-/g, '');
    const stockName = '甜蜜的家';
    const icon = '🏠';

    db.prepare(`
      INSERT INTO stocks (id, name, icon, owner_id, calendar_token, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(stockId, stockName, icon, user.id, calendarToken, now, now);

    db.prepare(`
      INSERT INTO stock_members (id, stock_id, user_id, role, nickname, created_at)
      VALUES (?, ?, ?, 'owner', '擁有者', ?)
    `).run(crypto.randomUUID(), stockId, user.id, now);

    console.log(`Created default stock "${stockName}" (${stockId}) for user ${user.email}`);
  } else {
    stockId = (existingMember as any).stock_id;
  }

  // Backfill items that have null or empty stock_id
  const result = db.prepare(`
    UPDATE items
    SET stock_id = ?, created_by_user_id = ?
    WHERE user_id = ? AND (stock_id IS NULL OR stock_id = '')
  `).run(stockId, user.id, user.id);

  if (result.changes > 0) {
    console.log(`Backfilled ${result.changes} items to stock ${stockId} for user ${user.email}`);
  }
}

console.log('✅ Backfill script completed successfully.');
