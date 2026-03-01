ALTER TABLE `comments` MODIFY `post_id` int NULL;
--> statement-breakpoint
ALTER TABLE `comments` ADD `album_id` int NULL;
--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_album_id_photo_albums_id_fk`
  FOREIGN KEY (`album_id`) REFERENCES `photo_albums`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
--> statement-breakpoint
CREATE INDEX `comments_album_id_idx` ON `comments` (`album_id`);
--> statement-breakpoint
CREATE INDEX `comments_album_id_created_at_idx` ON `comments` (`album_id`, `created_at`);
