CREATE TABLE `comment_captcha_states` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ip_hash` varchar(64) NOT NULL,
	`device_id` varchar(64) NOT NULL,
	`trigger_count` int NOT NULL DEFAULT 0,
	`verified_until` timestamp NULL,
	`blocked_until` timestamp NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `comment_captcha_states_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `comment_captcha_states_ip_hash_idx` ON `comment_captcha_states` (`ip_hash`);
--> statement-breakpoint
CREATE INDEX `comment_captcha_states_blocked_until_idx` ON `comment_captcha_states` (`blocked_until`);
--> statement-breakpoint
CREATE UNIQUE INDEX `comment_captcha_states_ip_hash_device_id_uidx` ON `comment_captcha_states` (`ip_hash`,`device_id`);
