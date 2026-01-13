import { asc, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { products } from "@/db/schema";
import { getAdminSession } from "@/lib/admin-auth";

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
    .from(products)
    .orderBy(asc(products.sortOrder), desc(products.id));

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
    description?: unknown;
    logoUrl?: unknown;
    linkUrl?: unknown;
    sortOrder?: unknown;
    isActive?: unknown;
  };

  const name = typeof data?.name === "string" ? data.name.trim() : "";
  const description =
    typeof data?.description === "string" ? data.description.trim() : "";
  const logoUrl = typeof data?.logoUrl === "string" ? data.logoUrl.trim() : "";
  const linkUrl = typeof data?.linkUrl === "string" ? data.linkUrl.trim() : "";
  const sortOrder =
    typeof data?.sortOrder === "number"
      ? data.sortOrder
      : Number(data?.sortOrder ?? 0) || 0;
  const isActive =
    typeof data?.isActive === "boolean"
      ? data.isActive
      : Boolean(data?.isActive ?? true);

  if (!name) {
    return NextResponse.json(
      { ok: false, error: "name is required" },
      { status: 400 },
    );
  }

  await db.insert(products).values({
    name,
    description,
    logoUrl,
    linkUrl,
    sortOrder,
    isActive: isActive ? 1 : 0,
  });

  return NextResponse.json({ ok: true });
}
