import { asc, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { friendLinks } from "@/db/schema";
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
    .from(friendLinks)
    .orderBy(asc(friendLinks.sortOrder), desc(friendLinks.id));

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
    url?: unknown;
    iconUrl?: unknown;
    sortOrder?: unknown;
    isActive?: unknown;
  };

  const name = typeof data?.name === "string" ? data.name.trim() : "";
  const url = typeof data?.url === "string" ? data.url.trim() : "";
  const iconUrl = typeof data?.iconUrl === "string" ? data.iconUrl.trim() : "";
  const sortOrder =
    typeof data?.sortOrder === "number"
      ? data.sortOrder
      : Number(data?.sortOrder ?? 0) || 0;
  const isActive =
    typeof data?.isActive === "boolean"
      ? data.isActive
      : Boolean(data?.isActive ?? true);

  if (!name || !url) {
    return NextResponse.json(
      { ok: false, error: "name and url are required" },
      { status: 400 },
    );
  }

  await db.insert(friendLinks).values({
    name,
    url,
    iconUrl,
    sortOrder,
    isActive: isActive ? 1 : 0,
  });

  return NextResponse.json({ ok: true });
}
