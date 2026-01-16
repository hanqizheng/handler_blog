CREATE TABLE `comment_captcha_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`is_enabled` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `comment_captcha_settings_id` PRIMARY KEY(`id`)
);
