import test from 'node:test';
import assert from 'node:assert/strict';
import { businessDate, addBusinessDays } from '../src/shared/date.ts';
import { computeItemStatus, formatRemainingDaysText } from '../src/shared/lifecycle.ts';
import { DEMO_ITEM_IDS, readGuestItems, writeGuestItems, mergeGuestItems, setDemoCleared, restoreGuestDemoItems, deleteGuestDemoItem, readModifiedDemoItems } from '../src/client/utils/guestStorage.ts';

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
  assert.equal(overrideStatus.nextDueDate, '2026-10-16'); // 2026-10-11 + 5 days
  assert.equal(overrideStatus.healthStatus, 'due_soon'); // <= 7 days is due_soon

  // When quantity is 0, becomes overdue and is labeled depleted
  const emptyStatus = computeItemStatus({
    ...item,
    currentQuantity: 0,
  }, new Date('2026-10-11T00:00:00Z'));
  assert.equal(emptyStatus.remainingQuantity, 0);
  assert.equal(emptyStatus.remainingDays, 0);
  assert.equal(emptyStatus.healthStatus, 'overdue');

  const zeroText = formatRemainingDaysText(emptyStatus.remainingDays, emptyStatus.healthStatus, {
    remainingQuantity: emptyStatus.remainingQuantity,
    quantityUnit: item.quantityUnit,
  });
  assert.equal(zeroText.text, '已用盡（需開新備品）');

  // Fractional burn rate tracking (e.g. 10 packs, 0.2/day)
  const fractionalItem = {
    startDate: '2026-10-01',
    trackingMode: 'quantity' as const,
    initialQuantity: 10,
    dailyUsage: 0.2,
    quantityUnit: '包',
    backupStock: 1,
  };
  const fractionalStatus = computeItemStatus(fractionalItem, new Date('2026-10-02T00:00:00Z'));
  assert.equal(fractionalStatus.elapsedDays, 1);
  assert.equal(fractionalStatus.remainingQuantity, 9.8);
  assert.equal(fractionalStatus.remainingDays, 49);
  assert.equal(fractionalStatus.nextDueDate, '2026-11-20');
});

test('calendar timeline tracks both purchase milestone dates and replacement due dates', () => {
  // Simulate active consumable item purchased today with 90-day cycle
  const activeItem = {
    id: 'toothbrush-1',
    name: '牙刷更換',
    startDate: '2026-10-06',
    cycleDays: 90,
    nextDueDate: '2027-01-04',
    isStored: false,
    healthStatus: 'healthy' as const,
    price: 150,
  };

  // Simulate backup item purchased into storage today
  const storedItem = {
    id: 'filter-reserve-1',
    name: 'Brita 濾芯備品',
    startDate: '2026-10-06',
    cycleDays: 30,
    nextDueDate: '2026-11-05',
    isStored: true,
    healthStatus: 'stored' as const,
    price: 280,
  };

  // Event generator logic mirroring TimelineView
  const generateEvents = (items: typeof activeItem[]) => {
    const list: Array<{ id: string; type: 'start' | 'due'; date: string; itemId: string }> = [];
    for (const item of items) {
      if (item.startDate) {
        list.push({ id: `${item.id}-start`, type: 'start', date: item.startDate, itemId: item.id });
      }
      if (!item.isStored && item.healthStatus !== 'stored') {
        if (item.nextDueDate) {
          list.push({ id: `${item.id}-due`, type: 'due', date: item.nextDueDate, itemId: item.id });
        }
      }
    }
    return list;
  };

  const events = generateEvents([activeItem, storedItem]);

  // Both items should have purchase milestone events on 2026-10-06
  const oct6Events = events.filter((e) => e.date === '2026-10-06');
  assert.equal(oct6Events.length, 2, 'October 6 should reflect both item purchase events');
  assert.ok(oct6Events.some((e) => e.itemId === 'toothbrush-1' && e.type === 'start'));
  assert.ok(oct6Events.some((e) => e.itemId === 'filter-reserve-1' && e.type === 'start'));

  // Only the active item should have a due replacement event in 2027
  const dueEvents = events.filter((e) => e.type === 'due');
  assert.equal(dueEvents.length, 1);
  assert.equal(dueEvents[0].date, '2027-01-04');
  assert.equal(dueEvents[0].itemId, 'toothbrush-1');
});

