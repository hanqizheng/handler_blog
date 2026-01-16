CREATE TABLE `posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`cover_image_url` varchar(512) NOT NULL DEFAULT '',
	`content` text NOT NULL,
	`asset_folder` varchar(64) NOT NULL DEFAULT '',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`post_id` int NOT NULL,
	`parent_id` int,
	`content` text NOT NULL,
	`status` enum('visible','hidden','spam') NOT NULL DEFAULT 'visible',
	`ip_hash` varchar(64) NOT NULL,
	`user_agent` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `comment_captcha_states` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ip_hash` varchar(64) NOT NULL,
	`device_id` varchar(64) NOT NULL,
	`trigger_count` int NOT NULL DEFAULT 0,
	`verified_until` timestamp,
	`blocked_until` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `comment_captcha_states_id` PRIMARY KEY(`id`),
	CONSTRAINT `comment_captcha_states_ip_hash_device_id_uidx` UNIQUE(`ip_hash`,`device_id`)
);
--> statement-breakpoint
CREATE TABLE `comment_captcha_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`is_enabled` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `comment_captcha_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admin_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`totp_secret` varchar(64) NOT NULL DEFAULT '',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `banners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`image_url` varchar(512) NOT NULL,
	`link_url` varchar(512) NOT NULL DEFAULT '',
	`main_title` varchar(255) NOT NULL DEFAULT '',
	`sub_title` varchar(255) NOT NULL DEFAULT '',
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `banners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `photo_albums` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`slug` varchar(128) NOT NULL,
	`description` text,
	`cover_url` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `photo_albums_id` PRIMARY KEY(`id`),
	CONSTRAINT `photo_albums_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `photo_album_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`album_id` int NOT NULL,
	`image_url` varchar(512) NOT NULL,
	`image_key` varchar(512) NOT NULL DEFAULT '',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `photo_album_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
	`role_title` varchar(255) NOT NULL DEFAULT '',
	`bio` text,
	`phone` varchar(64) NOT NULL DEFAULT '',
	`email` varchar(255) NOT NULL DEFAULT '',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `site_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_post_id_posts_id_fk` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `photo_album_photos` ADD CONSTRAINT `photo_album_photos_album_id_photo_albums_id_fk` FOREIGN KEY (`album_id`) REFERENCES `photo_albums`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `comments_post_id_idx` ON `comments` (`post_id`);--> statement-breakpoint
CREATE INDEX `comments_post_id_created_at_idx` ON `comments` (`post_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `comments_parent_id_idx` ON `comments` (`parent_id`);--> statement-breakpoint
CREATE INDEX `comments_ip_hash_created_at_idx` ON `comments` (`ip_hash`,`created_at`);--> statement-breakpoint
CREATE INDEX `comment_captcha_states_ip_hash_idx` ON `comment_captcha_states` (`ip_hash`);--> statement-breakpoint
CREATE INDEX `comment_captcha_states_blocked_until_idx` ON `comment_captcha_states` (`blocked_until`);--> statement-breakpoint
CREATE INDEX `banners_sort_order_idx` ON `banners` (`sort_order`);--> statement-breakpoint
CREATE INDEX `banners_is_active_idx` ON `banners` (`is_active`);--> statement-breakpoint
CREATE INDEX `photo_album_photos_album_id_idx` ON `photo_album_photos` (`album_id`);--> statement-breakpoint
CREATE INDEX `products_sort_order_idx` ON `products` (`sort_order`);--> statement-breakpoint
CREATE INDEX `products_is_active_idx` ON `products` (`is_active`);