import type { TrackingMode, HealthStatus } from './types.ts';
import { addBusinessDays, businessDate, businessDateDiff, parseBusinessDate } from './date.ts';

/**
 * Calculates the next due date based on the item's tracking mode and start date.
 */
export function computeNextDueDate(item: {
  trackingMode: TrackingMode;
  startDate: string;
  cycleDays?: number | null;
  paoMonths?: number | null;
  expiryDate?: string | null;
  warrantyDate?: string | null;
}): string {
  const start = parseBusinessDate(item.startDate);

  switch (item.trackingMode) {
    case 'cycle': {
      const days = item.cycleDays || 90;
      return addBusinessDays(item.startDate, days);
    }
    case 'pao': {
      const months = item.paoMonths || 6;
      const due = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, start.getUTCDate()));
      return due.toISOString().slice(0, 10);
    }
    case 'expiry': {
      return item.expiryDate || item.startDate;
    }
    case 'warranty': {
      return item.warrantyDate || item.startDate;
    }
    default:
      return item.startDate;
  }
}

/**
 * Computes health status, remaining days, and percentage of lifespan left.
 */
export function computeItemStatus(
  item: {
    startDate: string;
    trackingMode: TrackingMode;
    cycleDays?: number | null;
    paoMonths?: number | null;
    expiryDate?: string | null;
    warrantyDate?: string | null;
    backupStock: number;
    minStockAlert?: number;
    isStored?: boolean | null;
    snoozeUntil?: string | null;
  },
  referenceDate: Date = new Date()
): {
  nextDueDate: string;
  totalDays: number;
  elapsedDays: number;
  remainingDays: number;
  percentageRemaining: number;
  healthStatus: HealthStatus;
  needsRestock: boolean;
} {
  const refDateStr = businessDate(referenceDate);
  const nextDueDate = computeNextDueDate(item);
  const totalDays = Math.max(1, businessDateDiff(item.startDate, nextDueDate));
  const elapsedDays = businessDateDiff(item.startDate, refDateStr);
  const remainingDays = businessDateDiff(refDateStr, nextDueDate);

  let percentageRemaining = Math.max(0, Math.min(100, Math.round((remainingDays / totalDays) * 100)));

  let healthStatus: HealthStatus = 'healthy';
  // A stored fixed-date item can still expire while it is unopened. Stored
  // cycle/PAO items have no active lifespan until they are started.
  if (item.isStored && item.trackingMode !== 'expiry' && item.trackingMode !== 'warranty') {
    healthStatus = 'stored';
    percentageRemaining = 100;
  } else if (item.snoozeUntil && item.snoozeUntil > refDateStr) {
    healthStatus = 'snoozed';
  } else if (remainingDays <= 0) {
    healthStatus = 'overdue';
    percentageRemaining = 0;
  } else if (remainingDays <= 7 || percentageRemaining <= 15) {
    healthStatus = 'due_soon';
  } else {
    healthStatus = 'healthy';
  }

  const minStock = item.minStockAlert ?? 1;
  const needsRestock = item.backupStock < minStock;

  return {
    nextDueDate,
    totalDays,
    elapsedDays,
    remainingDays,
    percentageRemaining,
    healthStatus,
    needsRestock,
  };
}

/**
 * Returns a human-friendly description of days remaining.
 */
export function formatRemainingDaysText(
  remainingDays: number,
  healthStatus?: HealthStatus
): { text: string; color: string; badge: string } {
  if (healthStatus === 'stored') {
    return {
      text: '存放中（未拆封）',
      color: 'text-indigo-400',
      badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
    };
  }
  if (healthStatus === 'snoozed') {
    return {
      text: '延後提醒中',
      color: 'text-sky-400',
      badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30'
    };
  }
  if (remainingDays < 0) {
    const days = Math.abs(remainingDays);
    return {
      text: `已過期 ${days} 天`,
      color: 'text-rose-400',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
    };
  }
  if (remainingDays === 0) {
    return {
      text: '今天該換！',
      color: 'text-amber-400 font-bold',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
    };
  }
  if (remainingDays <= 7) {
    return {
      text: `剩餘 ${remainingDays} 天`,
      color: 'text-amber-400',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    };
  }
  return {
    text: `剩餘 ${remainingDays} 天`,
    color: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
  };
}
