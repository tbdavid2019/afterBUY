import test from 'node:test';
import assert from 'node:assert/strict';
import { businessDate, addBusinessDays } from '../src/shared/date.ts';
import { computeItemStatus } from '../src/shared/lifecycle.ts';
import { DEMO_ITEM_IDS, readGuestItems, writeGuestItems } from '../src/client/utils/guestStorage.ts';

test('business dates use Taiwan time and are timezone stable', () => {
  assert.equal(businessDate(new Date('2026-09-05T16:30:00.000Z')), '2026-09-06');
  assert.equal(addBusinessDays('2026-09-06', 7), '2026-09-13');
});

test('stored fixed-date items still expire while stored cycle items stay stored', () => {
  const fixed = computeItemStatus({
    startDate: '2024-01-01', trackingMode: 'expiry', expiryDate: '2025-01-01',
    backupStock: 1, isStored: true,
  }, new Date('2026-01-01T00:00:00Z'));
  assert.equal(fixed.healthStatus, 'overdue');

  const cycle = computeItemStatus({
    startDate: '2024-01-01', trackingMode: 'cycle', cycleDays: 30,
    backupStock: 1, isStored: true,
  }, new Date('2026-01-01T00:00:00Z'));
  assert.equal(cycle.healthStatus, 'stored');
});

test('guest persistence filters demo ids and reports storage quota failures', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
  (globalThis as any).window = { localStorage: storage };
  const item = { id: 'guest-own', name: 'own' } as any;
  writeGuestItems([{ id: [...DEMO_ITEM_IDS][0], name: 'demo' } as any, item]);
  assert.deepEqual(readGuestItems(), [item]);

  storage.setItem = () => { throw Object.assign(new Error('full'), { name: 'QuotaExceededError' }); };
  assert.throws(() => writeGuestItems([item]), /本機儲存空間不足/);
});
