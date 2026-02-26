CREATE TABLE `qiniu_delete_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`resource_type` enum('album_cover','album_photo') NOT NULL,
	`resource_id` int,
	`object_key` varchar(512) NOT NULL,
	`status` enum('pending','processing','done','failed') NOT NULL DEFAULT 'pending',
	`attempts` int NOT NULL DEFAULT 0,
	`last_error` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `qiniu_delete_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `qiniu_delete_tasks_status_created_at_idx` ON `qiniu_delete_tasks` (`status`,`created_at`);
--> statement-breakpoint
CREATE INDEX `qiniu_delete_tasks_object_key_idx` ON `qiniu_delete_tasks` (`object_key`);
