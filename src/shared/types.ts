export type TrackingMode = 'cycle' | 'pao' | 'expiry' | 'warranty';
export type HealthStatus = 'healthy' | 'due_soon' | 'overdue' | 'out_of_stock';
export type ItemCategory = 'bathroom' | 'kitchen' | 'skincare' | 'medicine' | 'appliances' | 'electronics' | 'general';

export interface UserSession {
  id: string;
  email: string;
  calendarToken: string;
  isVip: boolean;
}

export interface ItemResponse {
  id: string;
  userId: string;
  name: string;
  category: ItemCategory;
  trackingMode: TrackingMode;
  cycleDays: number | null;
  startDate: string;
  paoMonths: number | null;
  expiryDate: string | null;
  warrantyDate: string | null;
  backupStock: number;
  minStockAlert: number;
  notes: string | null;
  imageUrl: string | null;
  calendarSequence: number;
  createdAt: string;
  updatedAt: string;

  // Computed properties
  nextDueDate: string;
  totalDays: number;
  elapsedDays: number;
  remainingDays: number;
  percentageRemaining: number;
  healthStatus: HealthStatus;
  needsRestock: boolean;
}

export interface ItemHistoryRecord {
  id: string;
  itemId: string;
  userId: string;
  replacedAt: string;
  previousStartDate: string;
  stockAfterReplace: number;
  notes: string | null;
}

export interface UserNotificationSettings {
  emailEnabled: boolean;
  pushEnabled: boolean;
  warningDaysBefore: number;
  warningDayOf: boolean;
  preferredHour: number;
}
