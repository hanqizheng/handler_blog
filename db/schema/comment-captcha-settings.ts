import { int, mysqlTable, timestamp } from "drizzle-orm/mysql-core";

export const commentCaptchaSettings = mysqlTable("comment_captcha_settings", {
  id: int("id").autoincrement().primaryKey(),
  isEnabled: int("is_enabled").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});
