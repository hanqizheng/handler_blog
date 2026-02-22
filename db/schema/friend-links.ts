import {
  index,
  int,
  mysqlTable,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const friendLinks = mysqlTable(
  "friend_links",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    url: varchar("url", { length: 512 }).notNull(),
    iconUrl: varchar("icon_url", { length: 512 }).notNull().default(""),
    sortOrder: int("sort_order").notNull().default(0),
    isActive: int("is_active").notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => ({
    sortOrderIdx: index("friend_links_sort_order_idx").on(table.sortOrder),
    isActiveIdx: index("friend_links_is_active_idx").on(table.isActive),
  }),
);
