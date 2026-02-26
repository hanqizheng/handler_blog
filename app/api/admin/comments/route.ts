import { eq } from "drizzle-orm";

import { db } from "@/db";
import { comments, posts } from "@/db/schema";
import { getAdminSession } from "@/lib/admin-auth";
import { normalizeCommentContent } from "@/utils/comments";

export const runtime = "nodejs";

const STATUSES = ["visible", "hidden", "spam"] as const;

function parseId(value: unknown) {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return Response.json(
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

  const data = payload as {
    postId?: unknown;
    parentId?: unknown;
    content?: unknown;
    status?: unknown;
  };

  const postId = parseId(data?.postId);
  const parentId = parseId(data?.parentId);
  const rawContent = typeof data?.content === "string" ? data.content : "";
  const content = normalizeCommentContent(rawContent);

  if (!postId || !content) {
    return Response.json(
      { ok: false, error: "postId 和内容不能为空" },
      { status: 400 },
    );
  }

  const [post] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);
  if (!post) {
    return Response.json({ ok: false, error: "文章不存在" }, { status: 404 });
  }

  let parent: { id: number; postId: number; parentId: number | null } | null =
    null;
  if (parentId) {
    const [parentItem] = await db
      .select({
        id: comments.id,
        postId: comments.postId,
        parentId: comments.parentId,
      })
      .from(comments)
      .where(eq(comments.id, parentId))
      .limit(1);
    if (!parentItem) {
      return Response.json({ ok: false, error: "父评论不存在" }, { status: 404 });
    }
    if (parentItem.postId !== postId) {
      return Response.json(
        { ok: false, error: "父评论与文章不匹配" },
        { status: 400 },
      );
    }
    if (parentItem.parentId) {
      return Response.json(
        { ok: false, error: "暂不支持多级回复" },
        { status: 400 },
      );
    }
    parent = parentItem;
  }

  const statusInput = typeof data?.status === "string" ? data.status : "";
  const status = STATUSES.includes(statusInput as (typeof STATUSES)[number])
    ? (statusInput as (typeof STATUSES)[number])
    : "visible";

  await db.insert(comments).values({
    postId,
    parentId: parent?.id ?? null,
    content,
    status,
    ipHash: "admin",
    userAgent: "admin",
  });

  return Response.json({ ok: true });
}
