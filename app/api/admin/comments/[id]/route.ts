import { eq } from "drizzle-orm";

import { db } from "@/db";
import { comments } from "@/db/schema";
import { normalizeCommentContent } from "@/utils/comments";

export const runtime = "nodejs";

const STATUSES = ["visible", "hidden", "spam"] as const;

function parseId(rawId: string) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (!id) {
    return Response.json({ ok: false, error: "id 无效" }, { status: 400 });
  }

  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const data = payload as { content?: unknown; status?: unknown };
  const rawContent = typeof data?.content === "string" ? data.content : "";
  const content = normalizeCommentContent(rawContent);

  if (!content) {
    return Response.json({ ok: false, error: "内容不能为空" }, { status: 400 });
  }

  const statusInput = typeof data?.status === "string" ? data.status : "";
  const status = STATUSES.includes(statusInput as (typeof STATUSES)[number])
    ? (statusInput as (typeof STATUSES)[number])
    : null;

  await db
    .update(comments)
    .set({ content, ...(status ? { status } : {}) })
    .where(eq(comments.id, id));

  return Response.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (!id) {
    return Response.json({ ok: false, error: "id 无效" }, { status: 400 });
  }

  await db.delete(comments).where(eq(comments.parentId, id));
  await db.delete(comments).where(eq(comments.id, id));

  return Response.json({ ok: true });
}
