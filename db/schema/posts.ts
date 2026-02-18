import {
  index,
  int,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

import { postCategories } from "./post-categories";

export const posts = mysqlTable(
  "posts",
  {
    id: int("id").autoincrement().primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    coverImageUrl: varchar("cover_image_url", { length: 512 })
      .notNull()
      .default(""),
    content: text("content").notNull(),
    assetFolder: varchar("asset_folder", { length: 64 }).notNull().default(""),
    categoryId: int("category_id")
      .notNull()
      .default(1)
      .references(() => postCategories.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => ({
    categoryIdIdx: index("posts_category_id_idx").on(table.categoryId),
  }),
);
