import {
  index,
  int,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { albumCategories } from "./album-categories";

export const photoAlbums = mysqlTable(
  "photo_albums",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 128 }).notNull(),
    slug: varchar("slug", { length: 128 }).notNull(),
    description: text("description"),
    coverUrl: text("cover_url"),
    categoryId: int("category_id")
      .notNull()
      .default(1)
      .references(() => albumCategories.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => ({
    slugIdx: uniqueIndex("photo_albums_slug_unique").on(table.slug),
    categoryIdIdx: index("photo_albums_category_id_idx").on(table.categoryId),
  }),
);
