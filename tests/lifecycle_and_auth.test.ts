import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeNextDueDate, computeItemStatus, formatRemainingDaysText } from '../src/shared/lifecycle.ts';
import { generateOTP, generateRandomToken, hashString, createSessionToken, verifySessionToken } from '../src/api/utils/auth.ts';

describe('Lifecycle & Status Engine', () => {
  it('should compute cycle next due date correctly', () => {
    const nextDue = computeNextDueDate({
      trackingMode: 'cycle',
      startDate: '2026-01-01',
      cycleDays: 90,
    });
    assert.equal(nextDue, '2026-04-01');
  });

  it('should compute PAO next due date correctly', () => {
    const nextDue = computeNextDueDate({
      trackingMode: 'pao',
      startDate: '2026-01-01',
      paoMonths: 6,
    });
    assert.equal(nextDue, '2026-07-01');
  });

  it('should compute overdue health status when past due date', () => {
    const status = computeItemStatus(
      {
        startDate: '2026-01-01',
        trackingMode: 'cycle',
        cycleDays: 30,
        backupStock: 0,
      },
      new Date('2026-02-15T00:00:00')
    );

    assert.equal(status.healthStatus, 'overdue');
    assert.equal(status.percentageRemaining, 0);
    assert.equal(status.needsRestock, true);
  });

  it('should compute due_soon health status when <= 7 days', () => {
    const status = computeItemStatus(
      {
        startDate: '2026-01-01',
        trackingMode: 'cycle',
        cycleDays: 90, // Due 2026-04-01
        backupStock: 2,
      },
      new Date('2026-03-28T00:00:00') // 4 days remaining
    );

    assert.equal(status.healthStatus, 'due_soon');
    assert.equal(status.remainingDays, 4);
    assert.equal(status.needsRestock, false);
  });

  it('should format remaining days descriptions properly', () => {
    assert.match(formatRemainingDaysText(-3).text, /已過期 3 天/);
    assert.match(formatRemainingDaysText(0).text, /今天該換/);
    assert.match(formatRemainingDaysText(5).text, /剩餘 5 天/);
  });
});

describe('Auth & Session Crypto Utilities', () => {
  it('should generate valid 6-digit OTP', () => {
    const otp = generateOTP();
    assert.equal(otp.length, 6);
    assert.match(otp, /^\d{6}$/);
  });

  it('should generate secure random hex token', () => {
    const token = generateRandomToken(32);
    assert.equal(token.length, 64);
  });

  it('should create and verify HMAC signed session token', async () => {
    const user = {
      id: 'test-user-id',
      email: 'test@afterbuy.app',
      calendarToken: 'sample-calendar-token',
      isVip: true,
    };

    const token = await createSessionToken(user, 'test-secret-key-32chars-long-here!');
    const verified = await verifySessionToken(token, 'test-secret-key-32chars-long-here!');

    assert.ok(verified);
    assert.equal(verified?.id, user.id);
    assert.equal(verified?.email, user.email);
    assert.equal(verified?.isVip, true);
  });

  it('should reject invalid session signature', async () => {
    const user = {
      id: 'test-user-id',
      email: 'test@afterbuy.app',
      calendarToken: 'sample-calendar-token',
      isVip: false,
    };

    const token = await createSessionToken(user, 'secret-1');
    const verified = await verifySessionToken(token, 'different-secret-2');

    assert.equal(verified, null);
  });
});
