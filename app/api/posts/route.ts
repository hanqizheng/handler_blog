import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { postCategories, posts } from "@/db/schema";
import { getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET() {
  const items = await db.select().from(posts).orderBy(desc(posts.id));
  return Response.json({ ok: true, items });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let payload: unknown = null;

  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const data = payload as {
    title?: unknown;
    content?: unknown;
    assetFolder?: unknown;
    coverImageUrl?: unknown;
    categoryId?: unknown;
  };
  const title = typeof data?.title === "string" ? data.title.trim() : "";
  const content = typeof data?.content === "string" ? data.content.trim() : "";
  const assetFolder =
    typeof data?.assetFolder === "string" ? data.assetFolder.trim() : "";
  const coverImageUrl =
    typeof data?.coverImageUrl === "string" ? data.coverImageUrl.trim() : "";
  const categoryId =
    typeof data?.categoryId === "number"
      ? data.categoryId
      : Number(data?.categoryId ?? 0);

  if (
    !title ||
    !content ||
    !Number.isInteger(categoryId) ||
    Number(categoryId) <= 0
  ) {
    return Response.json(
      { ok: false, error: "title, content and categoryId are required" },
      { status: 400 },
    );
  }

  const [category] = await db
    .select({ id: postCategories.id })
    .from(postCategories)
    .where(eq(postCategories.id, categoryId))
    .limit(1);
  if (!category) {
    return Response.json(
      { ok: false, error: "category not found" },
      { status: 400 },
    );
  }

  const resolvedAssetFolder = assetFolder || `${Date.now()}`;

  await db.insert(posts).values({
    title,
    content,
    assetFolder: resolvedAssetFolder,
    coverImageUrl,
    categoryId,
  });

  return Response.json({ ok: true });
}
