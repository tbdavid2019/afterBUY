ALTER TABLE `notification_settings` ADD COLUMN `cycle_expiry_alert` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `notification_settings` ADD COLUMN `stock_low_alert` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `notification_settings` ADD COLUMN `usage_low_alert` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `notification_settings` ADD COLUMN `expiry_warning_days` integer DEFAULT 7 NOT NULL;