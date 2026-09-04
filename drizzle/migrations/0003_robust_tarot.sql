CREATE TABLE `stocks` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`icon` text DEFAULT '📦' NOT NULL,
	`description` text,
	`owner_id` text NOT NULL,
	`calendar_token` text NOT NULL,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stocks_calendar_token_unique` ON `stocks` (`calendar_token`);--> statement-breakpoint
CREATE TABLE `stock_members` (
	`id` text PRIMARY KEY NOT NULL,
	`stock_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`nickname` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`stock_id`) REFERENCES `stocks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stock_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`stock_id` text NOT NULL,
	`code` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`created_by_user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_count` integer DEFAULT 0 NOT NULL,
	`max_uses` integer DEFAULT 10 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`stock_id`) REFERENCES `stocks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stock_invites_code_unique` ON `stock_invites` (`code`);--> statement-breakpoint
ALTER TABLE `item_history` ADD `replaced_by_user_id` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `items` ADD `stock_id` text REFERENCES stocks(id);--> statement-breakpoint
ALTER TABLE `items` ADD `created_by_user_id` text REFERENCES users(id);