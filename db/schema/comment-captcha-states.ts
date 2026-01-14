import {
  index,
  int,
  mysqlTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const commentCaptchaStates = mysqlTable(
  "comment_captcha_states",
  {
    id: int("id").autoincrement().primaryKey(),
    ipHash: varchar("ip_hash", { length: 64 }).notNull(),
    deviceId: varchar("device_id", { length: 64 }).notNull(),
    triggerCount: int("trigger_count").notNull().default(0),
    verifiedUntil: timestamp("verified_until"),
    blockedUntil: timestamp("blocked_until"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => ({
    ipHashIdx: index("comment_captcha_states_ip_hash_idx").on(table.ipHash),
    blockedUntilIdx: index("comment_captcha_states_blocked_until_idx").on(
      table.blockedUntil,
    ),
    ipHashDeviceIdIdx: uniqueIndex(
      "comment_captcha_states_ip_hash_device_id_uidx",
    ).on(table.ipHash, table.deviceId),
  }),
);