test('guest persistence tracks deleted demo items so deleted restock reminder does not reappear', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
  (globalThis as any).window = { localStorage: storage };

  const demoItems: any[] = [
    { id: 'demo-1', name: 'Toothbrush', trackingMode: 'cycle', cycleDays: 90, startDate: '2026-09-01', backupStock: 2, minStockAlert: 1, needsRestock: false },
    { id: 'demo-2', name: 'Brita filter', trackingMode: 'cycle', cycleDays: 30, startDate: '2026-09-01', backupStock: 0, minStockAlert: 1, needsRestock: true },
    { id: 'demo-3', name: 'Sunscreen', trackingMode: 'pao', paoMonths: 6, startDate: '2026-09-01', backupStock: 1, minStockAlert: 1, needsRestock: false },
    { id: 'demo-4', name: 'Dehumidifier', trackingMode: 'warranty', warrantyDate: '2027-01-01', startDate: '2026-09-01', backupStock: 0, minStockAlert: 0, needsRestock: false },
    { id: 'demo-5', name: 'Fish oil', trackingMode: 'quantity', startDate: '2026-09-01', backupStock: 1, minStockAlert: 1, needsRestock: false },
  ];

  // Initially, all demo items are shown
  let currentItems = mergeGuestItems(demoItems);
  assert.equal(currentItems.length, 5);
  assert.ok(currentItems.some((i) => i.id === 'demo-2' && i.needsRestock));

  // User deletes demo-2 (the restock item)
  currentItems = currentItems.filter((i) => i.id !== 'demo-2');
  writeGuestItems(currentItems);

  // When page reloads or tabs switch, mergeGuestItems is re-called with demo items
  const reloadedItems = mergeGuestItems(demoItems);
  assert.equal(reloadedItems.length, 4);
  assert.ok(!reloadedItems.some((i) => i.id === 'demo-2'), 'Deleted demo-2 should not reappear');

  // Clearing all demo items
  setDemoCleared(true);
  const clearedItems = mergeGuestItems(demoItems);
  assert.equal(clearedItems.length, 0, 'No demo items when demos cleared');

  // Restoring demo items
  restoreGuestDemoItems();
  const restoredItems = mergeGuestItems(demoItems);
  assert.equal(restoredItems.length, 5, 'All original demo items restored');
});

test('guest import leftover persistence preserves demo items and modified demo state', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
  (globalThis as any).window = { localStorage: storage };

  const demoItems: any[] = [
    { id: 'demo-1', name: 'demo-1', trackingMode: 'cycle', cycleDays: 90, startDate: '2026-09-01', backupStock: 2, minStockAlert: 1 },
    { id: 'demo-2', name: 'demo-2', trackingMode: 'cycle', cycleDays: 30, startDate: '2026-09-01', backupStock: 0, minStockAlert: 1 },
  ];

  // User has demos + one custom guest item
  writeGuestItems([...demoItems, { id: 'guest-custom-1', name: 'My Custom Soap' } as any]);
  assert.equal(readGuestItems().length, 1);

  // When importing guest items, only user items are saved back with preserveDemos: true
  writeGuestItems(readGuestItems().filter((i) => i.id !== 'guest-custom-1'), { preserveDemos: true });

  // Demos should remain intact after import
  const afterImport = mergeGuestItems(demoItems);
  assert.equal(afterImport.length, 2, 'Demos must not be removed by importing custom items');
  assert.ok(afterImport.some((i) => i.id === 'demo-1'));
  assert.ok(afterImport.some((i) => i.id === 'demo-2'));
});

