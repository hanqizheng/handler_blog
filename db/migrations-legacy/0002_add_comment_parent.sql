ALTER TABLE `comments` ADD `parent_id` int NULL;
--> statement-breakpoint
CREATE INDEX `comments_parent_id_idx` ON `comments` (`parent_id`);
