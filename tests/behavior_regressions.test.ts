import test from 'node:test';
import assert from 'node:assert/strict';
import { businessDate, addBusinessDays } from '../src/shared/date.ts';
import { computeItemStatus } from '../src/shared/lifecycle.ts';
import { DEMO_ITEM_IDS, readGuestItems, writeGuestItems } from '../src/client/utils/guestStorage.ts';

test('business dates use Taiwan time and are timezone stable', () => {
  assert.equal(businessDate(new Date('2026-09-05T16:30:00.000Z')), '2026-09-06');
  assert.equal(addBusinessDays('2026-09-06', 7), '2026-09-13');
  assert.equal(addBusinessDays('2026-09-09', 1), '2026-09-10');
});

test('business dates switch only at Taiwan midnight', () => {
  assert.equal(businessDate(new Date('2026-09-08T15:59:59.000Z')), '2026-09-08');
  assert.equal(businessDate(new Date('2026-09-08T16:00:00.000Z')), '2026-09-09');
});

test('a due date remains due through the end of its Taiwan business day', () => {
  const item = {
    startDate: '2026-09-01', trackingMode: 'cycle' as const, cycleDays: 8,
    backupStock: 1,
  };

  const dueDay = computeItemStatus(item, new Date('2026-09-09T15:59:59.000Z'));
  assert.equal(dueDay.remainingDays, 0);
  assert.equal(dueDay.healthStatus, 'due_soon');

  const nextBusinessDay = computeItemStatus(item, new Date('2026-09-09T16:00:00.000Z'));
  assert.equal(nextBusinessDay.remainingDays, -1);
  assert.equal(nextBusinessDay.healthStatus, 'overdue');
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

test('reversible replace snapshot restores original startDate and backupStock', () => {
  const originalItem = {
    id: 'test-item-1',
    name: '濾網',
    startDate: '2026-08-01',
    trackingMode: 'cycle' as const,
    cycleDays: 60,
    backupStock: 2,
    minStockAlert: 1,
    snoozeUntil: null,
    isStored: false,
    ...computeItemStatus({
      startDate: '2026-08-01',
      trackingMode: 'cycle',
      cycleDays: 60,
      backupStock: 2,
    }, new Date('2026-10-05T00:00:00Z')),
  };

  // Simulate replace
  const snapshot = { ...originalItem };
  const todayStr = businessDate(new Date('2026-10-05T00:00:00Z'));
  const replacedItem = {
    ...originalItem,
    startDate: todayStr,
    backupStock: originalItem.backupStock - 1,
    ...computeItemStatus({
      ...originalItem,
      startDate: todayStr,
      backupStock: originalItem.backupStock - 1,
    }, new Date('2026-10-05T00:00:00Z')),
  };

  assert.equal(replacedItem.startDate, '2026-10-05');
  assert.equal(replacedItem.backupStock, 1);
  assert.equal(replacedItem.healthStatus, 'healthy');

  // Simulate undo rollback from snapshot
  const rolledBackItem = {
    ...snapshot,
    ...computeItemStatus({
      ...snapshot,
    }, new Date('2026-10-05T00:00:00Z')),
  };

  assert.equal(rolledBackItem.startDate, '2026-08-01');
  assert.equal(rolledBackItem.backupStock, 2);
  assert.equal(rolledBackItem.healthStatus, originalItem.healthStatus);
});

test('quantity tracking mode calculates remaining days and burn rate properly', () => {
  // 60 pills, 2/day = 30 days total lifespan
  // Started 2026-10-01, checking on 2026-10-11 (10 days elapsed, so 20 pills consumed, 40 remaining, 20 days left)
  const item = {
    startDate: '2026-10-01',
    trackingMode: 'quantity' as const,
    initialQuantity: 60,
    dailyUsage: 2,
    quantityUnit: '顆',
    backupStock: 1,
  };

  const status = computeItemStatus(item, new Date('2026-10-11T00:00:00Z'));
  assert.equal(status.totalDays, 30);
  assert.equal(status.elapsedDays, 10);
  assert.equal(status.remainingQuantity, 40);
  assert.equal(status.remainingDays, 20);
  assert.equal(status.healthStatus, 'healthy');

  // When explicit currentQuantity is provided (e.g. override to 10 pills)
  const overrideStatus = computeItemStatus({
    ...item,
    currentQuantity: 10,
  }, new Date('2026-10-11T00:00:00Z'));
  assert.equal(overrideStatus.remainingQuantity, 10);
  assert.equal(overrideStatus.remainingDays, 5); // 10 / 2 = 5 days
  assert.equal(overrideStatus.healthStatus, 'due_soon'); // <= 7 days is due_soon

  // When quantity is 0, becomes overdue
  const emptyStatus = computeItemStatus({
    ...item,
    currentQuantity: 0,
  }, new Date('2026-10-11T00:00:00Z'));
  assert.equal(emptyStatus.remainingQuantity, 0);
  assert.equal(emptyStatus.remainingDays, 0);
  assert.equal(emptyStatus.healthStatus, 'overdue');
});
