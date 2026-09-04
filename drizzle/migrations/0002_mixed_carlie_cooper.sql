ALTER TABLE `items` ADD `location` text;--> statement-breakpoint
ALTER TABLE `items` ADD `is_stored` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `items` ADD `snooze_until` text;