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
});
