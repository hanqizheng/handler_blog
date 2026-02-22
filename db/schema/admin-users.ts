import {
  index,
  int,
  mysqlEnum,
  mysqlTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const ADMIN_USER_ROLES = ["owner", "admin"] as const;
export type AdminUserRole = (typeof ADMIN_USER_ROLES)[number];

export const adminUsers = mysqlTable(
  "admin_users",
  {
    id: int("id").autoincrement().primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    totpSecret: varchar("totp_secret", { length: 64 }).notNull().default(""),
    role: mysqlEnum("role", ["owner", "admin"]).notNull().default("admin"),
    createdBy: int("created_by"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => ({
    emailIdx: uniqueIndex("admin_users_email_unique").on(table.email),
    roleIdx: index("admin_users_role_idx").on(table.role),
    createdByIdx: index("admin_users_created_by_idx").on(table.createdBy),
  }),
);
