CREATE TABLE `friend_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`url` varchar(512) NOT NULL,
	`icon_url` varchar(512) NOT NULL DEFAULT '',
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `friend_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `friend_links_sort_order_idx` ON `friend_links` (`sort_order`);
--> statement-breakpoint
CREATE INDEX `friend_links_is_active_idx` ON `friend_links` (`is_active`);
