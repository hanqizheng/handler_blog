import {
  index,
  int,
  mysqlTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const postCategories = mysqlTable(
  "post_categories",
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
    nameUniqueIdx: uniqueIndex("post_categories_name_unique").on(table.name),
    slugUniqueIdx: uniqueIndex("post_categories_slug_unique").on(table.slug),
    sortOrderIdx: index("post_categories_sort_order_idx").on(table.sortOrder),
    isActiveIdx: index("post_categories_is_active_idx").on(table.isActive),
  }),
);
