CREATE TABLE `item_history` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`user_id` text NOT NULL,
	`replaced_at` text NOT NULL,
	`previous_start_date` text NOT NULL,
	`stock_after_replace` integer NOT NULL,
	`notes` text,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text DEFAULT 'general' NOT NULL,
	`tracking_mode` text DEFAULT 'cycle' NOT NULL,
	`cycle_days` integer,
	`start_date` text NOT NULL,
	`pao_months` integer,
	`expiry_date` text,
	`warranty_date` text,
	`backup_stock` integer DEFAULT 0 NOT NULL,
	`min_stock_alert` integer DEFAULT 1 NOT NULL,
	`notes` text,
	`image_url` text,
	`calendar_sequence` integer DEFAULT 0 NOT NULL,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notification_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email_enabled` integer DEFAULT 1 NOT NULL,
	`push_enabled` integer DEFAULT 1 NOT NULL,
	`warning_days_before` integer DEFAULT 3 NOT NULL,
	`warning_day_of` integer DEFAULT 1 NOT NULL,
	`preferred_hour` integer DEFAULT 8 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `passkey_credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`public_key` text NOT NULL,
	`counter` integer DEFAULT 0 NOT NULL,
	`device_name` text DEFAULT 'My Device' NOT NULL,
	`transports` text,
	`created_at` text NOT NULL,
	`last_used_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_endpoint_unique` ON `push_subscriptions` (`endpoint`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`calendar_token` text NOT NULL,
	`is_vip` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_calendar_token_unique` ON `users` (`calendar_token`);