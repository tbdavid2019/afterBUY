import type { TrackingMode, HealthStatus, ActiveUnitInstance } from './types.ts';
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
  initialQuantity?: number | null;
  dailyUsage?: number | null;
}): string {
  const start = parseBusinessDate(item.startDate);

  switch (item.trackingMode) {
    case 'cycle': {
      const days = item.cycleDays || 90;
      return addBusinessDays(item.startDate, days);
    }
    case 'quantity': {
      const initQty = item.initialQuantity || 60;
      const rate = Math.max(0.01, item.dailyUsage || 1);
      const days = item.cycleDays || Math.ceil(initQty / rate);
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
 * Computes health status and remaining days for each individual active unit instance.
 */
export function computeActiveUnitsStatus(
  item: {
    startDate?: string;
    trackingMode: TrackingMode;
    cycleDays?: number | null;
    paoMonths?: number | null;
    expiryDate?: string | null;
    warrantyDate?: string | null;
    initialQuantity?: number | null;
    currentQuantity?: number | null;
    dailyUsage?: number | null;
    quantityUnit?: string | null;
    backupStock: number;
    minStockAlert?: number;
    isStored?: boolean | null;
    snoozeUntil?: string | null;
    activeUnitsData?: ActiveUnitInstance[] | string | null;
    updatedAt?: string | null;
    quantityUpdatedAt?: string | null;
  },
  referenceDate: Date = new Date()
): ActiveUnitInstance[] {
  let units: ActiveUnitInstance[] = [];
  if (Array.isArray(item.activeUnitsData)) {
    units = item.activeUnitsData;
  } else if (typeof item.activeUnitsData === 'string' && item.activeUnitsData.trim()) {
    try {
      units = JSON.parse(item.activeUnitsData);
    } catch {
      units = [];
    }
  }

  if (!Array.isArray(units) || units.length === 0) {
    return [];
  }

  const todayStr = businessDate(referenceDate);

  return units.map((u, idx) => {
    const unitStartDate = u.startDate || item.startDate || todayStr;
    const unitStatus = computeItemStatus(
      {
        ...item,
        startDate: unitStartDate,
        activeUnitsData: null,
      },
      referenceDate
    );

    return {
      id: u.id || `u-${idx + 1}`,
      label: u.label || `位置 ${idx + 1}`,
      startDate: unitStartDate,
      nextDueDate: unitStatus.nextDueDate,
      totalDays: unitStatus.totalDays,
      elapsedDays: unitStatus.elapsedDays,
      daysUntilStart: unitStatus.daysUntilStart,
      remainingDays: unitStatus.remainingDays,
      percentageRemaining: unitStatus.percentageRemaining,
      remainingQuantity: unitStatus.remainingQuantity,
      healthStatus: unitStatus.healthStatus,
    };
  });
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
    initialQuantity?: number | null;
    currentQuantity?: number | null;
    dailyUsage?: number | null;
    quantityUnit?: string | null;
    activeUnits?: number | null;
    activeUnitsData?: ActiveUnitInstance[] | string | null;
    backupStock: number;
    minStockAlert?: number;
    isStored?: boolean | null;
    snoozeUntil?: string | null;
    updatedAt?: string | null;
    quantityUpdatedAt?: string | null;
  },
  referenceDate: Date = new Date()
): {
  nextDueDate: string;
  totalDays: number;
  elapsedDays: number;
  daysUntilStart: number;
  remainingDays: number;
  percentageRemaining: number;
  remainingQuantity?: number | null;
  healthStatus: HealthStatus;
  needsRestock: boolean;
} {
  const refDateStr = businessDate(referenceDate);
  const rawElapsed = businessDateDiff(item.startDate, refDateStr);
  const isFuture = rawElapsed < 0;
  let daysUntilStart = isFuture ? Math.abs(rawElapsed) : 0;
  let elapsedDays = Math.max(0, rawElapsed);

  let nextDueDate = computeNextDueDate(item);
  let totalDays = Math.max(1, businessDateDiff(item.startDate, nextDueDate));
  let remainingDays = businessDateDiff(refDateStr, nextDueDate);
  let remainingQuantity: number | null = null;

  if (item.trackingMode === 'quantity') {
    const initQty = item.initialQuantity || 60;
    const rate = Math.max(0.01, item.dailyUsage || 1);
    totalDays = Math.max(1, Math.ceil(initQty / rate));

    if (isFuture) {
      // Future start date: bottle is unopened/pending, full capacity
      remainingQuantity = initQty;
      remainingDays = totalDays + daysUntilStart;
      nextDueDate = addBusinessDays(item.startDate, totalDays);
    } else {
      // Started: Auto-consume based on elapsed days!
      // In AfterBuy, consumables automatically deplete with calendar time.
      const autoConsumed = elapsedDays * rate;
      const autoRemaining = Math.max(0, initQty - autoConsumed);

      if (item.currentQuantity !== null && item.currentQuantity !== undefined && (item.quantityUpdatedAt || item.currentQuantity < initQty)) {
        // If currentQuantity was manually adjusted or calibrated at a certain date:
        // Prioritize quantityUpdatedAt (which only changes when quantity is calibrated or consumed).
        // Fall back to updatedAt only when quantityUpdatedAt is not available.
        const calibrationTimestamp = item.quantityUpdatedAt || item.updatedAt;
        let daysSinceUpdate = 0;
        if (calibrationTimestamp) {
          try {
            const updateDateStr = businessDate(new Date(calibrationTimestamp));
            const updateElapsed = businessDateDiff(item.startDate, updateDateStr);
            if (updateElapsed >= 0) {
              daysSinceUpdate = Math.max(0, businessDateDiff(updateDateStr, refDateStr));
            } else {
              // Calibration timestamp predates startDate (stale timestamp from previous replacement cycle)
              daysSinceUpdate = -1;
            }
          } catch {
            daysSinceUpdate = 0;
          }
        }

        if (daysSinceUpdate === -1) {
          // Stale calibration predates startDate: fallback to autoRemaining from new startDate
          remainingQuantity = Math.round(autoRemaining * 10) / 10;
        } else {
          const consumedSinceUpdate = daysSinceUpdate * rate;
          const remainingFromUpdate = Math.max(0, Math.round((item.currentQuantity - consumedSinceUpdate) * 10) / 10);

          if (item.quantityUpdatedAt) {
            // Explicit calibration timestamp exists: user's manual correction (including upward) is authoritative
            remainingQuantity = remainingFromUpdate;
          } else {
            // Legacy item without dedicated calibration timestamp:
            // Bound by autoRemaining so generic historical updatedAt doesn't inflate stock.
            remainingQuantity = Math.min(remainingFromUpdate, Math.round(autoRemaining * 10) / 10);
          }
        }
      } else {
        remainingQuantity = Math.round(autoRemaining * 10) / 10;
      }

      remainingDays = Math.ceil(remainingQuantity / rate);
      nextDueDate = addBusinessDays(refDateStr, remainingDays);
    }
  } else if (isFuture && (item.trackingMode === 'cycle' || item.trackingMode === 'pao')) {
    remainingDays = totalDays + daysUntilStart;
    nextDueDate = addBusinessDays(item.startDate, totalDays);
  }

  let percentageRemaining = Math.max(0, Math.min(100, Math.round((remainingDays / totalDays) * 100)));
  if (item.trackingMode === 'quantity' && remainingQuantity !== null) {
    const initQty = item.initialQuantity || 60;
    if (initQty > 0) {
      percentageRemaining = Math.max(0, Math.min(100, Math.round((remainingQuantity / initQty) * 100)));
    }
  }

  let healthStatus: HealthStatus = 'healthy';
  if (isFuture) {
    // Scheduled for future activation
    healthStatus = 'healthy';
    percentageRemaining = 100;
  } else if (item.isStored && item.trackingMode !== 'expiry' && item.trackingMode !== 'warranty') {
    healthStatus = 'stored';
    percentageRemaining = 100;
  } else if (item.snoozeUntil && item.snoozeUntil > refDateStr) {
    healthStatus = 'snoozed';
  } else if (remainingDays < 0 || (item.trackingMode === 'quantity' && remainingQuantity !== null && remainingQuantity <= 0)) {
    healthStatus = 'overdue';
    percentageRemaining = 0;
  } else if (remainingDays <= 7 || percentageRemaining <= 15) {
    healthStatus = 'due_soon';
  } else {
    healthStatus = 'healthy';
  }

  if (item.activeUnitsData && !item.isStored) {
    const computedUnits = computeActiveUnitsStatus(item, referenceDate);
    if (computedUnits.length > 0) {
      const sorted = [...computedUnits].sort((a, b) => (a.remainingDays ?? 0) - (b.remainingDays ?? 0));
      const mostUrgent = sorted[0];
      if (mostUrgent) {
        nextDueDate = mostUrgent.nextDueDate ?? nextDueDate;
        totalDays = mostUrgent.totalDays ?? totalDays;
        elapsedDays = mostUrgent.elapsedDays ?? elapsedDays;
        daysUntilStart = mostUrgent.daysUntilStart ?? daysUntilStart;
        remainingDays = mostUrgent.remainingDays ?? remainingDays;
        percentageRemaining = mostUrgent.percentageRemaining ?? percentageRemaining;
        healthStatus = mostUrgent.healthStatus ?? healthStatus;
        if (mostUrgent.remainingQuantity !== undefined) {
          remainingQuantity = mostUrgent.remainingQuantity;
        }
      }
    }
  }

  const minStock = item.minStockAlert ?? 1;
  const needsRestock = item.backupStock < minStock;

  return {
    nextDueDate,
    totalDays,
    elapsedDays,
    daysUntilStart,
    remainingDays,
    percentageRemaining,
    remainingQuantity,
    healthStatus,
    needsRestock,
  };
}

/**
 * Returns a human-friendly description of days remaining.
 */
export function formatRemainingDaysText(
  remainingDays: number,
  healthStatus?: HealthStatus,
  quantityMeta?: { remainingQuantity?: number | null; quantityUnit?: string | null; daysUntilStart?: number }
): { text: string; color: string; badge: string; dot: string } {
  const daysUntilStart = quantityMeta?.daysUntilStart ?? 0;
  const hasRemainingQty = quantityMeta?.remainingQuantity !== null && quantityMeta?.remainingQuantity !== undefined;
  const qtyPrefix = hasRemainingQty
    ? `約剩 ${quantityMeta.remainingQuantity} ${quantityMeta.quantityUnit || '個'} · `
    : '';

  if (daysUntilStart > 0) {
    return {
      text: `${qtyPrefix}距啟用 ${daysUntilStart} 天`,
      color: 'text-indigo-700 dark:text-indigo-400 font-semibold',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60',
      dot: 'bg-indigo-500',
    };
  }

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
  // Depleted quantity items should explicitly indicate they are used up
  if (hasRemainingQty && quantityMeta.remainingQuantity! <= 0) {
    return {
      text: `已用盡（需開新備品）`,
      color: 'text-rose-700 dark:text-rose-400 font-semibold',
      badge: 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
      dot: 'bg-rose-500',
    };
  }
  if (remainingDays < 0) {
    const days = Math.abs(remainingDays);
    return {
      text: qtyPrefix ? `${qtyPrefix}已用盡` : `已過期 ${days} 天`,
      color: 'text-rose-700 dark:text-rose-400 font-semibold',
      badge: 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
      dot: 'bg-rose-500',
    };
  }
  if (remainingDays === 0) {
    return {
      text: qtyPrefix ? `${qtyPrefix}今日預計用盡！` : '今天該換！',
      color: 'text-amber-800 dark:text-amber-300 font-bold',
      badge: 'bg-amber-50 text-amber-800 border-amber-300/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 font-semibold',
      dot: 'bg-amber-500',
    };
  }
  if (remainingDays <= 7) {
    return {
      text: `${qtyPrefix}剩餘 ${remainingDays} 天`,
      color: 'text-amber-800 dark:text-amber-300',
      badge: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
      dot: 'bg-amber-500',
    };
  }
  return {
    text: `${qtyPrefix}剩餘 ${remainingDays} 天`,
    color: 'text-emerald-700 dark:text-emerald-400',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
    dot: 'bg-emerald-500',
  };
}
