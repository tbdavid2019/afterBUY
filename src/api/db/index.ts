import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.ts';

export type AppDatabase = ReturnType<typeof drizzleD1<typeof schema>> | ReturnType<typeof drizzleSqlite<typeof schema>>;

let localSqliteInstance: Database.Database | null = null;

export function getDb(d1Instance?: D1Database): AppDatabase {
  // If running inside Cloudflare Edge with D1 binding
  if (d1Instance) {
    return drizzleD1(d1Instance, { schema });
  }

  // Fallback to local SQLite file for local dev / testing
  if (!localSqliteInstance) {
    localSqliteInstance = new Database(process.env.DATABASE_URL || 'local.db');
    localSqliteInstance.pragma('journal_mode = WAL');
    localSqliteInstance.pragma('foreign_keys = ON');
  }

  return drizzleSqlite(localSqliteInstance, { schema });
}

export * from './schema.ts';
