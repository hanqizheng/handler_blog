import {
  index,
  int,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const products = mysqlTable(
  "products",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    logoUrl: varchar("logo_url", { length: 512 }).notNull().default(""),
    linkUrl: varchar("link_url", { length: 512 }).notNull().default(""),
    sortOrder: int("sort_order").notNull().default(0),
    isActive: int("is_active").notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => ({
    sortOrderIdx: index("products_sort_order_idx").on(table.sortOrder),
    isActiveIdx: index("products_is_active_idx").on(table.isActive),
  }),
);
