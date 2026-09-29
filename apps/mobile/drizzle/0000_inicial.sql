CREATE TABLE `profile` (
	`id` integer PRIMARY KEY NOT NULL,
	`weight_kg` real,
	`height_cm` real,
	`birth_year` integer,
	`goal` text,
	`level` text,
	`days_per_week` integer,
	`equipment` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `programs` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`active` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `session_sets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`exercise_index` integer NOT NULL,
	`exercise_key` text NOT NULL,
	`set_number` integer NOT NULL,
	`reps` integer NOT NULL,
	`load_kg` real,
	`completed_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `session_sets_session_idx` ON `session_sets` (`session_id`);--> statement-breakpoint
CREATE INDEX `session_sets_exercise_idx` ON `session_sets` (`exercise_key`,`completed_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text,
	`workout_index` integer NOT NULL,
	`plan` text NOT NULL,
	`skipped` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`calories` integer
);
--> statement-breakpoint
CREATE INDEX `sessions_program_idx` ON `sessions` (`program_id`,`finished_at`);