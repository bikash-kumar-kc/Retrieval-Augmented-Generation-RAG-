CREATE TABLE `user_credentials` (
	`owner_id` text NOT NULL,
	`provider` text NOT NULL,
	`secret_blob` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_owner_provide` ON `user_credentials` (`owner_id`,`provider`);