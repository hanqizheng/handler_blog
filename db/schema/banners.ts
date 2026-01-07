import {
  index,
  int,
  mysqlTable,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const banners = mysqlTable(
  "banners",
  {
    id: int("id").autoincrement().primaryKey(),
    imageUrl: varchar("image_url", { length: 512 }).notNull(),
    linkUrl: varchar("link_url", { length: 512 }).notNull().default(""),
    mainTitle: varchar("main_title", { length: 255 }).notNull().default(""),
    subTitle: varchar("sub_title", { length: 255 }).notNull().default(""),
    sortOrder: int("sort_order").notNull().default(0),
    isActive: int("is_active").notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => ({
    sortOrderIdx: index("banners_sort_order_idx").on(table.sortOrder),
    isActiveIdx: index("banners_is_active_idx").on(table.isActive),
  }),
);
