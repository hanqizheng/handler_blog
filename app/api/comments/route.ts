import { createHash } from "crypto";
import { cookies } from "next/headers";
import { and, asc, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  commentCaptchaSettings,
  commentCaptchaStates,
  comments,
  posts,
} from "@/db/schema";
import { verifyAliyunCaptcha } from "@/lib/aliyun-captcha";
import {
  COMMENT_DEVICE_COOKIE_NAME,
  buildCommentDeviceClearCookie,
  buildCommentDeviceCookie,
  createCommentDeviceId,
  parseCommentDeviceToken,
  signCommentDeviceId,
} from "@/lib/comment-device";
import { normalizeCommentContent } from "@/utils/comments";

export const runtime = "nodejs";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

const RATE_LIMIT_SHORT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_SHORT_MAX = 3;
const RATE_LIMIT_LONG_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_LONG_MAX = 10;
const RATE_LIMIT_DISABLED = process.env.COMMENT_RATE_LIMIT_DISABLED === "true";

const CAPTCHA_VERIFY_TTL_MS = 2 * 60 * 60 * 1000;
const CAPTCHA_BLOCK_SCHEDULE_MS = [
  0,
  2 * 60 * 1000,
  10 * 60 * 1000,
  60 * 60 * 1000,
  24 * 60 * 60 * 1000,
];
const CAPTCHA_RISK_SHORT_WINDOW_MS = RATE_LIMIT_SHORT_WINDOW_MS;
const CAPTCHA_RISK_SHORT_LIMIT = 2;
const CAPTCHA_RISK_LONG_WINDOW_MS = RATE_LIMIT_LONG_WINDOW_MS;
const CAPTCHA_RISK_LONG_LIMIT = 6;
const CAPTCHA_IP_ONLY_DEVICE = "ip-only";

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

const normalizeClientIp = (ip: string | null) => {
  if (!ip) return null;
  const trimmed = ip.trim();
  const withoutMapped = trimmed.startsWith("::ffff:")
    ? trimmed.slice("::ffff:".length)
    : trimmed;
  if (withoutMapped === "::1") {
    return "127.0.0.1";
  }
  return withoutMapped;
};

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim() ?? null;
    return normalizeClientIp(first);
  }

  return normalizeClientIp(
    request.headers.get("x-real-ip") ??
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-vercel-forwarded-for"),
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

type CommentCounts = { shortCount: number; longCount: number };

async function getCommentCounts(ipHash: string): Promise<CommentCounts> {
  const shortWindowSeconds = Math.max(
    1,
    Math.round(CAPTCHA_RISK_SHORT_WINDOW_MS / 1000),
  );
  const longWindowSeconds = Math.max(
    1,
    Math.round(CAPTCHA_RISK_LONG_WINDOW_MS / 1000),
  );
  const shortWindowExpr = sql.raw(
    `DATE_SUB(NOW(), INTERVAL ${shortWindowSeconds} SECOND)`,
  );
  const longWindowExpr = sql.raw(
    `DATE_SUB(NOW(), INTERVAL ${longWindowSeconds} SECOND)`,
  );

  // Use database time to avoid timezone drift between app and MySQL.
  const [[shortWindow], [longWindow]] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(comments)
      .where(
        and(
          eq(comments.ipHash, ipHash),
          sql`${comments.createdAt} >= ${shortWindowExpr}`,
        ),
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(comments)
      .where(
        and(
          eq(comments.ipHash, ipHash),
          sql`${comments.createdAt} >= ${longWindowExpr}`,
        ),
      ),
  ]);

  return {
    shortCount: Number(shortWindow?.count ?? 0),
    longCount: Number(longWindow?.count ?? 0),
  };
}

function isRateLimited(counts: CommentCounts) {
  return (
    counts.shortCount >= RATE_LIMIT_SHORT_MAX ||
    counts.longCount >= RATE_LIMIT_LONG_MAX
  );
}

function isCaptchaRisk(counts: CommentCounts) {
  return (
    counts.shortCount >= CAPTCHA_RISK_SHORT_LIMIT ||
    counts.longCount >= CAPTCHA_RISK_LONG_LIMIT
  );
}

function resolveCaptchaBlockedUntil(triggerCount: number, now: Date) {
  if (triggerCount <= 0) {
    return null;
  }
  const index = Math.min(triggerCount, CAPTCHA_BLOCK_SCHEDULE_MS.length) - 1;
  const duration = CAPTCHA_BLOCK_SCHEDULE_MS[index] ?? 0;
  if (duration <= 0) {
    return null;
  }
  return new Date(now.getTime() + duration);
}

