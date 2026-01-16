import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { products } from "@/db/schema";
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
    description?: unknown;
    logoUrl?: unknown;
    linkUrl?: unknown;
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

  const hasDescription = Object.prototype.hasOwnProperty.call(
    data ?? {},
    "description",
  );
  const descriptionRaw = data?.description;
  const description =
    typeof descriptionRaw === "string" ? descriptionRaw.trim() : "";

  const hasLogoUrl = Object.prototype.hasOwnProperty.call(
    data ?? {},
    "logoUrl",
  );
  const logoUrlRaw = data?.logoUrl;
  const logoUrl = typeof logoUrlRaw === "string" ? logoUrlRaw.trim() : "";

  const hasLinkUrl = Object.prototype.hasOwnProperty.call(
    data ?? {},
    "linkUrl",
  );
  const linkUrlRaw = data?.linkUrl;
  const linkUrl = typeof linkUrlRaw === "string" ? linkUrlRaw.trim() : "";

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
    .update(products)
    .set({
      ...(hasName ? { name } : {}),
      ...(hasDescription ? { description } : {}),
      ...(hasLogoUrl ? { logoUrl } : {}),
      ...(hasLinkUrl ? { linkUrl } : {}),
      ...(sortOrder === null ? {} : { sortOrder }),
      ...(isActive === null ? {} : { isActive: isActive ? 1 : 0 }),
    })
    .where(eq(products.id, id));

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

  await db.delete(products).where(eq(products.id, id));

  return NextResponse.json({ ok: true });
}
