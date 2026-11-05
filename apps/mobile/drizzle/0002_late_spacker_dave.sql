CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`data` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `activities_date_idx` ON `activities` (`date`);