test('mergeGuestItems recomputes derived date statuses with current time', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
  (globalThis as any).window = { localStorage: storage };

  // An item created long ago whose saved status was "healthy"
  const item: any = {
    id: 'demo-1',
    name: 'Toothbrush',
    startDate: '2025-01-01',
    cycleDays: 30,
    trackingMode: 'cycle',
    backupStock: 1,
    minStockAlert: 1,
    healthStatus: 'healthy', // stale snapshot from past
    remainingDays: 20,       // stale snapshot from past
  };

  const merged = mergeGuestItems([item]);
  assert.equal(merged[0].healthStatus, 'overdue', 'Status must be recomputed to overdue on later date');
  assert.ok(merged[0].remainingDays < 0, 'Remaining days must be negative');
});

test('writeGuestItems propagates quota errors when modified demos exceed quota', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (key === 'afterbuy_guest_modified_demos_v1') {
        throw Object.assign(new Error('full'), { name: 'QuotaExceededError' });
      }
      values.set(key, value);
    },
    removeItem: (key: string) => values.delete(key),
  };
  (globalThis as any).window = { localStorage: storage };

  assert.throws(
    () => writeGuestItems([{ id: 'demo-1', name: 'edited', startDate: '2026-09-01' } as any]),
    /本機儲存空間不足/
  );
});

test('multi-tab stale saves do not resurrect deleted demo items', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
  (globalThis as any).window = { localStorage: storage };

  const demos = ['demo-1', 'demo-2', 'demo-3', 'demo-4', 'demo-5'].map((id) => ({
    id,
    startDate: '2026-10-01',
    trackingMode: 'cycle' as const,
    cycleDays: 30,
    backupStock: 0,
    minStockAlert: 1,
  }));

  const staleTab = mergeGuestItems(demos);
  // Tab 1 deletes demo-2
  deleteGuestDemoItem('demo-2');
  writeGuestItems(staleTab.filter((i) => i.id !== 'demo-2'));
  assert.ok(!mergeGuestItems(demos).some((i) => i.id === 'demo-2'));

  // Tab 2 (opened before deletion) updates demo-1 without knowing demo-2 was deleted
  writeGuestItems(staleTab.map((i) => (i.id === 'demo-1' ? { ...i, backupStock: 2 } : i)));
  // demo-2 must remain deleted!
  const afterOtherTabUpdate = mergeGuestItems(demos);
  assert.ok(!afterOtherTabUpdate.some((i) => i.id === 'demo-2'), 'demo-2 must not be resurrected by stale tab save');
});

test('readGuestItems filters legacy demo items and migrates them safely', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
  (globalThis as any).window = { localStorage: storage };

  // Simulate returning guest who previously had demo-5 saved directly in GUEST_ITEMS_KEY
  values.set('afterbuy_guest_items_v1', JSON.stringify([
    { id: 'custom-item-1', name: 'My Own Shampoo', backupStock: 3 },
    { id: 'demo-5', name: 'Legacy Fish Oil', backupStock: 0, minStockAlert: 1 },
  ]));

  // readGuestItems should only return non-demo items
  const ownItems = readGuestItems();
  assert.equal(ownItems.length, 1);
  assert.equal(ownItems[0].id, 'custom-item-1');

  // GUEST_ITEMS_KEY should be cleaned up
  const cleanedGUEST_ITEMS = JSON.parse(values.get('afterbuy_guest_items_v1') || '[]');
  assert.equal(cleanedGUEST_ITEMS.length, 1);
  assert.equal(cleanedGUEST_ITEMS[0].id, 'custom-item-1');

  // Legacy demo-5 should be migrated into modified demos
  const modified = readModifiedDemoItems();
  assert.equal(modified.length, 1);
  assert.equal(modified[0].id, 'demo-5');
  assert.equal(modified[0].name, 'Legacy Fish Oil');

  // If user clears demos, legacy demo-5 must not reappear
  setDemoCleared(true);
  const demos = [{ id: 'demo-5', name: 'Default Fish Oil', backupStock: 1 }];
  const afterCleared = mergeGuestItems(demos as any);
  assert.equal(afterCleared.length, 1);
  assert.equal(afterCleared[0].id, 'custom-item-1', 'Only user items returned when demos cleared');
  assert.ok(!afterCleared.some((i) => i.id === 'demo-5'), 'Legacy demo-5 must not appear when demos cleared');
});

