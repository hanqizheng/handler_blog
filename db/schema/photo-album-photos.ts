import {
  index,
  int,
  mysqlTable,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

import { photoAlbums } from "./photo-albums";

export const photoAlbumPhotos = mysqlTable(
  "photo_album_photos",
  {
    id: int("id").autoincrement().primaryKey(),
    albumId: int("album_id")
      .notNull()
      .references(() => photoAlbums.id, { onDelete: "cascade" }),
    imageUrl: varchar("image_url", { length: 512 }).notNull(),
    imageKey: varchar("image_key", { length: 512 }).notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    albumIdIdx: index("photo_album_photos_album_id_idx").on(table.albumId),
  }),
);
