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
  } else if (remainingDays < 0) {
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
): { text: string; color: string; badge: string; dot: string } {
  if (healthStatus === 'stored') {
    return {
      text: '存放中（未拆封）',
      color: 'text-slate-700 dark:text-slate-300',
      badge: 'bg-slate-100/90 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      dot: 'bg-slate-400 dark:bg-slate-500',
    };
  }
  if (healthStatus === 'snoozed') {
    return {
      text: '延後提醒中',
      color: 'text-blue-700 dark:text-blue-400',
      badge: 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60',
      dot: 'bg-blue-500',
    };
  }
  if (remainingDays < 0) {
    const days = Math.abs(remainingDays);
    return {
      text: `已過期 ${days} 天`,
      color: 'text-rose-700 dark:text-rose-400 font-semibold',
      badge: 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
      dot: 'bg-rose-500',
    };
  }
  if (remainingDays === 0) {
    return {
      text: '今天該換！',
      color: 'text-amber-800 dark:text-amber-300 font-bold',
      badge: 'bg-amber-50 text-amber-800 border-amber-300/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 font-semibold',
      dot: 'bg-amber-500',
    };
  }
  if (remainingDays <= 7) {
    return {
      text: `剩餘 ${remainingDays} 天`,
      color: 'text-amber-800 dark:text-amber-300',
      badge: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
      dot: 'bg-amber-500',
    };
  }
  return {
    text: `剩餘 ${remainingDays} 天`,
    color: 'text-emerald-700 dark:text-emerald-400',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
    dot: 'bg-emerald-500',
  };
}
