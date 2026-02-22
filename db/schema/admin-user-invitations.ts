import {
  index,
  int,
  mysqlTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const adminUserInvitations = mysqlTable(
  "admin_user_invitations",
  {
    id: int("id").autoincrement().primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdBy: int("created_by").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    tokenHashUniqueIdx: uniqueIndex("admin_user_invitations_token_hash_unique").on(
      table.tokenHash,
    ),
    emailIdx: index("admin_user_invitations_email_idx").on(table.email),
    expiresAtIdx: index("admin_user_invitations_expires_at_idx").on(
      table.expiresAt,
    ),
    usedAtIdx: index("admin_user_invitations_used_at_idx").on(table.usedAt),
    createdByIdx: index("admin_user_invitations_created_by_idx").on(
      table.createdBy,
    ),
  }),
);
