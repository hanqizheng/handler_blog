import {
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const QINIU_DELETE_TASK_RESOURCE_TYPES = [
  "album_cover",
  "album_photo",
] as const;
export type QiniuDeleteTaskResourceType =
  (typeof QINIU_DELETE_TASK_RESOURCE_TYPES)[number];

export const QINIU_DELETE_TASK_STATUSES = [
  "pending",
  "processing",
  "done",
  "failed",
] as const;
export type QiniuDeleteTaskStatus = (typeof QINIU_DELETE_TASK_STATUSES)[number];

export const qiniuDeleteTasks = mysqlTable(
  "qiniu_delete_tasks",
  {
    id: int("id").autoincrement().primaryKey(),
    resourceType: mysqlEnum("resource_type", [
      "album_cover",
      "album_photo",
    ]).notNull(),
    resourceId: int("resource_id"),
    objectKey: varchar("object_key", { length: 512 }).notNull(),
    status: mysqlEnum("status", ["pending", "processing", "done", "failed"])
      .notNull()
      .default("pending"),
    attempts: int("attempts").notNull().default(0),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => ({
    statusCreatedAtIdx: index("qiniu_delete_tasks_status_created_at_idx").on(
      table.status,
      table.createdAt,
    ),
    objectKeyIdx: index("qiniu_delete_tasks_object_key_idx").on(table.objectKey),
  }),
);
