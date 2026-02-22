import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { friendLinks } from "@/db/schema";
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
    url?: unknown;
    iconUrl?: unknown;
    sortOrder?: unknown;
    isActive?: unknown;
  };

  const hasName = Object.prototype.hasOwnProperty.call(data ?? {}, "name");
  const nameRaw = data?.name;
  const name = typeof nameRaw === "string" ? nameRaw.trim() : "";
  if (hasName && !name) {
    return NextResponse.json(
      { ok: false, error: "name is required" },
      { status: 400 },
    );
  }

  const hasUrl = Object.prototype.hasOwnProperty.call(data ?? {}, "url");
  const urlRaw = data?.url;
  const url = typeof urlRaw === "string" ? urlRaw.trim() : "";
  if (hasUrl && !url) {
    return NextResponse.json(
      { ok: false, error: "url is required" },
      { status: 400 },
    );
  }

  const hasIconUrl = Object.prototype.hasOwnProperty.call(
    data ?? {},
    "iconUrl",
  );
  const iconUrlRaw = data?.iconUrl;
  const iconUrl = typeof iconUrlRaw === "string" ? iconUrlRaw.trim() : "";

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
    .update(friendLinks)
    .set({
      ...(hasName ? { name } : {}),
      ...(hasUrl ? { url } : {}),
      ...(hasIconUrl ? { iconUrl } : {}),
      ...(sortOrder === null ? {} : { sortOrder }),
      ...(isActive === null ? {} : { isActive: isActive ? 1 : 0 }),
    })
    .where(eq(friendLinks.id, id));

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

  await db.delete(friendLinks).where(eq(friendLinks.id, id));

  return NextResponse.json({ ok: true });
}
