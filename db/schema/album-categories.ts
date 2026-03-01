import {
  index,
  int,
  mysqlTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const albumCategories = mysqlTable(
  "album_categories",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 64 }).notNull(),
    slug: varchar("slug", { length: 64 }).notNull(),
    sortOrder: int("sort_order").notNull().default(0),
    isActive: int("is_active").notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => ({
    nameUniqueIdx: uniqueIndex("album_categories_name_unique").on(table.name),
    slugUniqueIdx: uniqueIndex("album_categories_slug_unique").on(table.slug),
    sortOrderIdx: index("album_categories_sort_order_idx").on(table.sortOrder),
    isActiveIdx: index("album_categories_is_active_idx").on(table.isActive),
  }),
);
