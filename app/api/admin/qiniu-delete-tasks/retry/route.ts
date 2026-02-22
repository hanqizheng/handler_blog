import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { qiniuDeleteTasks } from "@/db/schema";
import { getAdminSession } from "@/lib/admin-auth";
import { createBucketManager, getServerQiniuConfig } from "@/lib/qiniu";

export const runtime = "nodejs";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
type QiniuDeleteTaskStatus = (typeof qiniuDeleteTasks.$inferSelect)["status"];
const DEFAULT_RETRYABLE_STATUSES: QiniuDeleteTaskStatus[] = [
  "pending",
  "failed",
];
const EXPLICIT_RETRYABLE_STATUSES: QiniuDeleteTaskStatus[] = [
  "pending",
  "failed",
  "processing",
];

const parsePositiveId = (value: unknown) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
};

const parseLimit = (value: unknown) => {
  if (value === undefined) return DEFAULT_LIMIT;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return Math.min(parsed, MAX_LIMIT);
};

const parseTaskIds = (value: unknown) => {
  if (value === undefined) {
    return { hasInput: false, taskIds: [] as number[] };
  }
  if (!Array.isArray(value)) {
    return { hasInput: true, error: "taskIds must be an array" as const };
  }

  const parsedList = value.map((item) => parsePositiveId(item));
  if (parsedList.some((item) => item === null)) {
    return { hasInput: true, error: "taskIds contains invalid id" as const };
  }

  const parsed = Array.from(new Set(parsedList as number[]));

  if (parsed.length === 0) {
    return { hasInput: true, error: "taskIds is empty" as const };
  }

  return { hasInput: true, taskIds: parsed };
};

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const body = payload as { taskIds?: unknown; limit?: unknown };
  const parsedTaskIds = parseTaskIds(body?.taskIds);
  if ("error" in parsedTaskIds) {
    return NextResponse.json(
      { ok: false, error: parsedTaskIds.error },
      { status: 400 },
    );
  }

  const limit = parseLimit(body?.limit);
  if (limit === null) {
    return NextResponse.json(
      { ok: false, error: "invalid limit" },
      { status: 400 },
    );
  }

  const tasks = parsedTaskIds.hasInput
    ? await db
        .select()
        .from(qiniuDeleteTasks)
        .where(
          and(
            inArray(qiniuDeleteTasks.id, parsedTaskIds.taskIds),
            inArray(qiniuDeleteTasks.status, EXPLICIT_RETRYABLE_STATUSES),
          ),
        )
        .orderBy(asc(qiniuDeleteTasks.createdAt))
    : await db
        .select()
        .from(qiniuDeleteTasks)
        .where(inArray(qiniuDeleteTasks.status, DEFAULT_RETRYABLE_STATUSES))
        .orderBy(asc(qiniuDeleteTasks.createdAt))
        .limit(limit);

  if (tasks.length === 0) {
    return NextResponse.json({
      ok: true,
      total: 0,
      successCount: 0,
      failedCount: 0,
      failedTaskIds: [],
    });
  }

  let qiniuConfig: ReturnType<typeof getServerQiniuConfig>;
  try {
    qiniuConfig = getServerQiniuConfig();
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "配置缺失",
      },
      { status: 500 },
    );
  }

  const bucketManager = createBucketManager(qiniuConfig);
  let successCount = 0;
  let failedCount = 0;
  const failedTaskIds: number[] = [];

  for (const task of tasks) {
    await db
      .update(qiniuDeleteTasks)
      .set({ status: "processing" })
      .where(eq(qiniuDeleteTasks.id, task.id));

    let failedError = "";

    try {
      const { resp } = await bucketManager.delete(qiniuConfig.bucket, task.objectKey);
      const statusCode = resp.statusCode ?? 500;
      const responseData = (resp as { data?: { error?: string } }).data;
      if (statusCode !== 200 && statusCode !== 612) {
        failedError = responseData?.error || `delete failed (${statusCode})`;
      }
    } catch (error) {
      failedError = error instanceof Error ? error.message : "delete failed";
    }

    if (failedError) {
      failedCount += 1;
      failedTaskIds.push(task.id);
      await db
        .update(qiniuDeleteTasks)
        .set({
          status: "failed",
          attempts: sql`${qiniuDeleteTasks.attempts} + 1`,
          lastError: failedError,
        })
        .where(eq(qiniuDeleteTasks.id, task.id));
      continue;
    }

    successCount += 1;
    await db
      .update(qiniuDeleteTasks)
      .set({
        status: "done",
        attempts: sql`${qiniuDeleteTasks.attempts} + 1`,
        lastError: null,
      })
      .where(eq(qiniuDeleteTasks.id, task.id));
  }

  return NextResponse.json({
    ok: true,
    total: tasks.length,
    successCount,
    failedCount,
    failedTaskIds,
  });
}
