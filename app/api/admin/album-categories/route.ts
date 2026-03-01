import { asc, desc, eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { albumCategories } from "@/db/schema";
import { getAdminSession } from "@/lib/admin-auth";
import { toAlbumCategorySlug } from "@/utils/album-category";

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
    .from(albumCategories)
    .orderBy(asc(albumCategories.sortOrder), desc(albumCategories.id));

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
  const slug = toAlbumCategorySlug(slugInput || name);
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
    .select({ id: albumCategories.id })
    .from(albumCategories)
    .where(or(eq(albumCategories.name, name), eq(albumCategories.slug, slug)))
    .limit(1);
  if (existing) {
    return NextResponse.json(
      { ok: false, error: "category name or slug already exists" },
      { status: 409 },
    );
  }

  await db.insert(albumCategories).values({
    name,
    slug,
    sortOrder,
    isActive: isActive ? 1 : 0,
  });

  return NextResponse.json({ ok: true });
}