test('legacy demo data is preserved in GUEST_ITEMS_KEY if writing modified demos throws quota error', () => {
  const values = new Map<string, string>();
  const legacyContent = JSON.stringify([{ id: 'demo-5', name: 'Edited fish oil', backupStock: 7 }]);
  values.set('afterbuy_guest_items_v1', legacyContent);

  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (key === 'afterbuy_guest_modified_demos_v1') {
        throw Object.assign(new Error('full'), { name: 'QuotaExceededError' });
      }
      values.set(key, value);
    },
    removeItem: (key: string) => values.delete(key),
  };
  (globalThis as any).window = { localStorage: storage };

  // Call readGuestItems; migration write will fail due to quota
  const own = readGuestItems();
  assert.equal(own.length, 0, 'Demo item is not returned as user item');

  // GUEST_ITEMS_KEY must NOT have been overwritten/truncated, keeping the user edit safe
  assert.equal(values.get('afterbuy_guest_items_v1'), legacyContent, 'Legacy data must not be wiped when migration write fails');
});

test('mergeGuestItems and subsequent writeGuestItems preserve failed-migration legacy demo edits', () => {
  const legacy = { id: 'demo-5', name: 'Edited fish oil', backupStock: 7, notes: 'x'.repeat(1000) };
  const values = new Map<string, string>([['afterbuy_guest_items_v1', JSON.stringify([legacy])]]);
  const limit = 1600;

  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, val: string) => {
      let size = val.length;
      for (const [k, v] of values) {
        if (k !== key) size += v.length;
      }
      if (size > limit) {
        throw Object.assign(new Error('full'), { name: 'QuotaExceededError' });
      }
      values.set(key, val);
    },
  };
  (globalThis as any).window = { localStorage: storage };

  const demos = [{ id: 'demo-5', name: 'Default fish oil', backupStock: 1 }];
  const merged = mergeGuestItems(demos as any);

  // Merged items must retain the edited data, not revert to default
  assert.equal(merged[0].name, 'Edited fish oil');
  assert.equal(merged[0].backupStock, 7);

  // Saving merged items must safely preserve the edits (migrated into modified key)
  writeGuestItems(merged);
  assert.ok([...values.values()].some((x) => x.includes('Edited fish oil')), 'Saved edits must remain persisted');
});

test('writeGuestItems restores original stored data when quota retry fails', () => {
  const original = [{ id: 'demo-5', name: 'previous edit', notes: 'x'.repeat(1000) }];
  const values = new Map<string, string>([['afterbuy_guest_items_v1', JSON.stringify(original)]]);

  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, s: string) => {
      let n = s.length;
      for (const [k, val] of values) {
        if (key !== k) n += val.length;
      }
      if (n > 1600) {
        throw Object.assign(new Error('full'), { name: 'QuotaExceededError' });
      }
      values.set(key, s);
    },
  };
  (globalThis as any).window = { localStorage: storage };

  assert.throws(
    () => writeGuestItems([{ ...(original[0] as any), notes: 'x'.repeat(2000) }]),
    /本機儲存空間不足/
  );

  // Original edit must remain intact, not erased to []
  const restored = values.get('afterbuy_guest_items_v1');
  assert.ok(restored && restored.includes('previous edit'), 'Original edit must be preserved on retry failure');
});

test('deleteGuestDemoItem preserves modified demo edits if saving deleted IDs fails', () => {
  const v = new Map([['afterbuy_guest_modified_demos_v1', JSON.stringify([{ id: 'demo-2', name: 'My edited filter', backupStock: 9 }])]]);

  const storage = {
    getItem: (k: string) => v.get(k) ?? null,
    removeItem: (k: string) => v.delete(k),
    setItem: (k: string, s: string) => {
      if (k === 'afterbuy_guest_deleted_demos_v1') {
        throw Object.assign(new Error('full'), { name: 'QuotaExceededError' });
      }
      v.set(k, s);
    },
  };
  (globalThis as any).window = { localStorage: storage };

  assert.throws(
    () => deleteGuestDemoItem('demo-2'),
    /本機儲存空間不足/
  );

  // The modified demo edit must remain saved and mergeable
  const merged = mergeGuestItems([{ id: 'demo-2', name: 'Default filter', backupStock: 0 }] as any);
  assert.equal(merged[0].name, 'My edited filter', 'Original demo edits must be restored on deletion failure');
  assert.equal(merged[0].backupStock, 9);
});

