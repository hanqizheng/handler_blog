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
ALTER TABLE `photo_album_photos` ADD CONSTRAINT `photo_album_photos_album_id_photo_albums_id_fk` FOREIGN KEY (`album_id`) REFERENCES `photo_albums`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `banners_sort_order_idx` ON `banners` (`sort_order`);--> statement-breakpoint
CREATE INDEX `banners_is_active_idx` ON `banners` (`is_active`);--> statement-breakpoint
CREATE INDEX `photo_album_photos_album_id_idx` ON `photo_album_photos` (`album_id`);