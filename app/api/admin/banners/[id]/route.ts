import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { banners } from "@/db/schema";
import { getAdminSession } from "@/lib/admin-auth";

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
    return NextResponse.json({ ok: false, error: "invalid id" }, { status: 400 });
  }

  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const data = payload as {
    linkUrl?: unknown;
    mainTitle?: unknown;
    subTitle?: unknown;
    sortOrder?: unknown;
    isActive?: unknown;
  };

  const linkUrlRaw = data?.linkUrl;
  const linkUrl =
    typeof linkUrlRaw === "string" ? linkUrlRaw.trim() : undefined;
  const mainTitle =
    typeof data?.mainTitle === "string" ? data.mainTitle.trim() : undefined;
  const subTitle =
    typeof data?.subTitle === "string" ? data.subTitle.trim() : undefined;
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

  await db
    .update(banners)
    .set({
      ...(linkUrl !== undefined ? { linkUrl } : {}),
      ...(mainTitle !== undefined ? { mainTitle } : {}),
      ...(subTitle !== undefined ? { subTitle } : {}),
      ...(sortOrder === null ? {} : { sortOrder }),
      ...(isActive === null ? {} : { isActive: isActive ? 1 : 0 }),
    })
    .where(eq(banners.id, id));

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
    return NextResponse.json({ ok: false, error: "invalid id" }, { status: 400 });
  }

  await db.delete(banners).where(eq(banners.id, id));

  return NextResponse.json({ ok: true });
}