test('writeGuestItems with preserveDemos preserves unmigrated legacy demo items when importing custom items', () => {
  const demo = { id: 'demo-5', name: 'My edited fish oil', notes: 'x'.repeat(1000) };
  const own = { id: 'guest-1', name: 'My soap' };
  const values = new Map([['afterbuy_guest_items_v1', JSON.stringify([demo, own])]]);

  globalThis.window = {
    localStorage: {
      getItem: (k: string) => values.get(k) ?? null,
      removeItem: (k: string) => values.delete(k),
      setItem: (k: string, v: string) => {
        let size = v.length;
        for (const [key, value] of values) {
          if (key !== k) size += value.length;
        }
        if (size > 1600) throw Object.assign(new Error('full'), { name: 'QuotaExceededError' });
        values.set(k, v);
      },
    },
  } as any;

  // Before import: merged includes custom soap and edited fish oil
  const before = mergeGuestItems([{ id: 'demo-5', name: 'Default fish oil' }] as any);
  assert.ok(before.some((x) => x.name === 'My edited fish oil'));
  assert.ok(before.some((x) => x.name === 'My soap'));

  // User imports custom soap: localItems are saved with preserveDemos: true
  const local = readGuestItems();
  writeGuestItems(local.filter((i) => i.id !== 'guest-1'), { preserveDemos: true });

  // After import: edited fish oil must still be preserved
  const after = mergeGuestItems([{ id: 'demo-5', name: 'Default fish oil' }] as any);
  assert.ok(after.some((x) => x.name === 'My edited fish oil'), 'Edited fish oil must not be lost after importing custom items');
});

test('demo restore is available even when custom guest items remain', () => {
  const customItem = { id: 'custom-1', name: 'My Custom Toothpaste' };
  const demoItem = { id: 'demo-1', name: 'Toothbrush' };

  // When demo item is present, hasDemoItems is true
  const listWithDemos = [customItem, demoItem];
  assert.equal(listWithDemos.some((i) => DEMO_ITEM_IDS.has(i.id)), true);

  // When demo is cleared but custom items remain, hasDemoItems is false (restore should be visible)
  const listWithoutDemos = [customItem];
  assert.equal(listWithoutDemos.some((i) => DEMO_ITEM_IDS.has(i.id)), false);
});

test('deleteGuestDemoItem frees storage before writing tombstones when storage is at quota', () => {
  const v = new Map([['afterbuy_guest_modified_demos_v1', JSON.stringify([{ id: 'demo-2', imageUrl: 'x'.repeat(1000) }])]]);
  const max = [...v.values()].reduce((s, x) => s + x.length, 0);

  globalThis.window = {
    localStorage: {
      getItem: (k: string) => v.get(k) ?? null,
      removeItem: (k: string) => v.delete(k),
      setItem: (k: string, s: string) => {
        let total = s.length;
        for (const [key, val] of v) {
          if (key !== k) total += val.length;
        }
        if (total > max) throw Object.assign(new Error('full'), { name: 'QuotaExceededError' });
        v.set(k, s);
      },
    },
  } as any;

  deleteGuestDemoItem('demo-2');
  assert.equal(v.get('afterbuy_guest_modified_demos_v1')?.includes('demo-2'), false);
  assert.ok(v.get('afterbuy_guest_deleted_demos_v1')?.includes('demo-2'));
});

