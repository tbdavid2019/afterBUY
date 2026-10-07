import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeNextDueDate, computeItemStatus } from '../src/shared/lifecycle.ts';
import type { ItemCategory } from '../src/shared/types.ts';
import { CATEGORIES, ITEM_PRESETS } from '../src/client/utils/category.ts';

describe('Batch Operations & Category Expansion Tests', () => {
  it('should validate clothing category and presets', () => {
    assert.ok(CATEGORIES.clothing, 'Clothing category should exist');
    assert.equal(CATEGORIES.clothing.label, '貼身穿戴');

    const underwear = ITEM_PRESETS.find((p) => p.name.includes('內褲'));
    assert.ok(underwear, 'Underwear preset should exist');
    assert.equal(underwear?.category, 'clothing');
    assert.ok(underwear?.cycleDays && underwear.cycleDays >= 90);

    const helmet = ITEM_PRESETS.find((p) => p.name.includes('安全帽'));
    assert.ok(helmet, 'Helmet preset should exist');
    assert.equal(helmet?.cycleDays, 1095, 'Helmet replacement cycle should be 3 years (1095 days)');

    const ink = ITEM_PRESETS.find((p) => p.name.includes('墨水'));
    assert.ok(ink, 'Printer ink preset should exist');

    const vitamin = ITEM_PRESETS.find((p) => p.name.includes('維他命'));
    assert.ok(vitamin, 'Vitamin preset should exist');

    const battery = ITEM_PRESETS.find((p) => p.name.includes('電池'));
    assert.ok(battery, 'Battery preset should exist');

    const fishOil = ITEM_PRESETS.find((p) => p.name.includes('魚油'));
    assert.ok(fishOil, 'Costco Fish Oil preset should exist');
    assert.equal(fishOil?.initialQuantity, 150, 'Costco fish oil should be 150 capsules');
    assert.equal(fishOil?.defaultSpecModel, '150顆/瓶');

    const garbageBag = ITEM_PRESETS.find((p) => p.name.includes('垃圾袋'));
    assert.ok(garbageBag, 'Garbage bag preset should exist');

    const tissues = ITEM_PRESETS.find((p) => p.name.includes('衛生紙'));
    assert.ok(tissues, 'Tissues preset should exist');
  });

  it('should correctly simulate batch replacement updates', () => {
    const mockItems = [
      { id: 'item-1', name: '牙刷', backupStock: 2, cycleDays: 90, startDate: '2026-01-01' },
      { id: 'item-2', name: '內褲', backupStock: 0, cycleDays: 90, startDate: '2026-01-01' },
      { id: 'item-3', name: '濾芯', backupStock: 1, cycleDays: 180, startDate: '2026-01-01' },
    ];

    const todayStr = '2026-04-01';

    // Batch replace
    const updated = mockItems.map((item) => {
      const newStock = Math.max(0, item.backupStock - 1);
      const nextDue = computeNextDueDate({
        trackingMode: 'cycle',
        startDate: todayStr,
        cycleDays: item.cycleDays,
      });

      return {
        ...item,
        startDate: todayStr,
        nextDueDate: nextDue,
        backupStock: newStock,
      };
    });

    assert.equal(updated[0].backupStock, 1, 'Stock should decrement from 2 to 1');
    assert.equal(updated[0].startDate, todayStr);
    assert.equal(updated[1].backupStock, 0, 'Stock should stay 0 when already 0');
    assert.equal(updated[2].backupStock, 0, 'Stock should decrement from 1 to 0');
  });

  it('should format price and spec model correctly', () => {
    const rawPrice = 450.7;
    const integerPrice = Math.max(0, Math.round(rawPrice));
    assert.equal(integerPrice, 451);

    const specModel = '  003 黑色防水墨水  ';
    assert.equal(specModel.trim(), '003 黑色防水墨水');
  });

  it('should isolate cycle/expiry alerts, backup stock alerts, and usage alerts into 3 independent streams', () => {
    const items = [
      {
        id: '1',
        name: '電動牙刷刷頭',
        trackingMode: 'cycle',
        startDate: '2026-07-01',
        cycleDays: 90,
        backupStock: 2,
        minStockAlert: 1,
      },
      {
        id: '2',
        name: '濾水壺濾芯',
        trackingMode: 'cycle',
        startDate: '2026-09-01',
        cycleDays: 180,
        backupStock: 0, // Low backup stock!
        minStockAlert: 1,
      },
      {
        id: '3',
        name: '好市多魚油',
        trackingMode: 'quantity',
        startDate: '2026-09-01',
        initialQuantity: 150,
        currentQuantity: 4, // 2 days left at 2/day! Low usage!
        dailyUsage: 2,
        backupStock: 1,
        minStockAlert: 1,
      },
    ];

    const todayStr = '2026-09-30';
    const warningDays = 3;

    // Simulate 3-way separated alert classifier
    const classifyAlerts = (settings: { cycleExpiryAlert: boolean; stockLowAlert: boolean; usageLowAlert: boolean }) => {
      const cycleExpiry: string[] = [];
      const stockLow: string[] = [];
      const usageLow: string[] = [];

      for (const item of items) {
        // Category 2: 備品庫存提醒 (獨立判定，不論是否到期)
        if (settings.stockLowAlert && item.backupStock < item.minStockAlert) {
          stockLow.push(item.name);
        }

        // Category 3: 用量提醒 (數量模式)
        if (item.trackingMode === 'quantity') {
          if (settings.usageLowAlert) {
            const daysLeft = Math.ceil((item.currentQuantity ?? 0) / (item.dailyUsage ?? 1));
            if (daysLeft <= warningDays) {
              usageLow.push(item.name);
            }
          }
        } else {
          // Category 1: 到期提醒
          if (settings.cycleExpiryAlert) {
            const nextDue = computeNextDueDate({
              trackingMode: item.trackingMode as any,
              startDate: item.startDate,
              cycleDays: item.cycleDays,
            });
            // 2026-07-01 + 90 days = 2026-09-29 -> already overdue on 2026-09-30!
            if (nextDue <= todayStr) {
              cycleExpiry.push(item.name);
            }
          }
        }
      }

      return { cycleExpiry, stockLow, usageLow };
    };

    // When all enabled:
    const all = classifyAlerts({ cycleExpiryAlert: true, stockLowAlert: true, usageLowAlert: true });
    assert.deepEqual(all.cycleExpiry, ['電動牙刷刷頭'], 'Only toothbrush is due for cycle replacement');
    assert.deepEqual(all.stockLow, ['濾水壺濾芯'], 'Only water filter has backup stock low (0 < 1)');
    assert.deepEqual(all.usageLow, ['好市多魚油'], 'Only fish oil is low on capsules (4 left)');

    // When cycleExpiryAlert disabled:
    const noCycle = classifyAlerts({ cycleExpiryAlert: false, stockLowAlert: true, usageLowAlert: true });
    assert.equal(noCycle.cycleExpiry.length, 0, 'Cycle alerts should be suppressed when turned off');
    assert.equal(noCycle.stockLow.length, 1, 'Stock alerts should still trigger');
    assert.equal(noCycle.usageLow.length, 1, 'Usage alerts should still trigger');

    // When stockLowAlert disabled:
    const noStock = classifyAlerts({ cycleExpiryAlert: true, stockLowAlert: false, usageLowAlert: true });
    assert.equal(noStock.stockLow.length, 0, 'Stock alerts should be suppressed when turned off');
    assert.equal(noStock.cycleExpiry.length, 1, 'Cycle alerts should still trigger');
    assert.equal(noStock.usageLow.length, 1, 'Usage alerts should still trigger');

    // When usageLowAlert disabled:
    const noUsage = classifyAlerts({ cycleExpiryAlert: true, stockLowAlert: true, usageLowAlert: false });
    assert.equal(noUsage.usageLow.length, 0, 'Usage alerts should be suppressed when turned off');
    assert.equal(noUsage.cycleExpiry.length, 1, 'Cycle alerts should still trigger');
    assert.equal(noUsage.stockLow.length, 1, 'Stock alerts should still trigger');
  });

  it('should correctly handle future start dates without negative elapsed days and auto-deplete over time', () => {
    // Case 1: Today is 2026-10-07, Item scheduled to start on 2026-10-10
    const futureItem = {
      startDate: '2026-10-10',
      trackingMode: 'quantity' as const,
      initialQuantity: 180,
      dailyUsage: 2,
      quantityUnit: '錠',
      backupStock: 1,
      minStockAlert: 1,
    };

    const todayDate = new Date('2026-10-07T00:00:00+08:00');
    const statusBeforeStart = computeItemStatus(futureItem, todayDate);

    assert.equal(statusBeforeStart.elapsedDays, 0, 'Elapsed days should be 0, never negative');
    assert.equal(statusBeforeStart.daysUntilStart, 3, 'Days until start should be 3 days');
    assert.equal(statusBeforeStart.remainingQuantity, 180, 'Full 180 capsules should remain unopened');

    // Case 2: 10 days after start (2026-10-20), user does NOT click anything
    const laterDate = new Date('2026-10-20T00:00:00+08:00');
    const statusAfter10Days = computeItemStatus(futureItem, laterDate);

    assert.equal(statusAfter10Days.elapsedDays, 10, '10 days have elapsed since 10/10');
    assert.equal(statusAfter10Days.daysUntilStart, 0, 'Item has already started');
    // 180 - (10 days * 2/day) = 160 capsules automatically without manual clicks!
    assert.equal(statusAfter10Days.remainingQuantity, 160, '160 capsules should remain automatically (180 - 10*2)');
    assert.equal(statusAfter10Days.remainingDays, 80, '80 days of usage remaining (160 / 2)');
  });
});
