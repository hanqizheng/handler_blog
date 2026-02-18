CREATE TABLE `post_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(64) NOT NULL,
	`slug` varchar(64) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `post_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `post_categories_name_unique` UNIQUE(`name`),
	CONSTRAINT `post_categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE INDEX `post_categories_sort_order_idx` ON `post_categories` (`sort_order`);
--> statement-breakpoint
CREATE INDEX `post_categories_is_active_idx` ON `post_categories` (`is_active`);
--> statement-breakpoint
INSERT INTO `post_categories` (`name`, `slug`, `sort_order`, `is_active`)
VALUES ('未分类', 'uncategorized', 0, 1);
--> statement-breakpoint
ALTER TABLE `posts` ADD `category_id` int NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `posts` ADD CONSTRAINT `posts_category_id_post_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `post_categories`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `posts_category_id_idx` ON `posts` (`category_id`);
