CREATE TABLE `album_categories` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(64) NOT NULL,
  `slug` varchar(64) NOT NULL,
  `sort_order` int NOT NULL DEFAULT 0,
  `is_active` int NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `album_categories_id` PRIMARY KEY(`id`),
  CONSTRAINT `album_categories_name_unique` UNIQUE(`name`),
  CONSTRAINT `album_categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE INDEX `album_categories_sort_order_idx` ON `album_categories` (`sort_order`);
--> statement-breakpoint
CREATE INDEX `album_categories_is_active_idx` ON `album_categories` (`is_active`);
--> statement-breakpoint
INSERT INTO `album_categories` (`name`, `slug`, `sort_order`, `is_active`) VALUES ('未分类', 'uncategorized', 0, 1);
--> statement-breakpoint
ALTER TABLE `photo_albums` ADD `category_id` int NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `photo_albums` ADD CONSTRAINT `photo_albums_category_id_album_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `album_categories`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `photo_albums_category_id_idx` ON `photo_albums` (`category_id`);
