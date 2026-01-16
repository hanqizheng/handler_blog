CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`logo_url` varchar(512) NOT NULL DEFAULT '',
	`link_url` varchar(512) NOT NULL DEFAULT '',
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `site_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`display_name` varchar(128) NOT NULL DEFAULT '',
	`bio` text,
	`phone` varchar(64) NOT NULL DEFAULT '',
	`email` varchar(255) NOT NULL DEFAULT '',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `site_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `products_sort_order_idx` ON `products` (`sort_order`);
--> statement-breakpoint
CREATE INDEX `products_is_active_idx` ON `products` (`is_active`);
