CREATE TABLE `dev_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` integer NOT NULL,
	`conversation_id` integer NOT NULL,
	`title` text,
	`summary` text,
	`phases` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
