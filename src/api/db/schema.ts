import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  calendarToken: text('calendar_token').notNull().unique(),
  isVip: integer('is_vip').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const passkeyCredentials = sqliteTable('passkey_credentials', {
  id: text('id').primaryKey(), // Credential ID (base64url)
  userId: text('user_id').notNull().references(() => users.id),
  publicKey: text('public_key').notNull(),
  counter: integer('counter').notNull().default(0),
  deviceName: text('device_name').notNull().default('My Device'),
  transports: text('transports'), // JSON string array
  createdAt: text('created_at').notNull(),
  lastUsedAt: text('last_used_at'),
});

export const stocks = sqliteTable('stocks', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon').notNull().default('📦'),
  description: text('description'),
  ownerId: text('owner_id').notNull().references(() => users.id),
  calendarToken: text('calendar_token').notNull().unique(),
  deletedAt: text('deleted_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const stockMembers = sqliteTable('stock_members', {
  id: text('id').primaryKey(),
  stockId: text('stock_id').notNull().references(() => stocks.id),
  userId: text('user_id').notNull().references(() => users.id),
  role: text('role').notNull().default('member'), // owner | admin | member | viewer
  nickname: text('nickname'),
  createdAt: text('created_at').notNull(),
});

export const stockInvites = sqliteTable('stock_invites', {
  id: text('id').primaryKey(),
  stockId: text('stock_id').notNull().references(() => stocks.id),
  code: text('code').notNull().unique(),
  role: text('role').notNull().default('member'),
  createdByUserId: text('created_by_user_id').notNull().references(() => users.id),
  expiresAt: text('expires_at').notNull(),
  usedCount: integer('used_count').notNull().default(0),
  maxUses: integer('max_uses').notNull().default(10),
  createdAt: text('created_at').notNull(),
});

export const items = sqliteTable('items', {
  id: text('id').primaryKey(),
  stockId: text('stock_id').references(() => stocks.id),
  userId: text('user_id').notNull().references(() => users.id),
  createdByUserId: text('created_by_user_id').references(() => users.id),
  name: text('name').notNull(),
  category: text('category').notNull().default('general'), // bathroom, kitchen, skincare, medicine, appliances, electronics, clothing, general
  trackingMode: text('tracking_mode').notNull().default('cycle'), // cycle, pao, expiry, warranty
  cycleDays: integer('cycle_days'), // e.g. 90
  startDate: text('start_date').notNull(), // YYYY-MM-DD
  paoMonths: integer('pao_months'), // e.g. 6 or 12
  expiryDate: text('expiry_date'), // YYYY-MM-DD
  warrantyDate: text('warranty_date'), // YYYY-MM-DD
  backupStock: integer('backup_stock').notNull().default(0),
  minStockAlert: integer('min_stock_alert').notNull().default(1),
  price: integer('price'), // Purchase price / cost (e.g. NT$ integer or cents)
  specModel: text('spec_model'), // Model, cartridge spec, battery size, etc.
  location: text('location'), // Location: 衛浴, 廚房, 臥室, 儲藏室, etc.
  isStored: integer('is_stored').notNull().default(0), // 1 = 先存放尚未開始使用, 0 = 啟用中
  snoozeUntil: text('snooze_until'), // YYYY-MM-DD for snooze delay
  notes: text('notes'),
  imageUrl: text('image_url'),
  calendarSequence: integer('calendar_sequence').notNull().default(0),
  deletedAt: text('deleted_at'), // ISO timestamp for soft delete 30-day tombstone
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const itemHistory = sqliteTable('item_history', {
  id: text('id').primaryKey(),
  itemId: text('item_id').notNull().references(() => items.id),
  userId: text('user_id').notNull().references(() => users.id),
  replacedByUserId: text('replaced_by_user_id').references(() => users.id),
  replacedAt: text('replaced_at').notNull(),
  previousStartDate: text('previous_start_date').notNull(),
  stockAfterReplace: integer('stock_after_replace').notNull(),
  notes: text('notes'),
});

export const pushSubscriptions = sqliteTable('push_subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: text('created_at').notNull(),
});

export const notificationSettings = sqliteTable('notification_settings', {
  userId: text('user_id').primaryKey().references(() => users.id),
  emailEnabled: integer('email_enabled').notNull().default(1),
  pushEnabled: integer('push_enabled').notNull().default(1),
  warningDaysBefore: integer('warning_days_before').notNull().default(3),
  warningDayOf: integer('warning_day_of').notNull().default(1),
  preferredHour: integer('preferred_hour').notNull().default(8),
  updatedAt: text('updated_at').notNull(),
});

export type User = typeof users.$inferSelect;
export type PasskeyCredential = typeof passkeyCredentials.$inferSelect;
export type Stock = typeof stocks.$inferSelect;
export type StockMember = typeof stockMembers.$inferSelect;
export type StockInvite = typeof stockInvites.$inferSelect;
export type Item = typeof items.$inferSelect;
export type ItemHistory = typeof itemHistory.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NotificationSettings = typeof notificationSettings.$inferSelect;

