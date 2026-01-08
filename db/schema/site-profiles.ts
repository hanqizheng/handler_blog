import {
  int,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const siteProfiles = mysqlTable("site_profiles", {
  id: int("id").autoincrement().primaryKey(),
  displayName: varchar("display_name", { length: 128 })
    .notNull()
    .default(""),
  bio: text("bio"),
  phone: varchar("phone", { length: 64 }).notNull().default(""),
  email: varchar("email", { length: 255 }).notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});
