import {
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

import { posts } from "./posts";

export const comments = mysqlTable(
  "comments",
  {
    id: int("id").autoincrement().primaryKey(),
    postId: int("post_id").notNull().references(() => posts.id),
    parentId: int("parent_id"),
    content: text("content").notNull(),
    status: mysqlEnum("status", ["visible", "hidden", "spam"])
      .notNull()
      .default("visible"),
    ipHash: varchar("ip_hash", { length: 64 }).notNull(),
    userAgent: varchar("user_agent", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    postIdIdx: index("comments_post_id_idx").on(table.postId),
    postIdCreatedAtIdx: index("comments_post_id_created_at_idx").on(
      table.postId,
      table.createdAt,
    ),
    parentIdIdx: index("comments_parent_id_idx").on(table.parentId),
    ipHashCreatedAtIdx: index("comments_ip_hash_created_at_idx").on(
      table.ipHash,
      table.createdAt,
    ),
  }),
);
