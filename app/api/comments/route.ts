import { createHash } from "crypto";
import { and, asc, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { comments, posts } from "@/db/schema";
import { normalizeCommentContent } from "@/utils/comments";

export const runtime = "nodejs";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

const RATE_LIMIT_SHORT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_SHORT_MAX = 3;
const RATE_LIMIT_LONG_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_LONG_MAX = 10;

function parsePositiveInt(value: string | null) {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }

  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-vercel-forwarded-for")
  );
}

function hashIp(ip: string) {
  const salt = process.env.COMMENT_IP_SALT ?? "dev-salt";
  return createHash("sha256").update(`${ip}:${salt}`).digest("hex");
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }
  const host = request.headers.get("host");
  if (!host) {
    return false;
  }
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

async function isRateLimited(ipHash: string) {
  const now = Date.now();
  const shortWindowStart = new Date(now - RATE_LIMIT_SHORT_WINDOW_MS);
  const longWindowStart = new Date(now - RATE_LIMIT_LONG_WINDOW_MS);

  const [shortWindow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(comments)
    .where(
      and(eq(comments.ipHash, ipHash), gte(comments.createdAt, shortWindowStart)),
    );

  if (Number(shortWindow?.count ?? 0) >= RATE_LIMIT_SHORT_MAX) {
    return true;
  }

  const [longWindow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(comments)
    .where(
      and(eq(comments.ipHash, ipHash), gte(comments.createdAt, longWindowStart)),
    );

  return Number(longWindow?.count ?? 0) >= RATE_LIMIT_LONG_MAX;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const postId = parsePositiveInt(url.searchParams.get("postId"));
  if (!postId) {
    return Response.json({ ok: false, error: "postId 无效" }, { status: 400 });
  }

  const page = parsePositiveInt(url.searchParams.get("page")) ?? 1;
  const limitParam = parsePositiveInt(url.searchParams.get("limit"));
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, limitParam ?? DEFAULT_PAGE_SIZE),
  );
  const offset = (page - 1) * limit;

  const items = await db
    .select({
      id: comments.id,
      content: comments.content,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .where(
      and(
        eq(comments.postId, postId),
        eq(comments.status, "visible"),
        isNull(comments.parentId),
      ),
    )
    .orderBy(desc(comments.createdAt))
    .limit(limit)
    .offset(offset);

  const parentIds = items.map((item) => item.id);
  const replies =
    parentIds.length === 0
      ? []
      : await db
          .select({
            id: comments.id,
            parentId: comments.parentId,
            content: comments.content,
            createdAt: comments.createdAt,
          })
          .from(comments)
          .where(
            and(
              eq(comments.postId, postId),
              eq(comments.status, "visible"),
              inArray(comments.parentId, parentIds),
            ),
          )
          .orderBy(asc(comments.createdAt));

  const replyMap = new Map<number, typeof replies>();
  for (const reply of replies) {
    const parentId = reply.parentId ?? 0;
    if (!replyMap.has(parentId)) {
      replyMap.set(parentId, []);
    }
    replyMap.get(parentId)?.push(reply);
  }

  const itemsWithReplies = items.map((item) => ({
    ...item,
    replies: replyMap.get(item.id) ?? [],
  }));

  return Response.json({ ok: true, items: itemsWithReplies });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ ok: false, error: "来源无效" }, { status: 403 });
  }

  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const data = payload as {
    postId?: unknown;
    content?: unknown;
    website?: unknown;
  };

  const rawPostId =
    typeof data?.postId === "number"
      ? data.postId
      : typeof data?.postId === "string"
        ? Number(data.postId)
        : NaN;
  const postId = Number.isInteger(rawPostId) && rawPostId > 0 ? rawPostId : null;

  const honeypot =
    typeof data?.website === "string" ? data.website.trim() : "";
  if (honeypot) {
    return Response.json({ ok: false, error: "检测到异常提交" }, { status: 400 });
  }

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

  const ip = getClientIp(request) ?? "unknown";
  const ipHash = hashIp(ip);

  if (await isRateLimited(ipHash)) {
    return Response.json({ ok: false, error: "请求过于频繁" }, { status: 429 });
  }

  const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 255);

  const insertResult = await db.insert(comments).values({
    postId,
    parentId: null,
    content,
    ipHash,
    userAgent,
  });

  const insertedId = Number(
    (insertResult as { insertId?: number | bigint }).insertId ?? 0,
  );
  let item = {
    id: insertedId,
    content,
    createdAt: new Date().toISOString(),
    replies: [],
  };

  if (insertedId) {
    const [fresh] = await db
      .select({
        id: comments.id,
        content: comments.content,
        createdAt: comments.createdAt,
      })
      .from(comments)
      .where(eq(comments.id, insertedId))
      .limit(1);
    if (fresh) {
      item = {
        ...fresh,
        createdAt: fresh.createdAt.toISOString(),
        replies: [],
      };
    }
  }

  return Response.json({ ok: true, item });
}
