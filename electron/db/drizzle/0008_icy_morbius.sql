CREATE TABLE `app_files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`app_id` integer NOT NULL,
	`file_path` text NOT NULL,
	`file_name` text NOT NULL,
	`content` text,
	`file_type` text NOT NULL,
	`parent_path` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`app_id` integer NOT NULL,
	`title` text,
	`initial_commit_hash` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
DROP TABLE `chats`;--> statement-breakpoint
DROP TABLE `language_model_providers`;--> statement-breakpoint
DROP TABLE `language_models`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`conversation_id` integer NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`file_changes` text,
	`approval_state` text,
	`commit_hash` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_messages`("id", "conversation_id", "role", "content", "approval_state", "commit_hash", "created_at") SELECT "id", "chat_id", "role", "content", "approval_state", "commit_hash", "created_at" FROM `messages`;--> statement-breakpoint
DROP TABLE `messages`;--> statement-breakpoint
ALTER TABLE `__new_messages` RENAME TO `messages`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `apps` ADD `description` text;--> statement-breakpoint
ALTER TABLE `apps` DROP COLUMN `github_org`;--> statement-breakpoint
ALTER TABLE `apps` DROP COLUMN `github_repo`;--> statement-breakpoint
ALTER TABLE `apps` DROP COLUMN `github_branch`;--> statement-breakpoint
ALTER TABLE `apps` DROP COLUMN `supabase_project_id`;