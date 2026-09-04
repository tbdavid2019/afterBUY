import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';

const dbPath = process.env.DATABASE_URL || 'local.db';
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

const migrationsDir = path.resolve('drizzle/migrations');
const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

for (const file of migrationFiles) {
  const migrationSql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  const statements = migrationSql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);

  for (const stmt of statements) {
    try {
      db.exec(stmt);
    } catch (err: any) {
      if (!err.message?.includes('already exists') && !err.message?.includes('duplicate column name')) {
        console.error(`Notice running statement in ${file}:`, err.message);
      }
    }
  }
}

console.log(`✅ 本地 SQLite 資料庫 (${dbPath}) 所有遷移檔執行完畢！`);
