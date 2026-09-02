import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';

const dbPath = process.env.DATABASE_URL || 'local.db';
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

const migrationSql = fs.readFileSync(path.resolve('drizzle/migrations/0000_early_edwin_jarvis.sql'), 'utf8');
const statements = migrationSql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);

for (const stmt of statements) {
  try {
    db.exec(stmt);
  } catch (err: any) {
    if (!err.message?.includes('already exists')) {
      console.error('Notice running statement:', stmt, err.message);
    }
  }
}

console.log(`✅ 本地 SQLite 資料庫 (${dbPath}) 表格已建立完畢！`);
