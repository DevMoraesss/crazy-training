CREATE TABLE `cloud_backups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`data` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cloud_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`revision` integer NOT NULL,
	`fingerprint` text NOT NULL,
	`synced_at` integer NOT NULL
);
