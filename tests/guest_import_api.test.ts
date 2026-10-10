import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createRequire } from 'node:module';
import { mkdtemp, symlink, rm } from 'node:fs/promises';
import { readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createSessionToken } from '../src/api/utils/auth.ts';

// Compile the real Worker router with the project's existing Vite compiler.
// This exercises authorization and the actual D1 queries without copying them.
const requireFromVite = createRequire(import.meta.resolve('vite'));
const { build } = requireFromVite('esbuild');
const temporary = await mkdtemp(join(tmpdir(), 'afterbuy-guest-api-'));
await symlink(resolve('node_modules'), join(temporary, 'node_modules'), 'dir');
await build({ entryPoints: ['src/api/routes/items.ts'], outfile: join(temporary, 'items.mjs'), bundle: true, platform: 'node', format: 'esm', packages: 'external', logLevel: 'silent' });
const { itemsRouter } = await import(pathToFileURL(join(temporary, 'items.mjs')).href);
after(() => rm(temporary, { recursive: true, force: true }));

function setup() {
  const db = new DatabaseSync(':memory:');
  for (const file of readdirSync('drizzle/migrations').filter((file) => file.endsWith('.sql')).sort()) db.exec(readFileSync(join('drizzle/migrations', file), 'utf8'));
  for (const id of ['account-a', 'account-b']) db.prepare('INSERT INTO users (id, email, calendar_token, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(id, `${id}@example.com`, `cal-${id}`, 'now', 'now');
  db.prepare('INSERT INTO stocks (id, name, owner_id, calendar_token, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run('shared-stock', '家用', 'account-a', 'stock-cal', 'now', 'now');
  for (const id of ['account-a', 'account-b']) db.prepare('INSERT INTO stock_members (id, stock_id, user_id, role, created_at) VALUES (?, ?, ?, ?, ?)').run(`member-${id}`, 'shared-stock', id, 'owner', 'now');
  const d1 = {
    prepare(sql: string) {
      let params: unknown[] = [];
      const prepared = {
        bind(...values: unknown[]) { params = values; return prepared; },
        async raw() { return db.prepare(sql).all(...params as any[]).map((row) => Object.values(row)); },
        async all() { return { results: db.prepare(sql).all(...params as any[]) }; },
        async run() { db.prepare(sql).run(...params as any[]); return { success: true }; },
      };
      return prepared;
    },
  };
  const source = { guestSourceId: 'guest-12345678-1234-1234-1234-123456789abc', stockId: 'shared-stock', name: '試用魚油', category: 'medicine', trackingMode: 'quantity', startDate: '2026-10-10', initialQuantity: 150, currentQuantity: 37, dailyUsage: 2, quantityUnit: '顆', backupStock: 3 };
  const request = async (body = source, account = 'account-a') => {
    const token = await createSessionToken({ id: account, email: `${account}@example.com`, calendarToken: `cal-${account}`, isVip: false }, 'test-secret');
    return itemsRouter.request('http://localhost/', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: `afterbuy_session=${token}` }, body: JSON.stringify(body) }, { DB: d1, SESSION_SECRET: 'test-secret' });
  };
  return { db, source, request };
}

test('guest import retry and concurrent tabs create one item and preserve quantity', async () => {
  const { db, request } = setup();
  try {
    const responses = await Promise.all([request(), request()]);
    assert.deepEqual(responses.map((response) => response.status).sort(), [200, 201]);
    const bodies = await Promise.all(responses.map((response) => response.json()));
    assert.equal(bodies[0].item.id, bodies[1].item.id);
    const retry = await request(); // Fresh HTTP request after a lost response/reload.
    assert.equal(retry.status, 200);
    assert.equal(db.prepare('SELECT count(*) AS count FROM items').get()?.count, 1);
    assert.equal((await retry.json()).item.currentQuantity, 37);
  } finally { db.close(); }
});

test('guest import identity is isolated per account and retries never overwrite cloud edits', async () => {
  const { db, source, request } = setup();
  try {
    const first = await (await request()).json();
    db.prepare('UPDATE items SET name = ?, current_quantity = ? WHERE id = ?').run('雲端修改', 10, first.item.id);
    const retry = await (await request({ ...source, currentQuantity: 99 })).json();
    assert.equal(retry.item.name, '雲端修改');
    assert.equal(retry.item.currentQuantity, 10);
    const anotherAccount = await (await request(source, 'account-b')).json();
    assert.notEqual(anotherAccount.item.id, first.item.id);
    assert.equal(db.prepare('SELECT count(*) AS count FROM items').get()?.count, 2);
  } finally { db.close(); }
});

test('import retry cannot resurrect a deleted item or bypass stock permissions', async () => {
  const { db, request } = setup();
  try {
    const first = await (await request()).json();
    db.prepare('UPDATE items SET deleted_at = ? WHERE id = ?').run('2026-10-10T00:00:00Z', first.item.id);
    assert.equal((await request()).status, 409);
    assert.equal(db.prepare('SELECT count(*) AS count FROM items').get()?.count, 1);
    db.prepare('UPDATE stock_members SET role = ? WHERE user_id = ?').run('viewer', 'account-a');
    assert.equal((await request()).status, 403);
  } finally { db.close(); }
});

test('import rejects invalid source IDs and ordinary adds remain independent', async () => {
  const { db, source, request } = setup();
  try {
    assert.equal((await request({ ...source, guestSourceId: 'demo-1' })).status, 400);
    const ordinary = { ...source };
    delete (ordinary as any).guestSourceId;
    const a = await (await request(ordinary)).json();
    const b = await (await request(ordinary)).json();
    assert.notEqual(a.item.id, b.item.id);
    assert.equal(db.prepare('SELECT count(*) AS count FROM items').get()?.count, 2);
  } finally { db.close(); }
});
