import type { TrackingMode, HealthStatus, ItemResponse } from './types.ts';

function formatDateLocal(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
  const [y, m, d] = item.startDate.split('-').map(Number);
  const start = new Date(y, m - 1, d);

  switch (item.trackingMode) {
    case 'cycle': {
      const days = item.cycleDays || 90;
      const due = new Date(start);
      due.setDate(due.getDate() + days);
      return formatDateLocal(due);
    }
    case 'pao': {
      const months = item.paoMonths || 6;
      const due = new Date(start);
      due.setMonth(due.getMonth() + months);
      return formatDateLocal(due);
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
  const nextDueDate = computeNextDueDate(item);
  const [sy, sm, sd] = item.startDate.split('-').map(Number);
  const [dy, dm, dd] = nextDueDate.split('-').map(Number);
  
  const start = new Date(sy, sm - 1, sd);
  const due = new Date(dy, dm - 1, dd);
  const ref = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());

  const msPerDay = 1000 * 60 * 60 * 24;
  const totalDays = Math.max(1, Math.round((due.getTime() - start.getTime()) / msPerDay));
  const elapsedDays = Math.round((ref.getTime() - start.getTime()) / msPerDay);
  const remainingDays = Math.round((due.getTime() - ref.getTime()) / msPerDay);

  let percentageRemaining = Math.max(0, Math.min(100, Math.round((remainingDays / totalDays) * 100)));

  let healthStatus: HealthStatus = 'healthy';
  if (remainingDays <= 0) {
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
export function formatRemainingDaysText(remainingDays: number): { text: string; color: string; badge: string } {
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
