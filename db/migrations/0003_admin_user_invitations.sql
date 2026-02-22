ALTER TABLE `admin_users` ADD `role` enum('owner','admin') NOT NULL DEFAULT 'admin';
--> statement-breakpoint
ALTER TABLE `admin_users` ADD `created_by` int;
--> statement-breakpoint
CREATE INDEX `admin_users_role_idx` ON `admin_users` (`role`);
--> statement-breakpoint
CREATE INDEX `admin_users_created_by_idx` ON `admin_users` (`created_by`);
--> statement-breakpoint
UPDATE `admin_users`
SET `role` = 'owner'
WHERE `id` = (
  SELECT `first_owner`.`id`
  FROM (
    SELECT `id`
    FROM `admin_users`
    ORDER BY `id` ASC
    LIMIT 1
  ) AS `first_owner`
);
--> statement-breakpoint
CREATE TABLE `admin_user_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp NULL,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_user_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_user_invitations_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE INDEX `admin_user_invitations_email_idx` ON `admin_user_invitations` (`email`);
--> statement-breakpoint
CREATE INDEX `admin_user_invitations_expires_at_idx` ON `admin_user_invitations` (`expires_at`);
--> statement-breakpoint
CREATE INDEX `admin_user_invitations_used_at_idx` ON `admin_user_invitations` (`used_at`);
--> statement-breakpoint
CREATE INDEX `admin_user_invitations_created_by_idx` ON `admin_user_invitations` (`created_by`);
