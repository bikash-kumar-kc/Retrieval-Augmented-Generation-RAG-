CREATE TABLE `chunks` (
	`chunk_id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`chunk_index` integer NOT NULL,
	`text` text NOT NULL,
	`chunk_hash` text NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`embedded` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`document_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_chunks_doc_index` ON `chunks` (`document_id`,`chunk_index`);--> statement-breakpoint
CREATE INDEX `idx_chunks_pending` ON `chunks` (`document_id`,`embedded`);--> statement-breakpoint
CREATE TABLE `documents` (
	`document_id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`file_path` text NOT NULL,
	`file_hash` text NOT NULL,
	`dedup_key` text,
	`stage` text DEFAULT 'uploaded' NOT NULL,
	`status` text DEFAULT 'processing' NOT NULL,
	`error_message` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`chunk_count` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_documents_owner_created` ON `documents` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_documents_owner_hash` ON `documents` (`owner_id`,`file_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_documents_owner_dedup` ON `documents` (`owner_id`,`dedup_key`);--> statement-breakpoint
CREATE TABLE `parsed_documents` (
	`document_id` text PRIMARY KEY NOT NULL,
	`parser` text NOT NULL,
	`sections_json` text NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`document_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`user_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`purpose` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_email` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_userid` ON `users` (`user_id`);