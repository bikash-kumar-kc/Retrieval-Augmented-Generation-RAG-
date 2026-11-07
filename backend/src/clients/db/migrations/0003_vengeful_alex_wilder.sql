CREATE TABLE `conversation_messages` (
	`message_id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`document_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`citations` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_conversation_owner_doc` ON `conversation_messages` (`owner_id`,`document_id`,`created_at`);