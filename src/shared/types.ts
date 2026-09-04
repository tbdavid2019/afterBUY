export type TrackingMode = 'cycle' | 'pao' | 'expiry' | 'warranty';
export type HealthStatus = 'healthy' | 'due_soon' | 'overdue' | 'out_of_stock' | 'snoozed' | 'stored';
export type ItemCategory = 'bathroom' | 'kitchen' | 'skincare' | 'medicine' | 'appliances' | 'electronics' | 'clothing' | 'general';

export type StockRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface StockMemberResponse {
  id: string;
  stockId: string;
  userId: string;
  email?: string;
  role: StockRole;
  nickname: string | null;
  createdAt: string;
}

export interface StockResponse {
  id: string;
  name: string;
  icon: string;
  description: string | null;
  ownerId: string;
  calendarToken: string;
  myRole: StockRole;
  memberCount?: number;
  itemCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface StockInviteResponse {
  id: string;
  stockId: string;
  code: string;
  role: StockRole;
  expiresAt: string;
  usedCount: number;
  maxUses: number;
  inviteUrl?: string;
}

export interface UserSession {
  id: string;
  email: string;
  calendarToken: string;
  isVip: boolean;
}

export interface ItemResponse {
  id: string;
  userId: string;
  stockId?: string | null;
  stockName?: string;
  stockIcon?: string;
  createdByUserId?: string | null;
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
  price: number | null;
  specModel: string | null;
  location: string | null;
  isStored: boolean;
  snoozeUntil: string | null;
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
  replacedByUserId?: string | null;
  replacedByNickname?: string | null;
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
