import { eq, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { postCategories, posts } from "@/db/schema";
import { getAdminSession } from "@/lib/admin-auth";
import { toPostCategorySlug } from "@/utils/post-category";

export const runtime = "nodejs";

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
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (!id) {
    return NextResponse.json(
      { ok: false, error: "invalid id" },
      { status: 400 },
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

  const hasName = Object.prototype.hasOwnProperty.call(data ?? {}, "name");
  const hasSlug = Object.prototype.hasOwnProperty.call(data ?? {}, "slug");
  const hasSortOrder = Object.prototype.hasOwnProperty.call(
    data ?? {},
    "sortOrder",
  );
  const hasIsActive = Object.prototype.hasOwnProperty.call(
    data ?? {},
    "isActive",
  );

  const name = typeof data?.name === "string" ? data.name.trim() : "";
  const slugInput = typeof data?.slug === "string" ? data.slug.trim() : "";
  const slug = toPostCategorySlug(slugInput);
  const sortOrder =
    typeof data?.sortOrder === "number"
      ? data.sortOrder
      : Number.isFinite(Number(data?.sortOrder))
        ? Number(data?.sortOrder)
        : null;
  const isActive =
    typeof data?.isActive === "boolean"
      ? data.isActive
      : data?.isActive === undefined
        ? null
        : Boolean(data?.isActive);

  if (hasName && !name) {
    return NextResponse.json(
      { ok: false, error: "name is required" },
      { status: 400 },
    );
  }

  if (hasSlug && !slug) {
    return NextResponse.json(
      { ok: false, error: "slug is required" },
      { status: 400 },
    );
  }

  const duplicateFilters = [
    ...(hasName && name ? [eq(postCategories.name, name)] : []),
    ...(hasSlug && slug ? [eq(postCategories.slug, slug)] : []),
  ];
  if (duplicateFilters.length > 0) {
    const existingItems = await db
      .select({
        id: postCategories.id,
        name: postCategories.name,
        slug: postCategories.slug,
      })
      .from(postCategories)
      .where(
        duplicateFilters.length === 1
          ? duplicateFilters[0]
          : or(...duplicateFilters),
      )
      .limit(5);

    if (existingItems.some((item) => item.id !== id)) {
      return NextResponse.json(
        { ok: false, error: "category name or slug already exists" },
        { status: 409 },
      );
    }
  }

  const updateData = {
    ...(hasName ? { name } : {}),
    ...(hasSlug ? { slug } : {}),
    ...(hasSortOrder && sortOrder !== null ? { sortOrder } : {}),
    ...(hasIsActive && isActive !== null ? { isActive: isActive ? 1 : 0 } : {}),
  };
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { ok: false, error: "no fields to update" },
      { status: 400 },
    );
  }

  await db
    .update(postCategories)
    .set(updateData)
    .where(eq(postCategories.id, id));

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (!id) {
    return NextResponse.json(
      { ok: false, error: "invalid id" },
      { status: 400 },
    );
  }

  const [usage] = await db
    .select({ count: sql<number>`count(*)` })
    .from(posts)
    .where(eq(posts.categoryId, id));
  if ((usage?.count ?? 0) > 0) {
    return NextResponse.json(
      { ok: false, error: "category is used by posts" },
      { status: 400 },
    );
  }

  await db.delete(postCategories).where(eq(postCategories.id, id));
  return NextResponse.json({ ok: true });
}
