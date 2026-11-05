CREATE TABLE `meal_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`data` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `meal_entries_date_idx` ON `meal_entries` (`date`);--> statement-breakpoint
CREATE TABLE `meal_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `nutrition_targets` (
	`id` integer PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`updated_at` integer NOT NULL
);