test('multi-unit items (e.g. tissue paper, shampoo) track activeUnits and backupStock concurrently', () => {
  // Scenario: 4 tissue packs in use across living room, dining room, bedroom, bathroom; 19 packs in storage
  const tissueItem = {
    id: 'tissue-1',
    name: '好市多 抽取式衛生紙',
    category: 'general' as const,
    trackingMode: 'quantity' as const,
    initialQuantity: 24,
    currentQuantity: 24,
    dailyUsage: 0.2,
    quantityUnit: '包',
    activeUnits: 4,
    backupStock: 19,
    minStockAlert: 3,
  };

  assert.equal(tissueItem.activeUnits, 4);
  assert.equal(tissueItem.backupStock, 19);
  const totalUnits = tissueItem.activeUnits + tissueItem.backupStock;
  assert.equal(totalUnits, 23);

  // When 1 pack is exhausted and replaced from backup stock
  const newBackupStock = Math.max(0, tissueItem.backupStock - 1);
  const replacedTissue = {
    ...tissueItem,
    backupStock: newBackupStock,
  };

  assert.equal(replacedTissue.activeUnits, 4, 'activeUnits must remain 4 across rooms');
  assert.equal(replacedTissue.backupStock, 18, 'backupStock decrements by 1');
  assert.equal(replacedTissue.activeUnits + replacedTissue.backupStock, 22);
});

test('presets specify defaultActiveUnits for multi-room consumables', async () => {
  const { ITEM_PRESETS } = await import('../src/shared/presets.ts');
  const tissue = ITEM_PRESETS.find((p) => p.id === 'tissue-paper');
  const shampoo = ITEM_PRESETS.find((p) => p.id === 'shampoo');
  const bodyWash = ITEM_PRESETS.find((p) => p.id === 'body-wash');
  const soap = ITEM_PRESETS.find((p) => p.id === 'soap-bar');

  assert.ok(tissue, 'tissue-paper preset exists');
  assert.equal(tissue?.defaultActiveUnits, 4);

  assert.ok(shampoo, 'shampoo preset exists');
  assert.equal(shampoo?.defaultActiveUnits, 2);

  assert.ok(bodyWash, 'body-wash preset exists');
  assert.equal(bodyWash?.defaultActiveUnits, 2);

  assert.ok(soap, 'soap-bar preset exists');
  assert.equal(soap?.defaultActiveUnits, 3);
  assert.deepEqual(tissue?.defaultActiveUnitLabels, ['客廳', '主臥', '餐桌', '客衛']);
  assert.deepEqual(shampoo?.defaultActiveUnitLabels, ['主臥衛浴', '客用浴室']);
});

test('multi-unit items track independent start dates and computeActiveUnitsStatus evaluates each unit separately', async () => {
  const { computeItemStatus, computeActiveUnitsStatus } = await import('../src/shared/lifecycle.ts');

  // Today is 2026-10-10
  const refDate = new Date('2026-10-10T12:00:00+08:00');

  // Master bathroom shampoo opened 50 days ago; guest bathroom shampoo opened 10 days ago (cycle: 60 days)
  const item = {
    id: 'shampoo-multi',
    startDate: '2026-08-21',
    trackingMode: 'cycle' as const,
    cycleDays: 60,
    activeUnits: 2,
    backupStock: 3,
    activeUnitsData: JSON.stringify([
      { id: 'u-1', label: '主臥衛浴', startDate: '2026-08-21' },
      { id: 'u-2', label: '客用浴室', startDate: '2026-09-30' },
    ]),
  };

  const computedUnits = computeActiveUnitsStatus(item, refDate);
  assert.equal(computedUnits.length, 2);

  // Unit 1: 50 days elapsed, 10 days remaining -> healthy (or due_soon if <=7)
  const unit1 = computedUnits.find((u) => u.id === 'u-1');
  assert.ok(unit1);
  assert.equal(unit1?.label, '主臥衛浴');
  assert.equal(unit1?.startDate, '2026-08-21');
  assert.equal(unit1?.elapsedDays, 50);
  assert.equal(unit1?.remainingDays, 10);

  // Unit 2: 10 days elapsed, 50 days remaining
  const unit2 = computedUnits.find((u) => u.id === 'u-2');
  assert.ok(unit2);
  assert.equal(unit2?.label, '客用浴室');
  assert.equal(unit2?.startDate, '2026-09-30');
  assert.equal(unit2?.elapsedDays, 10);
  assert.equal(unit2?.remainingDays, 50);

  // Item overall status reflects the most urgent unit (u-1 with 10 days remaining)
  const overall = computeItemStatus(item, refDate);
  assert.equal(overall.remainingDays, 10);
  assert.equal(overall.elapsedDays, 50);
  assert.equal(overall.nextDueDate, '2026-10-20');
});