async function isCommentCaptchaEnabled() {
  const [setting] = await db
    .select({ isEnabled: commentCaptchaSettings.isEnabled })
    .from(commentCaptchaSettings)
    .orderBy(desc(commentCaptchaSettings.id))
    .limit(1);

  return (setting?.isEnabled ?? 0) === 1;
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
      isAdmin: sql<number>`case when ${comments.ipHash} = 'admin' or ${comments.userAgent} = 'admin' then 1 else 0 end`,
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
            isAdmin: sql<number>`case when ${comments.ipHash} = 'admin' or ${comments.userAgent} = 'admin' then 1 else 0 end`,
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

  const normalizedReplies = replies.map((reply) => ({
    ...reply,
    isAdmin: reply.isAdmin === 1,
  }));

  const replyMap = new Map<number, typeof normalizedReplies>();
  for (const reply of normalizedReplies) {
    const parentId = reply.parentId ?? 0;
    if (!replyMap.has(parentId)) {
      replyMap.set(parentId, []);
    }
    replyMap.get(parentId)?.push(reply);
  }

  const normalizedItems = items.map((item) => ({
    ...item,
    isAdmin: item.isAdmin === 1,
  }));

  const itemsWithReplies = normalizedItems.map((item) => ({
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
    captchaVerifyParam?: unknown;
    cookieConsent?: unknown;
  };

  const rawPostId =
    typeof data?.postId === "number"
      ? data.postId
      : typeof data?.postId === "string"
        ? Number(data.postId)
        : NaN;
  const postId =
    Number.isInteger(rawPostId) && rawPostId > 0 ? rawPostId : null;

  const honeypot = typeof data?.website === "string" ? data.website.trim() : "";
  if (honeypot) {
    return Response.json(
      { ok: false, error: "检测到异常提交" },
      { status: 400 },
    );
  }

  const rawContent = typeof data?.content === "string" ? data.content : "";
  const content = normalizeCommentContent(rawContent);
  const captchaVerifyParam =
    typeof data?.captchaVerifyParam === "string" &&
    data.captchaVerifyParam.length > 0
      ? data.captchaVerifyParam
      : null;
  const cookieConsent =
    data?.cookieConsent === "accepted"
      ? "accepted"
      : data?.cookieConsent === "declined"
        ? "declined"
        : "unknown";

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
  const captchaEnabled = await isCommentCaptchaEnabled();
  const counts =
    !RATE_LIMIT_DISABLED || captchaEnabled
      ? await getCommentCounts(ipHash)
      : null;
  let captchaVerified = false;
  let isVerified = false;
  let deviceCookieToSet: string | null = null;
  let deviceCookieToClear: string | null = null;

  const applyDeviceCookie = (response: Response) => {
    if (deviceCookieToSet) {
      response.headers.append("Set-Cookie", deviceCookieToSet);
    }
    if (deviceCookieToClear) {
      response.headers.append("Set-Cookie", deviceCookieToClear);
    }
    return response;
  };

  if (captchaEnabled) {
    const cookieStore = await cookies();
    const cookieValue =
      cookieStore.get(COMMENT_DEVICE_COOKIE_NAME)?.value ?? null;
    const storedDeviceId = parseCommentDeviceToken(cookieValue);
    let deviceId = CAPTCHA_IP_ONLY_DEVICE;

    if (cookieConsent === "declined") {
      if (cookieValue) {
        deviceCookieToClear = buildCommentDeviceClearCookie();
      }
    } else if (storedDeviceId) {
      deviceId = storedDeviceId;
    } else if (cookieConsent === "accepted") {
      const generated = createCommentDeviceId();
      const token = signCommentDeviceId(generated);
      if (token) {
        deviceId = generated;
        deviceCookieToSet = buildCommentDeviceCookie(token);
      }
    }

    const [captchaState] = await db
      .select({
        id: commentCaptchaStates.id,
        triggerCount: commentCaptchaStates.triggerCount,
        verifiedUntil: commentCaptchaStates.verifiedUntil,
        blockedUntil: commentCaptchaStates.blockedUntil,
      })
      .from(commentCaptchaStates)
      .where(
        and(
          eq(commentCaptchaStates.ipHash, ipHash),
          eq(commentCaptchaStates.deviceId, deviceId),
        ),
      )
      .limit(1);

    const now = new Date();
    if (captchaState?.blockedUntil && captchaState.blockedUntil > now) {
      return applyDeviceCookie(
        Response.json(
          {
            ok: false,
            error: "请稍后再试",
            code: "captcha_blocked",
          },
          { status: 429 },
        ),
      );
    }

    isVerified =
      !!captchaState?.verifiedUntil && captchaState.verifiedUntil > now;

    const highRisk = counts ? isCaptchaRisk(counts) : false;
    const hasFailures = (captchaState?.triggerCount ?? 0) > 0;
    const shouldRequireCaptcha = !isVerified && (highRisk || hasFailures);

    if (shouldRequireCaptcha && !captchaVerifyParam) {
      return applyDeviceCookie(
        Response.json(
          { ok: false, error: "需要验证码", code: "captcha_required" },
          { status: 403 },
        ),
      );
    }

    if (!isVerified && captchaVerifyParam) {
      try {
        captchaVerified = await verifyAliyunCaptcha(captchaVerifyParam);
      } catch {
        return applyDeviceCookie(
          Response.json(
            {
              ok: false,
              error: "验证码服务暂不可用",
              code: "captcha_unavailable",
              captchaVerified: false,
            },
            { status: 503 },
          ),
        );
      }

      if (!captchaVerified) {
        const nextCount = (captchaState?.triggerCount ?? 0) + 1;
        const blockedUntil = resolveCaptchaBlockedUntil(nextCount, now);

        if (captchaState?.id) {
          await db
            .update(commentCaptchaStates)
            .set({
              triggerCount: nextCount,
              blockedUntil,
            })
            .where(eq(commentCaptchaStates.id, captchaState.id));
        } else {
          await db
            .insert(commentCaptchaStates)
            .values({
              ipHash,
              deviceId,
              triggerCount: nextCount,
              blockedUntil,
            })
            .onDuplicateKeyUpdate({
              set: {
                triggerCount: nextCount,
                blockedUntil,
              },
            });
        }

        const code = blockedUntil ? "captcha_blocked" : "captcha_invalid";
        const error = blockedUntil ? "请稍后再试" : "验证码未通过";
        const status = blockedUntil ? 429 : 403;
        return applyDeviceCookie(
          Response.json(
            { ok: false, error, code, captchaVerified: false },
            { status },
          ),
        );
      }

      if (captchaState?.id) {
        await db
          .update(commentCaptchaStates)
          .set({
            triggerCount: 0,
            verifiedUntil: new Date(now.getTime() + CAPTCHA_VERIFY_TTL_MS),
            blockedUntil: null,
          })
          .where(eq(commentCaptchaStates.id, captchaState.id));
      } else {
        const verifiedUntil = new Date(now.getTime() + CAPTCHA_VERIFY_TTL_MS);
        await db
          .insert(commentCaptchaStates)
          .values({
            ipHash,
            deviceId,
            triggerCount: 0,
            verifiedUntil,
            blockedUntil: null,
          })
          .onDuplicateKeyUpdate({
            set: {
              triggerCount: 0,
              verifiedUntil,
              blockedUntil: null,
            },
          });
      }
    }
  }

  if (!RATE_LIMIT_DISABLED && counts && isRateLimited(counts)) {
    return applyDeviceCookie(
      Response.json(
        {
          ok: false,
          error: "请求过于频繁",
          code: "rate_limited",
          captchaVerified: captchaEnabled
            ? isVerified || captchaVerified || undefined
            : undefined,
        },
        { status: 429 },
      ),
    );
  }

  const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 255);

  const insertResult = await db.insert(comments).values({
    postId,
    parentId: null,
    content,
    ipHash,
    userAgent,
  });

  let insertedId = Number(
    (insertResult as { insertId?: number | bigint }).insertId ?? 0,
  );
  let item = {
    id: insertedId,
    content,
    createdAt: new Date().toISOString(),
    isAdmin: false,
    replies: [],
  };

  const hydrateItem = (fresh: {
    id: number;
    content: string;
    createdAt: Date;
  }) => ({
    ...fresh,
    createdAt: fresh.createdAt.toISOString(),
    isAdmin: false,
    replies: [],
  });

  const [freshById] = insertedId
    ? await db
        .select({
          id: comments.id,
          content: comments.content,
          createdAt: comments.createdAt,
        })
        .from(comments)
        .where(eq(comments.id, insertedId))
        .limit(1)
    : [];

  if (freshById) {
    item = hydrateItem(freshById);
  } else if (!insertedId) {
    // Fallback for drivers that don't expose insertId consistently.
    const [fallback] = await db
      .select({
        id: comments.id,
        content: comments.content,
        createdAt: comments.createdAt,
      })
      .from(comments)
      .where(
        and(
          eq(comments.postId, postId),
          eq(comments.ipHash, ipHash),
          eq(comments.content, content),
          gte(comments.createdAt, new Date(Date.now() - 2 * 60 * 1000)),
        ),
      )
      .orderBy(desc(comments.id))
      .limit(1);
    if (fallback) {
      insertedId = fallback.id;
      item = hydrateItem(fallback);
    }
  }

  return applyDeviceCookie(Response.json({ ok: true, item }));
}
