import { asc, desc, eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { postCategories } from "@/db/schema";
import { getAdminSession } from "@/lib/admin-auth";
import { toPostCategorySlug } from "@/utils/post-category";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const items = await db
    .select()
    .from(postCategories)
    .orderBy(asc(postCategories.sortOrder), desc(postCategories.id));

  return NextResponse.json({ ok: true, items });
}

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

  const data = payload as {
    name?: unknown;
    slug?: unknown;
    sortOrder?: unknown;
    isActive?: unknown;
  };

  const name = typeof data?.name === "string" ? data.name.trim() : "";
  const slugInput = typeof data?.slug === "string" ? data.slug.trim() : "";
  const slug = toPostCategorySlug(slugInput || name);
  const sortOrder =
    typeof data?.sortOrder === "number"
      ? data.sortOrder
      : Number(data?.sortOrder ?? 0) || 0;
  const isActive =
    typeof data?.isActive === "boolean"
      ? data.isActive
      : Boolean(data?.isActive ?? true);

  if (!name || !slug) {
    return NextResponse.json(
      { ok: false, error: "name and slug are required" },
      { status: 400 },
    );
  }

  const [existing] = await db
    .select({ id: postCategories.id })
    .from(postCategories)
    .where(or(eq(postCategories.name, name), eq(postCategories.slug, slug)))
    .limit(1);
  if (existing) {
    return NextResponse.json(
      { ok: false, error: "category name or slug already exists" },
      { status: 409 },
    );
  }

  await db.insert(postCategories).values({
    name,
    slug,
    sortOrder,
    isActive: isActive ? 1 : 0,
  });

  return NextResponse.json({ ok: true });
}
