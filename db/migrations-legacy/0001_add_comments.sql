CREATE TABLE `comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`post_id` int NOT NULL,
	`content` text NOT NULL,
	`status` enum('visible','hidden','spam') NOT NULL DEFAULT 'visible',
	`ip_hash` varchar(64) NOT NULL,
	`user_agent` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `comments_id` PRIMARY KEY(`id`),
	CONSTRAINT `comments_post_id_posts_id_fk` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`)
);
--> statement-breakpoint
CREATE INDEX `comments_post_id_idx` ON `comments` (`post_id`);
--> statement-breakpoint
CREATE INDEX `comments_post_id_created_at_idx` ON `comments` (`post_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `comments_ip_hash_created_at_idx` ON `comments` (`ip_hash`,`created_at`);