test('per-unit replacement updates only the targeted unit and decrements backup stock', async () => {
  const { computeActiveUnitsStatus } = await import('../src/shared/lifecycle.ts');

  // Initial multi-unit item
  const initialUnits = [
    { id: 'u-1', label: '主臥衛浴', startDate: '2026-08-21' },
    { id: 'u-2', label: '客用浴室', startDate: '2026-09-30' },
  ];

  let backupStock = 3;
  const today = '2026-10-10';

  // Replace unit 1 (主臥衛浴)
  const targetUnitId = 'u-1';
  const updatedUnits = initialUnits.map((u) => (u.id === targetUnitId ? { ...u, startDate: today } : u));
  backupStock = Math.max(0, backupStock - 1);

  assert.equal(backupStock, 2, 'backup stock decreased by 1');
  assert.equal(updatedUnits[0].startDate, '2026-10-10', 'targeted unit reset to today');
  assert.equal(updatedUnits[1].startDate, '2026-09-30', 'untargeted unit preserved its start date');

  // Re-evaluating status shows u-2 is now the most urgent unit!
  const refDate = new Date('2026-10-10T12:00:00+08:00');
  const computed = computeActiveUnitsStatus(
    {
      startDate: '2026-09-30',
      trackingMode: 'cycle',
      cycleDays: 60,
      activeUnitsData: updatedUnits,
    },
    refDate
  );

  const u1 = computed.find((u) => u.id === 'u-1')!;
  const u2 = computed.find((u) => u.id === 'u-2')!;
  assert.equal(u1.elapsedDays, 0);
  assert.equal(u1.remainingDays, 60);
  assert.equal(u2.elapsedDays, 10);
  assert.equal(u2.remainingDays, 50);
});

test('multi-unit quantity items preserve item-wide quantity when one unit is replaced', () => {
  // Simulating an item with 2 active bottles of body wash, currently at 450ml total
  const multiUnitItem = {
    trackingMode: 'quantity' as const,
    initialQuantity: 600,
    currentQuantity: 450,
    activeUnits: 2,
    activeUnitsData: [
      { id: 'u-1', label: '主臥衛浴', startDate: '2026-08-01' },
      { id: 'u-2', label: '客用浴室', startDate: '2026-09-15' },
    ],
  };

  const isMultiUnit = Array.isArray(multiUnitItem.activeUnitsData) && multiUnitItem.activeUnitsData.length > 1;
  const resetQty = multiUnitItem.trackingMode === 'quantity'
    ? (isMultiUnit ? multiUnitItem.currentQuantity : multiUnitItem.initialQuantity)
    : null;

  assert.equal(resetQty, 450, 'multi-unit item preserves currentQuantity without blindly resetting to initialQuantity');
});

test('undo-replace snapshot payload preserves and restores activeUnitsData', () => {
  const originalSnapshot = {
    startDate: '2026-08-21',
    backupStock: 3,
    activeUnitsData: JSON.stringify([
      { id: 'u-1', label: '主臥衛浴', startDate: '2026-08-21' },
      { id: 'u-2', label: '客用浴室', startDate: '2026-09-30' },
    ]),
  };

  // Replaced u-1 on 2026-10-10
  const afterReplaceUnits = [
    { id: 'u-1', label: '主臥衛浴', startDate: '2026-10-10' },
    { id: 'u-2', label: '客用浴室', startDate: '2026-09-30' },
  ];

  // Undo replacement restores originalSnapshot.activeUnitsData
  const restoredUnitsData = originalSnapshot.activeUnitsData !== undefined
    ? originalSnapshot.activeUnitsData
    : JSON.stringify(afterReplaceUnits);

  const parsedRestored = JSON.parse(restoredUnitsData);
  assert.equal(parsedRestored[0].startDate, '2026-08-21', 'restores unit 1 original start date');
  assert.equal(parsedRestored[1].startDate, '2026-09-30', 'preserves unit 2 start date');
});


